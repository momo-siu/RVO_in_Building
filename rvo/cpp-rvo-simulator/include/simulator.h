#ifndef SIMULATOR_H
#define SIMULATOR_H

#include <string>
#include <vector>
#include <memory>
#include <map>
#include <utility>
#include "nav_grid.h"

namespace rvocpp {

    struct Agent {
        int id;
        double x, y;
        double velocity;
        double startTime;
        int exitId;
        std::vector<int> roomIds;
        int graphNodeIndex = -1;
        std::vector<double> waypointXs;
        std::vector<double> waypointYs;
        std::size_t waypointCursor = 0;
    };

    struct Obstacle {
        int id;
        double x1, y1, x2, y2;
    };

    struct Exit {
        long id;
        double x0, y0, x1, y1;
        int capacity;
        std::string name;
    };

    struct NavPoint {
        double x, y;
        int state;
        std::vector<int> roomIds;
    };

    struct SimulationConfig {
        int bID;
        double scale;
        int status;  // 1=时间优先, 2=剂量优先, 3=个人剂量最小
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

        // 从JSON文件加载配置
        bool loadFromJSON(const std::string& jsonPath);

        // 设置输出目录（由调用者提供）
        void setOutputDir(const std::string& outputDir);

        // 运行模拟
        bool run();

        // 保存结果文件
        bool saveResults();

    private:
        struct ActiveAgent {
            int agentIndex;
            double x;
            double y;
            double vx;
            double vy;
        };

        // 输入数据
        std::vector<Agent> agents_;
        std::vector<Obstacle> obstacles_;
        std::vector<Exit> exits_;
        std::vector<NavPoint> navPoints_;
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
        std::vector<std::pair<double, double>> agentGoals_;
        std::vector<bool> agentCompleted_;
        float goalThreshold_;

        // 结果数据
        struct FrameData {
            int step;
            std::vector<std::pair<int, std::pair<double, double>>> positions;  // id -> (x, y)
        };

        struct CompletedEvent {
            int agentId;
            int exitId;
            int frameIndex;
            double time;
        };

        std::vector<FrameData> frames_;
        std::vector<std::vector<std::map<std::string, int>>> heatMapData_;
        std::vector<double> grdResults_;
        std::vector<double> personGrd_;
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
        bool writeRawSimulationJson(const std::string& outputDir) const;
    };
}

#endif // SIMULATOR_H