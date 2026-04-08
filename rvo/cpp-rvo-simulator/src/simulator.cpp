#include "simulator.h"

#include <fstream>
#include <iostream>
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <filesystem>
#include <numeric>
#include <sstream>
#include <string>
#include <vector>

#include "json.hpp"

namespace {
    using json = nlohmann::json;
    constexpr double kTimeStep = 0.25;          // 与旧逻辑一致的离散步长
    constexpr double kAgentRadius = 0.4;        // 简易碰撞半径
    constexpr double kNeighborRadius = 1.5;     // 分离作用半径
    constexpr double kSeparationStrength = 1.0; // 分离系数
    constexpr double kEpsilon = 1e-6;

    int nextFloorTowardF1(int floorId) {
        if (floorId > 0) {
            return floorId - 1;
        }
        if (floorId < 0) {
            return floorId + 1;
        }
        return 0;
    }

    void parseExitKeyName(const std::string& name, int& outFloorKey, int& outAssemblyNum, std::string& outTeleport) {
        outFloorKey = 0;
        outAssemblyNum = 0;
        outTeleport.clear();
        if (name.empty()) {
            return;
        }
        std::vector<std::string> parts;
        std::stringstream ss(name);
        std::string item;
        while (std::getline(ss, item, '-')) {
            parts.push_back(item);
        }
        if (parts.size() >= 2) {
            outFloorKey = std::atoi(parts[0].c_str());
            outAssemblyNum = std::atoi(parts[1].c_str());
            if (parts.size() >= 3) {
                outTeleport = parts[2];
            }
        } else {
            outAssemblyNum = std::atoi(name.c_str());
        }
    }
} // namespace

