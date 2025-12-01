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
    constexpr float kTimeStep = 0.25f;          // 与Java实现近似的时间步
    constexpr float kDefaultNeighborDist = 5.0f;
    constexpr size_t kDefaultMaxNeighbors = 10;
    constexpr float kDefaultTimeHorizon = 5.0f;
    constexpr float kDefaultTimeHorizonObst = 5.0f;
    constexpr float kDefaultRadius = 0.5f;
    constexpr float kDefaultMaxSpeed = 1.5f;
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

    // 初始化等待列表和目标
    waitingList_.clear();
    waitingList_.reserve(agents_.size());
    for (size_t i = 0; i < agents_.size(); ++i) {
        waitingList_.push_back(static_cast<int>(i));
    }
    std::sort(waitingList_.begin(), waitingList_.end(), [&](int lhs, int rhs) {
        return agents_[lhs].startTime < agents_[rhs].startTime;
    });

    agentGoals_.assign(agents_.size(), ::RVO::Vector2());
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
        // 1. 按 startTime 把 agent 从 waitingList_ 加入模拟
        while (!waitingList_.empty()) {
            int agentIndex = waitingList_.front();
            if (agents_[agentIndex].startTime * 100.0 <= currentStep_) {
                addAgentToSimulator(agentIndex);
                waitingList_.erase(waitingList_.begin());
            } else {
                break;
            }
        }

        // 2. 记录当前帧
        FrameData frame;
        frame.step = currentStep_;
        size_t numAgents = simulator_->getNumAgents();
        for (size_t i = 0; i < numAgents; ++i) {
            ::RVO::Vector2 pos = simulator_->getAgentPosition(i);
            if (i < agentIds_.size()) {
                frame.positions.push_back({agentIds_[i], {pos.x(), pos.y()}});
            }
        }
        frames_.push_back(std::move(frame));

        updateCompletedAgents();
        if (reachedGoal()) {
            break;
        }

        // 3. 设置首选速度并执行一步
        setPreferredVelocities();
        simulator_->doStep();

        // 4. 更新进度
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

void RVOSimulator::initializeSimulator() {
    simulator_ = std::make_unique<::RVO::RVOSimulator>();
    simulator_->setTimeStep(kTimeStep);
    currentStep_ = 0;
    agentIds_.clear();
    rvoAgentToAgentIndex_.clear();
    frames_.clear();
    completedEvents_.clear();

    // 添加障碍物
    for (const auto& obstacle : obstacles_) {
        std::vector<::RVO::Vector2> vertices;
        vertices.emplace_back(obstacle.x1, obstacle.y1);
        vertices.emplace_back(obstacle.x2, obstacle.y2);
        simulator_->addObstacle(vertices);
    }
    
    // 处理障碍物
    simulator_->processObstacles();
    
    // goal 阈值与scale相关
    goalThreshold_ = static_cast<float>(std::max(0.5, config_.scale * 0.5));
}

void RVOSimulator::addAgentToSimulator(int agentIndex) {
    const auto& agent = agents_[agentIndex];
    
    // 添加到RVO模拟器
    ::RVO::Vector2 position(agent.x, agent.y);
    size_t rvoIndex = simulator_->addAgent(
        position,
        kDefaultNeighborDist,
        static_cast<size_t>(kDefaultMaxNeighbors),
        kDefaultTimeHorizon,
        kDefaultTimeHorizonObst,
        kDefaultRadius,
        std::max(static_cast<float>(agent.velocity), kDefaultMaxSpeed),
        ::RVO::Vector2(0.0f, 0.0f)
    );

    if (agentIds_.size() <= rvoIndex) {
        agentIds_.resize(rvoIndex + 1, -1);
    }
    agentIds_[rvoIndex] = agent.id;

    if (rvoAgentToAgentIndex_.size() <= rvoIndex) {
        rvoAgentToAgentIndex_.resize(rvoIndex + 1, -1);
    }
    rvoAgentToAgentIndex_[rvoIndex] = agentIndex;
}

