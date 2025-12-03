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

    config_.bID = data.value("bID", 0);
    config_.scale = data.value("scale", 1.0);
    config_.status = data.value("status", 1);
    config_.weight = data.value("weight", 1);
    config_.k = data.value("k", 1.0);
    config_.fileName = data.value("fileName", std::string("output"));
    config_.imgX0 = data.value("imgX0", 0.0);
    config_.imgY0 = data.value("imgY0", 0.0);
    config_.sT = data.value("sT", 0.0);

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

    // 构建 NavGrid（复制数据至 NavGrid 所需的结构）
    std::vector<NavPointC> navPointsForGrid;
    navPointsForGrid.reserve(navPoints_.size());
    for (const auto& nav : navPoints_) {
        navPointsForGrid.push_back(NavPointC{nav.x, nav.y, nav.state, nav.roomIds});
    }

    std::vector<ObstacleC> obstaclesForGrid;
    obstaclesForGrid.reserve(obstacles_.size());
    for (const auto& ob : obstacles_) {
        obstaclesForGrid.push_back(ObstacleC{ob.x1, ob.y1, ob.x2, ob.y2});
    }

    std::vector<ExitC> exitsForGrid;
    exitsForGrid.reserve(exits_.size());
    for (const auto& exit : exits_) {
        ExitC exitC;
        exitC.cx = (exit.x0 + exit.x1) / 2.0;
        exitC.cy = (exit.y0 + exit.y1) / 2.0;
        exitC.id = static_cast<int>(exit.id);
        exitsForGrid.push_back(exitC);
    }

    navGrid_ = std::make_unique<NavGrid>(navPointsForGrid, obstaclesForGrid, exitsForGrid, rooms_, peopleGroups_);
    navLines_ = navGrid_->generateLines();

    // 依据 NavGrid 为每个 agent 生成 waypoint
    for (auto& agent : agents_) {
        ::std::pair<double, double> entryPos{agent.x, agent.y};
        int nearestVertex = navGrid_->findClosestGraphVertex(entryPos.first, entryPos.second, true);
        agent.graphNodeIndex = nearestVertex;
        agent.waypointXs.clear();
        agent.waypointYs.clear();
        agent.waypointCursor = 0;

        if (nearestVertex >= 0) {
            auto coords = navGrid_->getWaypointCoordinates(agent.exitId, nearestVertex);
            // NavGrid 返回从当前点通往出口的导航点，按顺序写入
            for (const auto& [wx, wy] : coords) {
                agent.waypointXs.push_back(wx);
                agent.waypointYs.push_back(wy);
            }
        } else {
            // 无直接可达导航点，则尝试直接以出口中心为目标
            auto center = navGrid_->getExitCenter(agent.exitId);
            agent.waypointXs.push_back(center.first);
            agent.waypointYs.push_back(center.second);
        }
    }

    // 初始化等待列表和目标
    waitingList_.clear();
    waitingList_.reserve(agents_.size());
    for (size_t i = 0; i < agents_.size(); ++i) {
        waitingList_.push_back(static_cast<int>(i));
    }
    std::sort(waitingList_.begin(), waitingList_.end(), [&](int lhs, int rhs) {
        return agents_[lhs].startTime < agents_[rhs].startTime;
    });

    agentGoals_.assign(agents_.size(), std::make_pair(0.0, 0.0));
    for (size_t i = 0; i < agents_.size(); ++i) {
        agentGoals_[i] = getExitCenter(agents_[i].exitId);
    }
    agentCompleted_.assign(agents_.size(), false);

    if (config_.outputDir.empty()) {
        std::filesystem::path jsonDir = std::filesystem::path(jsonPath).parent_path();
        config_.outputDir = jsonDir.string();
    }

    return true;
}

void RVOSimulator::setOutputDir(const std::string& outputDir) {
    config_.outputDir = outputDir;
}

bool RVOSimulator::run() {
    initializeSimulator();

    while (currentStep_ < maxSteps_) {
        // 1. 按 startTime 将 agent 加入模拟
        while (!waitingList_.empty()) {
            int agentIndex = waitingList_.front();
            if (agents_[agentIndex].startTime * 100.0 <= currentStep_) {
                addAgentToSimulator(agentIndex);
                waitingList_.erase(waitingList_.begin());
            } else {
                break;
            }
        }

        // 2. 记录当前帧位置
        FrameData frame;
        frame.step = currentStep_;
        for (const auto& active : activeAgents_) {
            int agentIndex = active.agentIndex;
            if (agentIndex >= 0 && agentIndex < static_cast<int>(agents_.size())) {
                frame.positions.push_back({agents_[agentIndex].id, {active.x, active.y}});
            }
        }
        frames_.push_back(std::move(frame));

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

    int frameIndex = 0;
    for (const auto& frame : frames_) {
        resultFile << frameIndex << " " << frame.positions.size();
        for (const auto& pos : frame.positions) {
            resultFile << " " << pos.first << " "
                      << std::fixed << std::setprecision(2)
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
    frames_.clear();
    completedEvents_.clear();
    activeAgents_.clear();

    for (auto& agent : agents_) {
        agent.waypointCursor = std::min(agent.waypointCursor, agent.waypointXs.size());
    }

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
    auto existing = std::find_if(activeAgents_.begin(), activeAgents_.end(), [&](const ActiveAgent& a) {
        return a.agentIndex == agentIndex;
    });
    if (existing != activeAgents_.end()) {
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
            return idx >= 0 && idx < static_cast<int>(agentCompleted_.size()) && agentCompleted_[idx];
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

    json root;
    root["meta"] = {
        {"timeStep", kTimeStep},
        {"totalFrames", static_cast<int>(frames_.size())},
        {"totalAgents", static_cast<int>(agents_.size())}
    };

    root["config"] = {
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

    json agentsJson = json::array();
    for (const auto& agent : agents_) {
        agentsJson.push_back({
            {"id", agent.id},
            {"x", agent.x},
            {"y", agent.y},
            {"velocity", agent.velocity},
            {"startTime", agent.startTime},
            {"exitId", agent.exitId},
            {"roomIds", agent.roomIds}
        });
    }
    root["agents"] = agentsJson;

    json exitsJson = json::array();
    for (const auto& exit : exits_) {
        exitsJson.push_back({
            {"id", exit.id},
            {"x0", exit.x0},
            {"y0", exit.y0},
            {"x1", exit.x1},
            {"y1", exit.y1},
            {"capacity", exit.capacity},
            {"name", exit.name}
        });
    }
    root["exits"] = exitsJson;

    json framesJson = json::array();
    for (const auto& frame : frames_) {
        json agentsArray = json::array();
        for (const auto& pos : frame.positions) {
            agentsArray.push_back({
                {"id", pos.first},
                {"x", pos.second.first},
                {"y", pos.second.second}
            });
        }
        framesJson.push_back({
            {"index", frame.step},
            {"time", frame.step * kTimeStep},
            {"agents", agentsArray}
        });
    }
    root["frames"] = framesJson;

    json completedJson = json::array();
    for (const auto& event : completedEvents_) {
        completedJson.push_back({
            {"agentId", event.agentId},
            {"exitId", event.exitId},
            {"frame", event.frameIndex},
            {"time", event.time}
        });
    }
    root["completedEvents"] = completedJson;

    fs::path rawPath = fs::path(outputDir) / "simulation_raw.json";
    std::ofstream rawFile(rawPath);
    if (!rawFile.is_open()) {
        return false;
    }

    rawFile << root.dump(2);
    rawFile.close();
    return true;
}

} // namespace rvocpp