namespace rvocpp {

RVOSimulator::RVOSimulator() 
    : currentStep_(0), maxSteps_(6000), goalThreshold_(1.0f) {
}

RVOSimulator::~RVOSimulator() = default;

bool RVOSimulator::loadFromJSON(const std::string& jsonPath) {
    std::ifstream file(jsonPath);
    if (!file.is_open()) {
        std::cerr << "Cannot open JSON file: " << jsonPath << std::endl;
        return false;
    }

    json data;
    try {
        file >> data;
    } catch (const std::exception& ex) {
        std::cerr << "Failed to parse JSON: " << ex.what() << std::endl;
        return false;
    }

    if (!loadFromJsonData(data)) {
        return false;
    }

    if (config_.outputDir.empty()) {
        std::filesystem::path jsonDir = std::filesystem::path(jsonPath).parent_path();
        config_.outputDir = jsonDir.string();
    }

    return true;
}

bool RVOSimulator::loadFromJSONContent(const std::string& jsonContent) {
    json data;
    try {
        data = json::parse(jsonContent);
    } catch (const std::exception& ex) {
        std::cerr << "Failed to parse JSON content: " << ex.what() << std::endl;
        return false;
    }
    return loadFromJsonData(data);
}

bool RVOSimulator::loadFromJsonData(const json& data) {
    config_.bID = data.value("bID", 0);
    config_.scale = data.value("scale", 1.0);
    config_.status = data.value("status", 1);
    config_.weight = data.value("weight", 1);
    config_.k = data.value("k", 1.0);
    config_.fileName = data.value("fileName", std::string("output"));
    config_.imgX0 = data.value("imgX0", 0.0);
    config_.imgY0 = data.value("imgY0", 0.0);
    config_.sT = data.value("sT", 0.0);
    if (data.contains("outputDir") && data["outputDir"].is_string()) {
        config_.outputDir = data["outputDir"].get<std::string>();
    }

    agents_.clear();
    if (data.contains("agents") && data["agents"].is_array()) {
        for (const auto& agentNode : data["agents"]) {
            Agent agent{};
            agent.id = agentNode.value("id", 0);
            agent.x = agentNode.value("x", 0.0);
            agent.y = agentNode.value("y", 0.0);
            agent.velocity = agentNode.value("velocity", 1.0);
            agent.startTime = agentNode.value("startTime", 0.0);
            agent.exitId = agentNode.value("exitId", 0);
            agent.floorId = agentNode.value("floorId", 0);
            agent.targetFloorId = agentNode.value("targetFloorId", agent.floorId);
            agent.connectorId = agentNode.value("connectorId", -1);
            agent.connectorState = agentNode.value("connectorState", 0);
            agent.transferRemainingTime = agentNode.value("transferRemainingTime", 0.0);
            agent.graphNodeIndex = agentNode.value("graphNodeIndex", -1);
            if (agentNode.contains("roomIds") && agentNode["roomIds"].is_array()) {
                for (const auto& roomId : agentNode["roomIds"]) {
                    agent.roomIds.push_back(roomId.get<int>());
                }
            }
            if (agentNode.contains("waypointXs") && agentNode["waypointXs"].is_array()) {
                for (const auto& wx : agentNode["waypointXs"]) {
                    agent.waypointXs.push_back(wx.get<double>());
                }
            }
            if (agentNode.contains("waypointYs") && agentNode["waypointYs"].is_array()) {
                for (const auto& wy : agentNode["waypointYs"]) {
                    agent.waypointYs.push_back(wy.get<double>());
                }
            }
            agent.waypointCursor = 0;
            agents_.push_back(agent);
        }
    }

    obstacles_.clear();
    if (data.contains("obstacles") && data["obstacles"].is_array()) {
        for (const auto& obstacleNode : data["obstacles"]) {
            Obstacle obstacle{};
            obstacle.id = obstacleNode.value("id", 0);
            obstacle.x1 = obstacleNode.value("x1", 0.0);
            obstacle.y1 = obstacleNode.value("y1", 0.0);
            obstacle.x2 = obstacleNode.value("x2", 0.0);
            obstacle.y2 = obstacleNode.value("y2", 0.0);
            obstacle.floorId = obstacleNode.value("floorId", 0);
            obstacles_.push_back(obstacle);
        }
    }

    exits_.clear();
    if (data.contains("exits") && data["exits"].is_array()) {
        for (const auto& exitNode : data["exits"]) {
            Exit exit{};
            exit.id = exitNode.value("id", 0L);
            exit.x0 = exitNode.value("x0", 0.0);
            exit.y0 = exitNode.value("y0", 0.0);
            exit.x1 = exitNode.value("x1", 0.0);
            exit.y1 = exitNode.value("y1", 0.0);
            exit.floorId = exitNode.value("floorId", 0);
            exit.capacity = exitNode.value("capacity", 0);
            exit.name = exitNode.value("name", std::string("exit"));
            exits_.push_back(exit);
        }
    }

    navPoints_.clear();
    if (data.contains("navPoints") && data["navPoints"].is_array()) {
        for (const auto& navNode : data["navPoints"]) {
            NavPoint nav{};
            nav.x = navNode.value("x", 0.0);
            nav.y = navNode.value("y", 0.0);
            nav.state = navNode.value("state", 0);
            nav.floorId = navNode.value("floorId", 0);
            nav.kind = navNode.value("kind", 0);
            nav.connectorId = navNode.value("connectorId", -1);
            nav.toFloorId = navNode.value("toFloorId", nav.floorId);
            if (navNode.contains("roomIds") && navNode["roomIds"].is_array()) {
                for (const auto& roomId : navNode["roomIds"]) {
                    nav.roomIds.push_back(roomId.get<int>());
                }
            }
            navPoints_.push_back(nav);
        }
    }

    rooms_.clear();
    if (data.contains("rooms") && data["rooms"].is_array()) {
        for (const auto& roomNode : data["rooms"]) {
            RoomC room;
            room.rid = roomNode.value("rid", 0);
            room.floorId = roomNode.value("floorId", 0);
            room.peopleCount = 0;
            if (roomNode.contains("peos") && roomNode["peos"].is_array()) {
                room.peopleCount = static_cast<int>(roomNode["peos"].size());
            }
            if (roomNode.contains("walls") && roomNode["walls"].is_array()) {
                for (const auto& wallNode : roomNode["walls"]) {
                    double x = wallNode.value("x", kMinCoordinate - 1.0);
                    double y = wallNode.value("y", kMinCoordinate - 1.0);
                    if (x > kMinCoordinate) {
                        room.walls.push_back({x, y});
                    }
                }
            }
            rooms_.push_back(std::move(room));
        }
    }

    peopleGroups_.clear();
    if (data.contains("peos") && data["peos"].is_array()) {
        for (const auto& groupNode : data["peos"]) {
            PeopleGroupC group;
            if (groupNode.contains("attr") && groupNode["attr"].is_object()) {
                group.id = groupNode["attr"].value("id", 0);
            } else {
                group.id = groupNode.value("id", 0);
            }
            group.floorId = groupNode.value("floorId", 0);
            group.peopleCount = 0;
            if (groupNode.contains("peos") && groupNode["peos"].is_array()) {
                group.peopleCount = static_cast<int>(groupNode["peos"].size());
            }
            if (groupNode.contains("walls") && groupNode["walls"].is_array()) {
                for (const auto& wallNode : groupNode["walls"]) {
                    double x = wallNode.value("x", kMinCoordinate - 1.0);
                    double y = wallNode.value("y", kMinCoordinate - 1.0);
                    if (x > kMinCoordinate) {
                        group.walls.push_back({x, y});
                    }
                }
            }
            peopleGroups_.push_back(std::move(group));
        }
    }

    connectors_.clear();
    if (data.contains("connectors") && data["connectors"].is_array()) {
        for (const auto& connNode : data["connectors"]) {
            Connector connector;
            connector.id = connNode.value("id", 0);
            connector.type = connNode.value("type", 0);
            connector.fromFloor = connNode.value("fromFloor", 0);
            connector.toFloor = connNode.value("toFloor", 0);
            connector.entryX = connNode.value("entryX", connNode.value("x", 0.0));
            connector.entryY = connNode.value("entryY", connNode.value("y", 0.0));
            connector.exitX = connNode.value("exitX", connector.entryX);
            connector.exitY = connNode.value("exitY", connector.entryY);
            connector.capacity = std::max(connNode.value("capacity", 1), 1);
            connector.serviceTime = std::max(connNode.value("serviceTime", 0.0), 0.0);
            connectors_.push_back(connector);
        }
    }

    frames_.clear();
    completedEvents_.clear();
    activeAgents_.clear();
    waitingList_.clear();
    agentGoals_.clear();
    agentCompleted_.clear();
    isActive_.clear();

    return rebuildNavigationState();
}

bool RVOSimulator::loadFromData(const SimulationConfig& config,
                                std::vector<Agent> agents,
                                std::vector<Obstacle> obstacles,
                                std::vector<Exit> exits,
                                std::vector<NavPoint> navPoints,
                                std::vector<Connector> connectors,
                                std::vector<RoomC> rooms,
                                std::vector<PeopleGroupC> peopleGroups) {
    config_ = config;
    agents_ = std::move(agents);
    obstacles_ = std::move(obstacles);
    exits_ = std::move(exits);
    navPoints_ = std::move(navPoints);
    connectors_ = std::move(connectors);
    rooms_ = std::move(rooms);
    peopleGroups_ = std::move(peopleGroups);

    return rebuildNavigationState();
}

void RVOSimulator::setOutputDir(const std::string& outputDir) {
    config_.outputDir = outputDir;
}

bool RVOSimulator::rebuildNavigationState() {
    try {
        std::vector<NavPointC> navPointsC;
        navPointsC.reserve(navPoints_.size());
        for (const auto& p : navPoints_) {
            NavPointC np;
            np.x = p.x;
            np.y = p.y;
            np.state = p.state;
            np.floorId = p.floorId;
            np.roomIds = p.roomIds;
            navPointsC.push_back(std::move(np));
        }

        std::vector<ObstacleC> obstaclesC;
        obstaclesC.reserve(obstacles_.size());
        for (const auto& o : obstacles_) {
            ObstacleC ob;
            ob.x1 = o.x1;
            ob.y1 = o.y1;
            ob.x2 = o.x2;
            ob.y2 = o.y2;
            ob.floorId = o.floorId;
            obstaclesC.push_back(ob);
        }

        std::vector<ExitC> exitsC;
        exitsC.reserve(exits_.size());
        for (const auto& e : exits_) {
            ExitC ex;
            ex.cx = (e.x0 + e.x1) * 0.5;
            ex.cy = (e.y0 + e.y1) * 0.5;
            ex.id = static_cast<int>(e.id);
            ex.floorId = e.floorId;
            ex.name = e.name;  // Copy exitKey for teleportation parsing
            exitsC.push_back(ex);
        }

        navGrid_ = std::make_unique<NavGrid>(navPointsC, obstaclesC, exitsC, rooms_, peopleGroups_);
        navLines_ = navGrid_->generateLines();
        for (auto& connector : connectors_) {
            connector.occupancy = 0;
        }

        frames_.clear();
        completedEvents_.clear();
        activeAgents_.clear();

        waitingList_.clear();
        waitingList_.reserve(agents_.size());
        for (int i = 0; i < static_cast<int>(agents_.size()); ++i) {
            waitingList_.push_back(i);
        }
        std::sort(waitingList_.begin(), waitingList_.end(), [&](int a, int b) {
            return agents_[a].startTime < agents_[b].startTime;
        });
        waitingCursor_ = 0;

        agentGoals_.assign(agents_.size(), {0.0, 0.0});
        for (int i = 0; i < static_cast<int>(agents_.size()); ++i) {
            agentGoals_[i] = getExitCenter(agents_[i].exitId);
        }

        agentCompleted_.assign(agents_.size(), false);
        isActive_.assign(agents_.size(), 0);

        currentStep_ = 0;

        return true;
    } catch (...) {
        return false;
    }
}

bool RVOSimulator::run() {
    initializeSimulator();

    while (currentStep_ < maxSteps_) {
        // 1. 按 startTime 将 agent 加入模拟
        while (waitingCursor_ < waitingList_.size()) {
            int agentIndex = waitingList_[waitingCursor_];
            if (agents_[agentIndex].startTime * 100.0 <= currentStep_) {
                addAgentToSimulator(agentIndex);
                ++waitingCursor_;
            } else {
                break;
            }
        }

        // 2. 记录当前帧位置（采样：每 2 个仿真步记录一次，保持时间步长不变但将帧率从 4 降到 2）
        if ((currentStep_ % 2) == 0) {
            FrameData frame;
            frame.step = currentStep_;
            frame.positions.reserve(activeAgents_.size());
            for (const auto& active : activeAgents_) {
                int agentIndex = active.agentIndex;
                if (agentIndex >= 0 && agentIndex < static_cast<int>(agents_.size())) {
                    const auto& agent = agents_[agentIndex];
                    FrameData::PositionSnapshot snapshot{};
                    snapshot.id = agent.id;
                    snapshot.x = active.x;
                    snapshot.y = active.y;
                    snapshot.floorId = agent.floorId;
                    snapshot.connectorState = agent.connectorState;
                    snapshot.connectorId = agent.connectorId;
                    frame.positions.push_back(snapshot);
                }
            }
            frames_.push_back(std::move(frame));
        }

        // 3. 更新完成状态
        updateCompletedAgents();
        if (reachedGoal()) {
            break;
        }

        // 4. 推进一步
        stepAgents();

        // 5. 再次检查完成
        updateCompletedAgents();
        if (reachedGoal()) {
            break;
        }

        if (currentStep_ % 10 == 0) {
            updateProgress(config_.bID);
        }

        ++currentStep_;
    }

    return true;
}

bool RVOSimulator::saveResults() {
    namespace fs = std::filesystem;
    if (config_.outputDir.empty()) {
        std::cerr << "Output directory is not set." << std::endl;
        return false;
    }

    fs::path outputPath(config_.outputDir);
    std::error_code ec;
    fs::create_directories(outputPath, ec);
    if (ec) {
        std::cerr << "Failed to create output directory: " << ec.message() << std::endl;
        return false;
    }

    fs::path resultPath = outputPath / "result.rvo";
    std::ofstream resultFile(resultPath);
    if (!resultFile.is_open()) {
        std::cerr << "Cannot open result file: " << resultPath << std::endl;
        return false;
    }

    resultFile << std::fixed << std::setprecision(2);

    int frameIndex = 0;
    for (const auto& frame : frames_) {
        resultFile << frameIndex << " " << frame.positions.size();
        for (const auto& pos : frame.positions) {
            resultFile << " " << pos.id << " "
                      << pos.x << " " << pos.y;
        }
        resultFile << std::endl;
        ++frameIndex;
    }

    resultFile.close();

    if (!writeRawSimulationJson(config_.outputDir)) {
        std::cerr << "Failed to write simulation_raw.json" << std::endl;
    }

    return true;
}

bool RVOSimulator::reachedGoal() {
    if (!waitingList_.empty()) {
        return false;
    }
    return std::all_of(agentCompleted_.begin(), agentCompleted_.end(), [](bool completed) {
        return completed;
    });
}

void RVOSimulator::updateProgress(int bID) {
    try {
        namespace fs = std::filesystem;
        fs::path progressPath = fs::path(config_.outputDir) / "progress.txt";
        std::ofstream progressFile(progressPath);
        if (progressFile.is_open()) {
            double completion = (maxSteps_ == 0) ? 0.0 : (static_cast<double>(currentStep_) / maxSteps_) * 100.0;
            progressFile << static_cast<int>(completion) << std::endl;
            progressFile.close();
            reportProgress(completion);
        }
    } catch (...) {
        // 忽略进度更新中的错误
    }
}

void RVOSimulator::reportProgress(double completion) const {
    std::cout << "[PROGRESS] " << static_cast<int>(completion) << std::endl;
    std::cout.flush();
}

bool RVOSimulator::agentHasWaypoints(int agentIndex) const {
    if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
        return false;
    }
    const auto& agent = agents_[agentIndex];
    return !agent.waypointXs.empty() && agent.waypointXs.size() == agent.waypointYs.size();
}

