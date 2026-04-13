#ifndef NAV_GRID_H
#define NAV_GRID_H

#include <vector>
#include <map>
#include <string>
#include <utility>

namespace rvocpp {

    inline constexpr double kMinCoordinate = -9999.0;

    struct Point2D {
        double x {0.0};
        double y {0.0};
    };

    struct NavPointC {
        double x;
        double y;
        int state;                    // 0: in room, 1: outside, etc.
        int floorId {0};
        std::vector<int> roomIds;     // 对应 Java Pos.room_id
    };

    struct ExitC {
        double cx;
        double cy;
        int id;
        int floorId {0};
        std::string name;  // exitKey for teleportation parsing (e.g., "-1-1-F1")
    };

    struct ObstacleC {
        double x1, y1, x2, y2;
        int floorId {0};
    };

    struct RoomC {
        int rid {0};
        int floorId {0};
        std::vector<Point2D> walls;  // 有效墙体顶点顺序排列
        int peopleCount {0};         // 房间内人口数量（peos.size）
    };

    struct PeopleGroupC {
        int id {0};
        int floorId {0};
        std::vector<Point2D> walls;  // 人口框墙体
        int peopleCount {0};
    };

    // 负责构建导航图 + Dijkstra + 连线
    class NavGrid {
    public:
        NavGrid();

        NavGrid(const std::vector<NavPointC>& points,
                const std::vector<ObstacleC>& obstacles,
                const std::vector<ExitC>& exits,
                const std::vector<RoomC>& rooms = {},
                const std::vector<PeopleGroupC>& peopleGroups = {});

        // 生成连线，返回与 Java NavGrid.generateLines() 等价的 "a","b" 顶点索引对
        std::vector<std::map<std::string, int>> generateLines();

        // 获取从指定图节点到出口的 waypoint 坐标序列（与 Java NavGrid.getWaypointCoordinates 等价）
        std::vector<std::pair<double, double>> getWaypointCoordinates(int exitId, int startVertexIndex) const;

        // 获取出口中心坐标
        std::pair<double, double> getExitCenter(int exitId) const;

        // 根据空间坐标寻找最近的图节点索引；onlyReachable=true 时会过滤不可到达的节点
        int findClosestGraphVertex(double x, double y, bool onlyReachable = true) const;

        // 房间/人群附加点到各出口的最短距离矩阵（按 Java NavGrid.matrix_room_exit）
        const std::vector<std::vector<int>>& roomExitDistanceMatrix() const { return matrixRoomToExit_; }

        // 顶点总数
        int vertexCount() const { return static_cast<int>(vertexIds_.size()); }

    private:
        static constexpr int MAXLEN = 0x3f3f3f3f;
        static constexpr double MIN_POS = kMinCoordinate;

        // 基础数据
        int basePointCount_ {0};                   // 原始导航点数量（不含房间/人口附加点）
        std::vector<NavPointC> points_;
        std::vector<ObstacleC> obstacles_;
        std::vector<ExitC> exits_;
        std::vector<RoomC> rooms_;
        std::vector<PeopleGroupC> peopleGroups_;

        // 扩充点相关缓存
        std::vector<int> removeRoomIndices_;       // 房间中心但无人的点索引
        std::vector<int> ridMapping_;              // 对应 Java rid 列表
        int nonRoomCount_ {0};                     // 房间 + 人口框附加点数量
        bool update_{false};
        std::vector<bool> reachable_;

        std::vector<int> vertexIds_;              // Java 的 vertexID
        std::vector<std::vector<int>> matrix_;    // 无向图矩阵
        std::vector<NavPointC> vertices_;         // 构图时的顶点缓存（包含出口）
        std::vector<int> pointToVertexIndex_;     // point 索引到邻接矩阵顶点索引的映射
        int appendedRoomsCount_{0};               // 实际追加的房间点数量
        int appendedPeopleCount_{0};              // 实际追加的人口框点数量
        std::vector<int> roomPointIndex_;         // 每个房间对应的导航点索引（若未生成则为-1）
        std::vector<int> peoplePointIndex_;       // 每个人口框对应的导航点索引（若未生成则为-1）

        // 多出口最短路径信息（与 Java NavGrid 保持一致）
        std::vector<int> minDistances_;                       // 每个顶点到最近出口的最短距离
        std::vector<int> destination_;                        // 每个顶点对应的出口索引
        std::vector<std::vector<int>> pathToExit_;            // 每个顶点的最优路径（顶点索引序列）
        std::vector<std::vector<int>> minDistancesExit_;      // 每个出口对应的最短距离数组
        std::vector<std::vector<std::vector<int>>> pathToAllExit_; // 每个出口对应所有顶点的路径集合
        std::vector<std::vector<int>> matrixRoomToExit_;      // 房间/人口框到出口的距离矩阵

        // 内部步骤
        void generateGraph();
        void dijkstra(int n, int source, int exitIndex,
                      std::vector<std::vector<int>>& paths,
                      std::vector<int>& distances);

        int minDistance(const std::vector<int>& distances,
                        const std::vector<bool>& visited) const;

        bool isIntersectWithObs(int ai, int bi) const;
        bool isIntersectWithObs(const Point2D& a, const Point2D& b) const;
        bool isIntersectWithRoom(const Point2D& a, const Point2D& b, const std::vector<int>& roomIds) const;

        // 辅助方法
        void augmentPointsWithRoomsAndGroups();
        static double distance(const NavPointC& a, const NavPointC& b);
        static double distance(const Point2D& a, const Point2D& b);
        static bool isPointInPolygon(const std::vector<Point2D>& polygon, const Point2D& p);
        static bool isPointOnSegment(const Point2D& p1, const Point2D& p2, const Point2D& q);
        void simplifyLines(std::vector<std::pair<int, int>>& edges) const;
        bool isGreater45(const std::vector<std::pair<int, int>>& edges, size_t idxA, size_t idxB) const;
        bool hasEdge(const std::vector<std::pair<int, int>>& edges, int a, int b) const;
        int resolveExitIndex(int exitId) const;
        bool canReachDirectly(const NavPointC& from, const NavPointC& to) const;

        // Parse exit key like "-1-1-F1" to extract floor, assemblyNum, teleportTarget
        static void parseExitKey(const std::string& name, int& floor, int& assemblyNum, std::string& teleportTarget);
    };

} // namespace rvocpp

#endif // NAV_GRID_H