void RVOSimulator::setPreferredVelocities() {
    size_t numAgents = simulator_->getNumAgents();
    for (size_t i = 0; i < numAgents; ++i) {
        if (i >= rvoAgentToAgentIndex_.size()) {
            continue;
        }
        int agentIndex = rvoAgentToAgentIndex_[i];
        if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
            continue;
        }

        ::RVO::Vector2 preferredVel(0.0f, 0.0f);
        if (!agentCompleted_[agentIndex]) {
            ::RVO::Vector2 pos = simulator_->getAgentPosition(i);
            advanceWaypointsIfNeeded(agentIndex, pos);
            ::RVO::Vector2 goal = getCurrentTarget(agentIndex);
            ::RVO::Vector2 toGoal = goal - pos;
            float distSq = ::RVO::absSq(toGoal);
            if (distSq > 1e-6f) {
                toGoal = ::RVO::normalize(toGoal);
                float preferredSpeed = static_cast<float>(agents_[agentIndex].velocity);
                preferredSpeed = std::max(0.1f, std::min(preferredSpeed, kDefaultMaxSpeed));
                preferredVel = toGoal * preferredSpeed;
            }
        }

        simulator_->setAgentPrefVelocity(i, preferredVel);
    }
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

void RVOSimulator::updateCompletedAgents() {
    size_t numAgents = simulator_->getNumAgents();
    for (size_t i = 0; i < numAgents; ++i) {
        if (i >= rvoAgentToAgentIndex_.size()) {
            continue;
        }
        int agentIndex = rvoAgentToAgentIndex_[i];
        if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
            continue;
        }
        if (agentCompleted_[agentIndex]) {
            continue;
        }

        ::RVO::Vector2 goal = getCurrentTarget(agentIndex);
        ::RVO::Vector2 pos = simulator_->getAgentPosition(i);
        if (::RVO::absSq(goal - pos) <= goalThreshold_ * goalThreshold_) {
            advanceWaypointsIfNeeded(agentIndex, pos);
            goal = getCurrentTarget(agentIndex);
        }
        if (::RVO::absSq(goal - pos) <= goalThreshold_ * goalThreshold_) {
            agentCompleted_[agentIndex] = true;

            CompletedEvent event;
            event.agentId = agents_[agentIndex].id;
            event.exitId = agents_[agentIndex].exitId;
            event.frameIndex = currentStep_;
            event.time = static_cast<double>(currentStep_) * kTimeStep;
            completedEvents_.push_back(event);
        }
    }
}

void RVOSimulator::advanceWaypointsIfNeeded(int agentIndex, const ::RVO::Vector2& position) {
    if (!agentHasWaypoints(agentIndex)) {
        return;
    }

    auto& agent = agents_[agentIndex];
    const double thresholdSq = static_cast<double>(goalThreshold_) * static_cast<double>(goalThreshold_);

    while (agent.waypointCursor < agent.waypointXs.size()) {
        double wx = agent.waypointXs[agent.waypointCursor];
        double wy = agent.waypointYs[agent.waypointCursor];
        double dx = static_cast<double>(position.x()) - wx;
        double dy = static_cast<double>(position.y()) - wy;
        double distSq = dx * dx + dy * dy;
        if (distSq <= thresholdSq) {
            ++agent.waypointCursor;
        } else {
            break;
        }
    }
}

::RVO::Vector2 RVOSimulator::getCurrentTarget(int agentIndex) const {
    if (!agentHasWaypoints(agentIndex)) {
        return agentGoals_[agentIndex];
    }

    const auto& agent = agents_[agentIndex];
    if (agent.waypointCursor < agent.waypointXs.size()) {
        float wx = static_cast<float>(agent.waypointXs[agent.waypointCursor]);
        float wy = static_cast<float>(agent.waypointYs[agent.waypointCursor]);
        return ::RVO::Vector2(wx, wy);
    }

    return agentGoals_[agentIndex];
}

bool RVOSimulator::agentHasWaypoints(int agentIndex) const {
    if (agentIndex < 0 || agentIndex >= static_cast<int>(agents_.size())) {
        return false;
    }
    const auto& agent = agents_[agentIndex];
    return !agent.waypointXs.empty() && agent.waypointXs.size() == agent.waypointYs.size();
}

::RVO::Vector2 RVOSimulator::getExitCenter(int exitId) const {
    auto it = std::find_if(exits_.begin(), exits_.end(), [&](const Exit& e) {
        return static_cast<int>(e.id) == exitId;
    });
    if (it == exits_.end()) {
        return ::RVO::Vector2(0.0f, 0.0f);
    }
    float centerX = static_cast<float>((it->x0 + it->x1) / 2.0);
    float centerY = static_cast<float>((it->y0 + it->y1) / 2.0);
    return ::RVO::Vector2(centerX, centerY);
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