void RVOSimulator::initializeSimulator() {
    currentStep_ = 0;
    waitingCursor_ = 0;
    frames_.clear();
    frames_.reserve(static_cast<size_t>(maxSteps_) + 1);
    completedEvents_.clear();
    completedEvents_.reserve(agents_.size());
    activeAgents_.clear();
    activeAgents_.reserve(agents_.size());

    for (auto& agent : agents_) {
        agent.waypointCursor = std::min(agent.waypointCursor, agent.waypointXs.size());
        if (agent.targetFloorId == 0 && agent.floorId != 0) {
            agent.targetFloorId = agent.floorId;
        }
        agent.connectorId = -1;
        agent.connectorState = 0;
        agent.transferRemainingTime = 0.0;
    }

    std::fill(isActive_.begin(), isActive_.end(), 0);

    double maxAgentSpeed = 0.0;
    for (const auto& agent : agents_) {
        maxAgentSpeed = std::max(maxAgentSpeed, agent.velocity);
    }
    double dynamicThreshold = (maxAgentSpeed <= 0.0) ? 0.0 : maxAgentSpeed * kTimeStep;
    goalThreshold_ = static_cast<float>(std::max({0.5, config_.scale * 0.5, dynamicThreshold}));
}

void RVOSimulator::addAgentToSimulator(int agentIndex) {
    if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
        return;
    }
    if (agentIndex < static_cast<int>(isActive_.size()) && isActive_[agentIndex]) {
        return;
    }

    const auto& agent = agents_[agentIndex];
    ActiveAgent active{};
    active.agentIndex = agentIndex;
    active.x = agent.x;
    active.y = agent.y;
    active.vx = 0.0;
    active.vy = 0.0;
    active.floorId = agent.floorId;
    activeAgents_.push_back(active);
    if (agentIndex < static_cast<int>(isActive_.size())) {
        isActive_[agentIndex] = 1;
    }
}

