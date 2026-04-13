#ifndef SIMULATOR_H
#define SIMULATOR_H

#include <string>
#include <vector>
#include <memory>
#include <map>
#include <utility>
#include "nav_grid.h"
#include "json.hpp"

namespace rvocpp {

    struct Agent {
        int id;
        double x, y;
        double velocity;
        double startTime;
        int exitId;
        int floorId = 0;
        int targetFloorId = 0;
        int connectorId = -1;
        int connectorState = 0; // 0: walking, 1: in connector transfer
        double transferRemainingTime = 0.0;
        std::vector<int> roomIds;
        int graphNodeIndex = -1;
        std::vector<double> waypointXs;
        std::vector<double> waypointYs;
        std::size_t waypointCursor = 0;
    };

    struct Obstacle {
        int id;
        double x1, y1, x2, y2;
        int floorId = 0;
    };

    struct Exit {
        long id;
        double x0, y0, x1, y1;
        int floorId = 0;
        int capacity;
        std::string name;
    };

    struct NavPoint {
        double x, y;
        int state;
        int floorId = 0;
        int kind = 0; // 0: normal, 1: stair entry, 2: elevator entry
        int connectorId = -1;
        int toFloorId = 0;
        std::vector<int> roomIds;
    };

    struct Connector {
        int id = 0;
        int type = 0; // 1: stair, 2: elevator
        int fromFloor = 0;
        int toFloor = 0;
        double entryX = 0.0;
        double entryY = 0.0;
        double exitX = 0.0;
        double exitY = 0.0;
        int capacity = 1;
        double serviceTime = 0.0;
        int occupancy = 0;
    };

    struct SimulationConfig {
        int bID;
        double scale;
        int status;  // 模拟模式
        int weight;
        double k;
        double imgX0, imgY0, sT;
        std::string outputDir;
        std::string fileName;
    };

    class RVOSimulator {
    public:
        RVOSimulator();
        ~RVOSimulator();

        // 从JSON文件加载配置（兼容旧流程）
        bool loadFromJSON(const std::string& jsonPath);

        // 从 JSON 字符串加载配置（供 JNI 调用）
        bool loadFromJSONContent(const std::string& jsonContent);

        // 直接从内存结构加载配置（用于 JNI）
        bool loadFromData(const SimulationConfig& config,
                          std::vector<Agent> agents,
                          std::vector<Obstacle> obstacles,
                          std::vector<Exit> exits,
                          std::vector<NavPoint> navPoints,
                          std::vector<Connector> connectors,
                          std::vector<RoomC> rooms,
                          std::vector<PeopleGroupC> peopleGroups);

        // 设置输出目录（由调用者提供）
        void setOutputDir(const std::string& outputDir);

        // 运行模拟
        bool run();

        // 保存结果文件
        bool saveResults();

        int frameCount() const { return static_cast<int>(frames_.size()); }
        int completedAgentCount() const { return static_cast<int>(completedEvents_.size()); }

    private:
        struct ActiveAgent {
            int agentIndex;
            double x;
            double y;
            double vx;
            double vy;
            int floorId;
        };

        // 输入数据
        std::vector<Agent> agents_;
        std::vector<Obstacle> obstacles_;
        std::vector<Exit> exits_;
        std::vector<NavPoint> navPoints_;
        std::vector<Connector> connectors_;
        std::vector<RoomC> rooms_;
        std::vector<PeopleGroupC> peopleGroups_;
        SimulationConfig config_;

        std::unique_ptr<NavGrid> navGrid_;
        std::vector<std::map<std::string, int>> navLines_;
        std::vector<ActiveAgent> activeAgents_;

        // 模拟状态
        int currentStep_;
        int maxSteps_;
        std::vector<int> waitingList_;  // 等待进入的agent索引
        std::size_t waitingCursor_ = 0;
        std::vector<std::pair<double, double>> agentGoals_;
        std::vector<bool> agentCompleted_;
        std::vector<char> isActive_;
        float goalThreshold_;

        // 结果数据
        struct FrameData {
            int step;
            struct PositionSnapshot {
                int id;
                double x;
                double y;
                int floorId;
                int connectorState;
                int connectorId;
            };
            std::vector<PositionSnapshot> positions;
        };

        struct CompletedEvent {
            int agentId;
            int exitId;
            int frameIndex;
            double time;
        };

        std::vector<FrameData> frames_;
        std::vector<std::vector<std::map<std::string, int>>> heatMapData_;
        std::vector<CompletedEvent> completedEvents_;

        // 辅助方法
        void initializeSimulator();
        void addAgentToSimulator(int agentIndex);
        void stepAgents();
        bool reachedGoal();
        void updateProgress(int bID);
        void reportProgress(double completion) const;
        void updateCompletedAgents();
        void advanceWaypointsIfNeeded(int agentIndex, double posX, double posY);
        std::pair<double, double> getCurrentTarget(int agentIndex) const;
        bool agentHasWaypoints(int agentIndex) const;
        std::pair<double, double> getExitCenter(int exitId) const;
        int getExitFloor(int exitId) const;
        const Connector* selectConnectorForAgent(const Agent& agent) const;
        Connector* findConnectorById(int connectorId);
        void captureFrame();
        bool writeRawSimulationJson(const std::string& outputDir) const;
        bool rebuildNavigationState();
        bool loadFromJsonData(const nlohmann::json& data);
    };
}

#endif // SIMULATOR_H
