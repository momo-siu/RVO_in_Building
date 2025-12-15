#include "simulator.h"

#include <fstream>
#include <iostream>
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <filesystem>
#include <numeric>

#include "json.hpp"

namespace {
    using json = nlohmann::json;
    constexpr double kTimeStep = 0.25;          // 与旧逻辑一致的离散步长
    constexpr double kAgentRadius = 0.4;        // 简易碰撞半径
    constexpr double kNeighborRadius = 1.5;     // 分离作用半径
    constexpr double kSeparationStrength = 1.0; // 分离系数
    constexpr double kEpsilon = 1e-6;
}

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
                                std::vector<RoomC> rooms,
                                std::vector<PeopleGroupC> peopleGroups) {
    config_ = config;
    agents_ = std::move(agents);
    obstacles_ = std::move(obstacles);
    exits_ = std::move(exits);
    navPoints_ = std::move(navPoints);
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
            obstaclesC.push_back(ob);
        }

        std::vector<ExitC> exitsC;
        exitsC.reserve(exits_.size());
        for (const auto& e : exits_) {
            ExitC ex;
            ex.cx = (e.x0 + e.x1) * 0.5;
            ex.cy = (e.y0 + e.y1) * 0.5;
            ex.id = static_cast<int>(e.id);
            exitsC.push_back(ex);
        }

        navGrid_ = std::make_unique<NavGrid>(navPointsC, obstaclesC, exitsC, rooms_, peopleGroups_);
        navLines_ = navGrid_->generateLines();

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
                    frame.positions.push_back({agents_[agentIndex].id, {active.x, active.y}});
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
            resultFile << " " << pos.first << " "
                      << pos.second.first << " " << pos.second.second;
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

        agents_[agentIndex].x = newX;
        agents_[agentIndex].y = newY;
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
                agentCompleted_[agentIndex] = true;
                anyRemoval = true;

                CompletedEvent event;
                event.agentId = agents_[agentIndex].id;
                event.exitId = agents_[agentIndex].exitId;
                event.frameIndex = currentStep_;
                event.time = static_cast<double>(currentStep_) * kTimeStep;
                completedEvents_.push_back(event);
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
    if (!agentHasWaypoints(agentIndex)) {
        return agentGoals_[agentIndex];
    }

    const auto& agent = agents_[agentIndex];
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
        {"fileName", config_.fileName}
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

    rawFile << "  \"frames\": [\n";
    for (size_t i = 0; i < frames_.size(); ++i) {
        const auto& frame = frames_[i];
        json frameJson;
        frameJson["index"] = frame.step;
        frameJson["time"] = frame.step * kTimeStep;
        json agentsArray = json::array();
        for (const auto& pos : frame.positions) {
            agentsArray.push_back({
                {"id", pos.first},
                {"x", pos.second.first},
                {"y", pos.second.second}
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