void RVOSimulator::stepAgents() {
    for (auto& active : activeAgents_) {
        int agentIndex = active.agentIndex;
        if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
            continue;
        }
        if (agentCompleted_[agentIndex]) {
            active.vx = 0.0;
            active.vy = 0.0;
            continue;
        }

        auto& agent = agents_[agentIndex];
        double posX = active.x;
        double posY = active.y;

        if (agent.connectorState == 1 && agent.connectorId >= 0) {
            Connector* connector = findConnectorById(agent.connectorId);
            if (connector != nullptr) {
                const double step = std::max(kTimeStep, 1e-3);
                agent.transferRemainingTime = std::max(0.0, agent.transferRemainingTime - step);
                if (agent.transferRemainingTime <= kEpsilon) {
                    active.x = connector->exitX;
                    active.y = connector->exitY;
                    active.floorId = connector->toFloor;
                    agent.x = active.x;
                    agent.y = active.y;
                    agent.floorId = connector->toFloor;
                    agent.connectorState = 0;
                    agent.connectorId = -1;
                    connector->occupancy = std::max(0, connector->occupancy - 1);
                    posX = active.x;
                    posY = active.y;
                } else {
                    active.vx = 0.0;
                    active.vy = 0.0;
                    continue;
                }
            } else {
                agent.connectorState = 0;
                agent.connectorId = -1;
            }
        }

        advanceWaypointsIfNeeded(agentIndex, posX, posY);

        auto target = getCurrentTarget(agentIndex);
        double toGoalX = target.first - posX;
        double toGoalY = target.second - posY;
        double distSq = toGoalX * toGoalX + toGoalY * toGoalY;

        double desiredVelX = 0.0;
        double desiredVelY = 0.0;
        const double preferredSpeed = std::max(agent.velocity, 0.0);
        if (distSq > kEpsilon) {
            double dist = std::sqrt(distSq);
            double normalX = toGoalX / dist;
            double normalY = toGoalY / dist;
            desiredVelX = normalX * preferredSpeed;
            desiredVelY = normalY * preferredSpeed;
        }

        double sepX = 0.0;
        double sepY = 0.0;
        for (const auto& other : activeAgents_) {
            if (&other == &active) {
                continue;
            }
            int otherIndex = other.agentIndex;
            if (otherIndex < 0 || otherIndex >= static_cast<int>(agents_.size())) {
                continue;
            }
            if (agentCompleted_[otherIndex]) {
                continue;
            }
            if (agents_[otherIndex].floorId != agent.floorId || agents_[otherIndex].connectorState != 0) {
                continue;
            }
            double dx = posX - other.x;
            double dy = posY - other.y;
            double neighborDistSq = dx * dx + dy * dy;
            if (neighborDistSq < kNeighborRadius * kNeighborRadius && neighborDistSq > kEpsilon) {
                double neighborDist = std::sqrt(neighborDistSq);
                double weight = (kNeighborRadius - neighborDist) / kNeighborRadius;
                if (neighborDist > kEpsilon) {
                    sepX += weight * (dx / neighborDist);
                    sepY += weight * (dy / neighborDist);
                }
            }
        }

        desiredVelX += kSeparationStrength * sepX;
        desiredVelY += kSeparationStrength * sepY;

        double speedSq = desiredVelX * desiredVelX + desiredVelY * desiredVelY;
        double maxSpeed = std::max(preferredSpeed, 0.0);
        if (speedSq > maxSpeed * maxSpeed && speedSq > kEpsilon) {
            double scale = maxSpeed / std::sqrt(speedSq);
            desiredVelX *= scale;
            desiredVelY *= scale;
        }

        double newX = posX + desiredVelX * kTimeStep;
        double newY = posY + desiredVelY * kTimeStep;

        active.vx = desiredVelX;
        active.vy = desiredVelY;
        active.x = newX;
        active.y = newY;
        active.floorId = agent.floorId;

        agents_[agentIndex].x = newX;
        agents_[agentIndex].y = newY;

        const Connector* connector = selectConnectorForAgent(agent);
        if (connector != nullptr) {
            const double cdx = connector->entryX - newX;
            const double cdy = connector->entryY - newY;
            const double reachSq = cdx * cdx + cdy * cdy;
            if (reachSq <= goalThreshold_ * goalThreshold_) {
                Connector* mutableConnector = findConnectorById(connector->id);
                if (mutableConnector != nullptr && mutableConnector->occupancy < std::max(mutableConnector->capacity, 1)) {
                    mutableConnector->occupancy += 1;
                    agent.connectorState = 1;
                    agent.connectorId = mutableConnector->id;
                    agent.transferRemainingTime = std::max(mutableConnector->serviceTime, kTimeStep);
                    active.vx = 0.0;
                    active.vy = 0.0;
                }
            }
        }
    }
}

void RVOSimulator::updateCompletedAgents() {
    bool anyRemoval = false;
    for (auto& active : activeAgents_) {
        int agentIndex = active.agentIndex;
        if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
            continue;
        }
        if (agentCompleted_[agentIndex]) {
            continue;
        }
        if (agents_[agentIndex].connectorState != 0) {
            continue;
        }

        advanceWaypointsIfNeeded(agentIndex, active.x, active.y);
        auto target = getCurrentTarget(agentIndex);
        double dx = target.first - active.x;
        double dy = target.second - active.y;
        double distSq = dx * dx + dy * dy;

        if (distSq <= goalThreshold_ * goalThreshold_) {
            advanceWaypointsIfNeeded(agentIndex, active.x, active.y);
            target = getCurrentTarget(agentIndex);
            dx = target.first - active.x;
            dy = target.second - active.y;
            distSq = dx * dx + dy * dy;
            if (distSq <= goalThreshold_ * goalThreshold_) {
                const int eid = agents_[agentIndex].exitId;
                if (eid < 0 || eid >= static_cast<int>(exits_.size())) {
                    continue;
                }
                const Exit& curEx = exits_[static_cast<size_t>(eid)];
                if (curEx.floorId != agents_[agentIndex].floorId) {
                    continue;
                }
                int floorKey = 0;
                int assemblyNum = 0;
                std::string teleport;
                parseExitKeyName(curEx.name, floorKey, assemblyNum, teleport);

                if (agents_[agentIndex].floorId == 0) {
                    agentCompleted_[agentIndex] = true;
                    anyRemoval = true;

                    CompletedEvent event;
                    event.agentId = agents_[agentIndex].id;
                    event.exitId = agents_[agentIndex].exitId;
                    event.frameIndex = currentStep_;
                    event.time = static_cast<double>(currentStep_) * kTimeStep;
                    completedEvents_.push_back(event);
                    continue;
                }

                if (teleport.empty()) {
                    int alt = -1;
                    for (int i = 0; i < static_cast<int>(exits_.size()); ++i) {
                        if (i == eid) {
                            continue;
                        }
                        if (exits_[static_cast<size_t>(i)].floorId != agents_[agentIndex].floorId) {
                            continue;
                        }
                        int fk = 0;
                        int an = 0;
                        std::string t2;
                        parseExitKeyName(exits_[static_cast<size_t>(i)].name, fk, an, t2);
                        if (!t2.empty()) {
                            alt = i;
                            break;
                        }
                    }
                    if (alt >= 0 && navGrid_) {
                        agents_[agentIndex].exitId = alt;
                        agentGoals_[agentIndex] = getExitCenter(alt);
                        agents_[agentIndex].waypointXs.clear();
                        agents_[agentIndex].waypointYs.clear();
                        agents_[agentIndex].waypointCursor = 0;
                        const int gv = navGrid_->findClosestGraphVertex(active.x, active.y, true);
                        agents_[agentIndex].graphNodeIndex = gv;
                        const auto coords = navGrid_->getWaypointCoordinates(alt, gv);
                        for (const auto& p : coords) {
                            agents_[agentIndex].waypointXs.push_back(p.first);
                            agents_[agentIndex].waypointYs.push_back(p.second);
                        }
                    }
                    continue;
                }

                const int nf = nextFloorTowardF1(agents_[agentIndex].floorId);
                int targetExit = -1;
                for (int i = 0; i < static_cast<int>(exits_.size()); ++i) {
                    if (exits_[static_cast<size_t>(i)].floorId != nf) {
                        continue;
                    }
                    int fk = 0;
                    int an = 0;
                    std::string t2;
                    parseExitKeyName(exits_[static_cast<size_t>(i)].name, fk, an, t2);
                    if (an == assemblyNum) {
                        targetExit = i;
                        break;
                    }
                }
                if (targetExit < 0 || !navGrid_) {
                    continue;
                }
                const auto g = getExitCenter(targetExit);
                agents_[agentIndex].floorId = nf;
                agents_[agentIndex].exitId = targetExit;
                agents_[agentIndex].x = g.first;
                agents_[agentIndex].y = g.second;
                active.x = g.first;
                active.y = g.second;
                active.floorId = nf;
                agentGoals_[agentIndex] = getExitCenter(targetExit);
                agents_[agentIndex].waypointXs.clear();
                agents_[agentIndex].waypointYs.clear();
                agents_[agentIndex].waypointCursor = 0;
                const int gv2 = navGrid_->findClosestGraphVertex(active.x, active.y, true);
                agents_[agentIndex].graphNodeIndex = gv2;
                const auto coords2 = navGrid_->getWaypointCoordinates(targetExit, gv2);
                for (const auto& p : coords2) {
                    agents_[agentIndex].waypointXs.push_back(p.first);
                    agents_[agentIndex].waypointYs.push_back(p.second);
                }
            }
        }
    }

    if (anyRemoval) {
        activeAgents_.erase(std::remove_if(activeAgents_.begin(), activeAgents_.end(), [&](const ActiveAgent& active) {
            int idx = active.agentIndex;
            if (idx >= 0 && idx < static_cast<int>(agentCompleted_.size()) && agentCompleted_[idx]) {
                if (idx < static_cast<int>(isActive_.size())) {
                    isActive_[idx] = 0;
                }
                return true;
            }
            return false;
        }), activeAgents_.end());
    }
}

void RVOSimulator::advanceWaypointsIfNeeded(int agentIndex, double posX, double posY) {
    if (!agentHasWaypoints(agentIndex)) {
        return;
    }

    auto& agent = agents_[agentIndex];
    const double thresholdSq = static_cast<double>(goalThreshold_) * static_cast<double>(goalThreshold_);

    while (agent.waypointCursor < agent.waypointXs.size()) {
        double wx = agent.waypointXs[agent.waypointCursor];
        double wy = agent.waypointYs[agent.waypointCursor];
        double dx = posX - wx;
        double dy = posY - wy;
        double distSq = dx * dx + dy * dy;
        if (distSq <= thresholdSq) {
            ++agent.waypointCursor;
        } else {
            break;
        }
    }
}

std::pair<double, double> RVOSimulator::getCurrentTarget(int agentIndex) const {
    if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
        return {0.0, 0.0};
    }
    const auto& agent = agents_[agentIndex];
    const Connector* connector = selectConnectorForAgent(agent);
    if (connector != nullptr) {
        return {connector->entryX, connector->entryY};
    }

    if (!agentHasWaypoints(agentIndex)) {
        return agentGoals_[agentIndex];
    }

    if (agent.waypointCursor < agent.waypointXs.size()) {
        return {agent.waypointXs[agent.waypointCursor], agent.waypointYs[agent.waypointCursor]};
    }

    return agentGoals_[agentIndex];
}

std::pair<double, double> RVOSimulator::getExitCenter(int exitId) const {
    auto it = std::find_if(exits_.begin(), exits_.end(), [&](const Exit& e) {
        return static_cast<int>(e.id) == exitId;
    });
    if (it == exits_.end()) {
        return {0.0, 0.0};
    }
    double centerX = (it->x0 + it->x1) / 2.0;
    double centerY = (it->y0 + it->y1) / 2.0;
    return {centerX, centerY};
}

int RVOSimulator::getExitFloor(int exitId) const {
    auto it = std::find_if(exits_.begin(), exits_.end(), [&](const Exit& e) {
        return static_cast<int>(e.id) == exitId;
    });
    if (it == exits_.end()) {
        return 0;
    }
    return it->floorId;
}

const Connector* RVOSimulator::selectConnectorForAgent(const Agent& agent) const {
    if (agent.floorId == agent.targetFloorId) {
        return nullptr;
    }
    auto it = std::find_if(connectors_.begin(), connectors_.end(), [&](const Connector& c) {
        return c.fromFloor == agent.floorId && c.toFloor == agent.targetFloorId;
    });
    if (it == connectors_.end()) {
        return nullptr;
    }
    return &(*it);
}

Connector* RVOSimulator::findConnectorById(int connectorId) {
    auto it = std::find_if(connectors_.begin(), connectors_.end(), [&](const Connector& c) {
        return c.id == connectorId;
    });
    if (it == connectors_.end()) {
        return nullptr;
    }
    return &(*it);
}

bool RVOSimulator::writeRawSimulationJson(const std::string& outputDir) const {
    namespace fs = std::filesystem;
    using json = nlohmann::json;

    if (outputDir.empty()) {
        return false;
    }

    fs::path rawPath = fs::path(outputDir) / "simulation_raw.json";
    std::ofstream rawFile(rawPath);
    if (!rawFile.is_open()) {
        return false;
    }

    rawFile << "{\n";

    json config = {
        {"bID", config_.bID},
        {"scale", config_.scale},
        {"status", config_.status},
        {"weight", config_.weight},
        {"k", config_.k},
        {"imgX0", config_.imgX0},
        {"imgY0", config_.imgY0},
        {"sT", config_.sT},
        {"fileName", config_.fileName},
        {"agentCount", static_cast<int>(agents_.size())}
    };
    rawFile << "  \"config\": " << config.dump() << ",\n";

    rawFile << "  \"exits\": [\n";
    for (size_t i = 0; i < exits_.size(); ++i) {
        const auto& exit = exits_[i];
        json exitJson = {
            {"id", exit.id},
            {"x0", exit.x0},
            {"y0", exit.y0},
            {"x1", exit.x1},
            {"y1", exit.y1},
            {"floorId", exit.floorId},
            {"capacity", exit.capacity},
            {"name", exit.name}
        };
        rawFile << "    " << exitJson.dump();
        if (i + 1 < exits_.size()) {
            rawFile << ",";
        }
        rawFile << "\n";
    }
    rawFile << "  ],\n";

    rawFile << "  \"connectors\": [\n";
    for (size_t i = 0; i < connectors_.size(); ++i) {
        const auto& connector = connectors_[i];
        json connectorJson = {
            {"id", connector.id},
            {"type", connector.type},
            {"fromFloor", connector.fromFloor},
            {"toFloor", connector.toFloor},
            {"entryX", connector.entryX},
            {"entryY", connector.entryY},
            {"exitX", connector.exitX},
            {"exitY", connector.exitY},
            {"capacity", connector.capacity},
            {"serviceTime", connector.serviceTime}
        };
        rawFile << "    " << connectorJson.dump();
        if (i + 1 < connectors_.size()) {
            rawFile << ",";
        }
        rawFile << "\n";
    }
    rawFile << "  ],\n";

    rawFile << "  \"frames\": [\n";
    for (size_t i = 0; i < frames_.size(); ++i) {
        const auto& frame = frames_[i];
        json frameJson;
        frameJson["index"] = frame.step;
        frameJson["time"] = frame.step * kTimeStep;
        json agentsArray = json::array();
        for (const auto& pos : frame.positions) {
            agentsArray.push_back({
                {"id", pos.id},
                {"x", pos.x},
                {"y", pos.y},
                {"floorId", pos.floorId},
                {"connectorState", pos.connectorState},
                {"connectorId", pos.connectorId}
            });
        }
        frameJson["agents"] = std::move(agentsArray);
        rawFile << "    " << frameJson.dump();
        if (i + 1 < frames_.size()) {
            rawFile << ",";
        }
        rawFile << "\n";
    }
    rawFile << "  ],\n";

    rawFile << "  \"completedEvents\": [\n";
    for (size_t i = 0; i < completedEvents_.size(); ++i) {
        const auto& event = completedEvents_[i];
        json eventJson = {
            {"agentId", event.agentId},
            {"exitId", event.exitId},
            {"frame", event.frameIndex},
            {"time", event.time}
        };
        rawFile << "    " << eventJson.dump();
        if (i + 1 < completedEvents_.size()) {
            rawFile << ",";
        }
        rawFile << "\n";
    }
    rawFile << "  ]\n";

    rawFile << "}\n";
    rawFile.close();
    return true;
}

} // namespace rvocpp

