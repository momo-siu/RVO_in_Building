#include "nav_grid.h"

#include <algorithm>
#include <cmath>
#include <iterator>
#include <limits>
#include <unordered_set>
#include <sstream>
#include <string>

namespace rvocpp {

namespace {
    constexpr double kEpsilon = 1e-9;

    double cross(const Point2D& a, const Point2D& b, const Point2D& c) {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    }

    double dot(const Point2D& a, const Point2D& b, const Point2D& c) {
        return (b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y);
    }

    int orientation(const Point2D& p, const Point2D& q, const Point2D& r) {
        double val = cross(p, q, r);
        if (std::abs(val) < kEpsilon) return 0;
        return (val > 0.0) ? 1 : 2;
    }

    bool onSegment(const Point2D& p, const Point2D& q, const Point2D& r) {
        return q.x <= std::max(p.x, r.x) + kEpsilon && q.x + kEpsilon >= std::min(p.x, r.x) &&
               q.y <= std::max(p.y, r.y) + kEpsilon && q.y + kEpsilon >= std::min(p.y, r.y);
    }

    bool segmentsIntersect(const Point2D& p1, const Point2D& q1,
                           const Point2D& p2, const Point2D& q2) {
        int o1 = orientation(p1, q1, p2);
        int o2 = orientation(p1, q1, q2);
        int o3 = orientation(p2, q2, p1);
        int o4 = orientation(p2, q2, q1);

        if (o1 != o2 && o3 != o4) return true;

        if (o1 == 0 && onSegment(p1, p2, q1)) return true;
        if (o2 == 0 && onSegment(p1, q2, q1)) return true;
        if (o3 == 0 && onSegment(p2, p1, q2)) return true;
        if (o4 == 0 && onSegment(p2, q1, q2)) return true;

        return false;
    }

    Point2D toPoint(const NavPointC& nav) {
        return Point2D{nav.x, nav.y};
    }

    double hypotDistance(const Point2D& a, const Point2D& b) {
        double dx = a.x - b.x;
        double dy = a.y - b.y;
        return std::sqrt(dx * dx + dy * dy);
    }
} // namespace

NavGrid::NavGrid() = default;

NavGrid::NavGrid(const std::vector<NavPointC>& points,
                 const std::vector<ObstacleC>& obstacles,
                 const std::vector<ExitC>& exits,
                 const std::vector<RoomC>& rooms,
                 const std::vector<PeopleGroupC>& peopleGroups)
        : basePointCount_(static_cast<int>(points.size())),
          points_(points),
          obstacles_(obstacles),
          exits_(exits),
          rooms_(rooms),
          peopleGroups_(peopleGroups) {
    augmentPointsWithRoomsAndGroups();
}

void NavGrid::augmentPointsWithRoomsAndGroups() {
    removeRoomIndices_.clear();
    ridMapping_.clear();
    nonRoomCount_ = 0;
    appendedRoomsCount_ = 0;
    appendedPeopleCount_ = 0;
    roomPointIndex_.assign(rooms_.size(), -1);
    peoplePointIndex_.assign(peopleGroups_.size(), -1);

    // 追加房间中心
    for (size_t idx = 0; idx < rooms_.size(); ++idx) {
        const auto& room = rooms_[idx];
        if (room.walls.empty()) {
            continue;
        }

        double highMax = -std::numeric_limits<double>::infinity();
        double highMin = std::numeric_limits<double>::infinity();
        double widthMax = -std::numeric_limits<double>::infinity();
        double widthMin = std::numeric_limits<double>::infinity();
        std::vector<Point2D> validWalls;
        validWalls.reserve(room.walls.size());
        for (const auto& wall : room.walls) {
            if (wall.x > MIN_POS) {
                validWalls.push_back(wall);
                highMax = std::max(highMax, wall.y);
                highMin = std::min(highMin, wall.y);
                widthMax = std::max(widthMax, wall.x);
                widthMin = std::min(widthMin, wall.x);
            }
        }
        if (validWalls.empty()) {
            continue;
        }

        std::vector<int> roomIds;
        roomIds.push_back(static_cast<int>(idx));

        int pointIndex = static_cast<int>(points_.size());
        if (room.peopleCount <= 0) {
            removeRoomIndices_.push_back(pointIndex);
        }

        ridMapping_.push_back(room.rid);
        nonRoomCount_++;
        appendedRoomsCount_++;

        Point2D center{(widthMin + widthMax) / 2.0, (highMax + highMin) / 2.0};
        Point2D probe = center;
        if (isPointInPolygon(validWalls, probe)) {
            probe = Point2D{(widthMin + 9.0 * widthMax) / 10.0,
                            (9.0 * highMax + highMin) / 10.0};
        }

        for (size_t other = 0; other < rooms_.size(); ++other) {
            if (other == idx) continue;
            const auto& otherRoom = rooms_[other];
            std::vector<Point2D> otherWalls;
            for (const auto& wall : otherRoom.walls) {
                if (wall.x > MIN_POS) {
                    otherWalls.push_back(wall);
                }
            }
            if (!otherWalls.empty() && isPointInPolygon(otherWalls, probe)) {
                roomIds.push_back(static_cast<int>(other));
            }
        }

        NavPointC nav{};
        nav.x = center.x;
        nav.y = center.y;
        nav.state = 0;
        nav.floorId = room.floorId;
        nav.roomIds = roomIds;
        roomPointIndex_[idx] = pointIndex;
        points_.push_back(std::move(nav));
    }

    // 追加人口框中心
    for (size_t idx = 0; idx < peopleGroups_.size(); ++idx) {
        const auto& group = peopleGroups_[idx];
        std::vector<Point2D> validWalls;
        validWalls.reserve(group.walls.size());
        for (const auto& wall : group.walls) {
            if (wall.x > MIN_POS) {
                validWalls.push_back(wall);
            }
        }
        if (group.peopleCount <= 0 || validWalls.empty()) {
            continue;
        }

        double highMax = -std::numeric_limits<double>::infinity();
        double highMin = std::numeric_limits<double>::infinity();
        double widthMax = -std::numeric_limits<double>::infinity();
        double widthMin = std::numeric_limits<double>::infinity();
        for (const auto& wall : validWalls) {
            highMax = std::max(highMax, wall.y);
            highMin = std::min(highMin, wall.y);
            widthMax = std::max(widthMax, wall.x);
            widthMin = std::min(widthMin, wall.x);
        }

        Point2D center{(widthMin + widthMax) / 2.0, (highMax + highMin) / 2.0};
        std::vector<int> roomIds;
        for (size_t rIdx = 0; rIdx < rooms_.size(); ++rIdx) {
            std::vector<Point2D> roomWalls;
            for (const auto& wall : rooms_[rIdx].walls) {
                if (wall.x > MIN_POS) {
                    roomWalls.push_back(wall);
                }
            }
            if (!roomWalls.empty() && isPointInPolygon(roomWalls, center)) {
                roomIds.push_back(static_cast<int>(rIdx));
            }
        }

        int state = roomIds.empty() ? 0 : 1;

        NavPointC nav{};
        nav.x = center.x;
        nav.y = center.y;
        nav.state = state;
        nav.floorId = group.floorId;
        nav.roomIds = roomIds;
        peoplePointIndex_[idx] = static_cast<int>(points_.size());
        points_.push_back(nav);

        ridMapping_.push_back(group.id);
        nonRoomCount_++;
        appendedPeopleCount_++;
    }

    matrixRoomToExit_.assign(appendedRoomsCount_ + appendedPeopleCount_,
                             std::vector<int>(exits_.size(), MAXLEN));
    reachable_.assign(points_.size(), false);
}

double NavGrid::distance(const NavPointC& a, const NavPointC& b) {
    return hypotDistance(toPoint(a), toPoint(b));
}

double NavGrid::distance(const Point2D& a, const Point2D& b) {
    return hypotDistance(a, b);
}

bool NavGrid::isPointOnSegment(const Point2D& p1, const Point2D& p2, const Point2D& q) {
    return std::abs(cross(p1, p2, q)) < kEpsilon &&
           q.x >= std::min(p1.x, p2.x) - kEpsilon && q.x <= std::max(p1.x, p2.x) + kEpsilon &&
           q.y >= std::min(p1.y, p2.y) - kEpsilon && q.y <= std::max(p1.y, p2.y) + kEpsilon;
}

bool NavGrid::isPointInPolygon(const std::vector<Point2D>& polygon, const Point2D& p) {
    if (polygon.size() < 3) return false;
    int intersectCount = 0;
    for (size_t i = 0; i < polygon.size(); ++i) {
        const Point2D& p1 = polygon[i];
        const Point2D& p2 = polygon[(i + 1) % polygon.size()];
        if (isPointOnSegment(p1, p2, p)) {
            return true;
        }
        bool condY = (p1.y < p.y && p2.y >= p.y) || (p2.y < p.y && p1.y >= p.y);
        if (condY) {
            double x = (p.y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y + kEpsilon) + p1.x;
            if (x > p.x) {
                intersectCount++;
            }
        }
    }
    return intersectCount % 2 == 1;
}

bool NavGrid::isIntersectWithObs(int ai, int bi) const {
    if (ai == bi || ai < 0 || bi < 0 || ai >= static_cast<int>(vertices_.size()) || bi >= static_cast<int>(vertices_.size())) {
        return false;
    }
    return isIntersectWithObs(toPoint(vertices_[ai]), toPoint(vertices_[bi]));
}

bool NavGrid::isIntersectWithObs(const Point2D& a, const Point2D& b) const {
    for (const auto& obs : obstacles_) {
        Point2D o1{obs.x1, obs.y1};
        Point2D o2{obs.x2, obs.y2};
        if (segmentsIntersect(a, b, o1, o2)) {
            return true;
        }
    }
    return false;
}

bool NavGrid::isIntersectWithRoom(const Point2D& a, const Point2D& b, const std::vector<int>& roomIds) const {
    std::unordered_set<int> allowed(roomIds.begin(), roomIds.end());
    for (size_t idx = 0; idx < rooms_.size(); ++idx) {
        if (allowed.find(static_cast<int>(idx)) != allowed.end()) {
            continue;
        }
        const auto& room = rooms_[idx];
        if (room.walls.size() < 2) {
            continue;
        }
        std::vector<Point2D> filtered;
        filtered.reserve(room.walls.size());
        for (const auto& wall : room.walls) {
            if (wall.x > MIN_POS) {
                filtered.push_back(wall);
            }
        }
        if (filtered.size() < 2) continue;
        for (size_t j = 0; j + 1 < filtered.size(); ++j) {
            if (segmentsIntersect(a, b, filtered[j], filtered[j + 1])) {
                return true;
            }
        }
    }
    return false;
}

int NavGrid::minDistance(const std::vector<int>& distances, const std::vector<bool>& visited) const {
    int minDist = MAXLEN;
    int minIndex = -1;
    for (int v = 0; v < static_cast<int>(distances.size()); ++v) {
        if (!visited[v] && distances[v] <= minDist) {
            minDist = distances[v];
            minIndex = v;
        }
    }
    return minIndex;
}

void NavGrid::generateGraph() {
    vertexIds_.clear();
    vertices_.clear();
    pointToVertexIndex_.clear();

    vertexIds_.reserve(points_.size());
    vertices_.reserve(points_.size() + exits_.size());
    pointToVertexIndex_.assign(points_.size(), -1);

    for (int i = 0; i < static_cast<int>(points_.size()); ++i) {
        vertexIds_.push_back(i);
        pointToVertexIndex_[i] = static_cast<int>(vertices_.size());
        vertices_.push_back(points_[i]);
    }

    for (const auto& exit : exits_) {
        NavPointC nav{};
        nav.x = exit.cx;
        nav.y = exit.cy;
        nav.state = 1;
        nav.floorId = exit.floorId;
        vertices_.push_back(nav);
    }

    int n = static_cast<int>(vertices_.size());
    matrix_.assign(n, std::vector<int>(n, MAXLEN));

    for (int i = 0; i < n; ++i) {
        matrix_[i][i] = 0;
        for (int j = i + 1; j < n; ++j) {
            if (isIntersectWithObs(toPoint(vertices_[i]), toPoint(vertices_[j]))) {
                matrix_[i][j] = MAXLEN;
            } else {
                matrix_[i][j] = static_cast<int>(std::floor(distance(vertices_[i], vertices_[j])));
            }
            if (i >= n - static_cast<int>(exits_.size())) {
                matrix_[i][j] = MAXLEN;
            }
            matrix_[j][i] = matrix_[i][j];
        }
    }

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (i == j) continue;
            const auto& from = vertices_[i];
            const auto& to = vertices_[j];

            if (from.state == 1 && to.state == 0) {
                matrix_[j][i] = MAXLEN;
            }

            if (from.state == 0 && to.state == 0) {
                bool hasIntersection = false;
                for (int rid : from.roomIds) {
                    if (std::find(to.roomIds.begin(), to.roomIds.end(), rid) != to.roomIds.end()) {
                        hasIntersection = true;
                        break;
                    }
                }
                if (!hasIntersection) {
                    matrix_[j][i] = MAXLEN;
                }
            }

            if (isIntersectWithRoom(toPoint(from), toPoint(to), from.roomIds)) {
                matrix_[j][i] = MAXLEN;
            }
        }
    }

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (i == j) {
                continue;
            }
            if (vertices_[i].floorId != vertices_[j].floorId) {
                matrix_[i][j] = MAXLEN;
            }
        }
    }

    // Add teleportation edges between same-numbered exits on adjacent floors
    int exitStartIdx = n - static_cast<int>(exits_.size());
    for (int i = exitStartIdx; i < n; ++i) {
        for (int j = exitStartIdx; j < n; ++j) {
            if (i == j) continue;

            const ExitC& exit1 = exits_[i - exitStartIdx];
            const ExitC& exit2 = exits_[j - exitStartIdx];

            // Parse exit1 name to get floor, assemblyNum, and teleportTarget
            int floor1 = 0, num1 = 0;
            std::string target1;
            parseExitKey(exit1.name, floor1, num1, target1);

            // Must have a teleport target to be a source
            if (target1.empty()) continue;

            // Calculate next floor toward F1
            int nextFloor = (floor1 > 0) ? floor1 - 1 : (floor1 < 0 ? floor1 + 1 : 0);

            // Check if exit2 is on the target floor with same assembly number
            if (exit2.floorId != nextFloor) continue;

            int floor2 = 0, num2 = 0;
            std::string target2;
            parseExitKey(exit2.name, floor2, num2, target2);

            if (num1 == num2) {
                matrix_[i][j] = 1;  // Teleportation edge with minimal weight
            }
        }
    }
}

// Helper to parse exit key like "-1-1-F1" or "0-2-F2"
void NavGrid::parseExitKey(const std::string& name, int& floor, int& assemblyNum, std::string& teleportTarget) {
    floor = 0;
    assemblyNum = 0;
    teleportTarget.clear();
    if (name.empty()) return;

    std::vector<std::string> parts;
    std::stringstream ss(name);
    std::string item;
    while (std::getline(ss, item, '-')) {
        parts.push_back(item);
    }

    if (parts.size() >= 2) {
        floor = std::atoi(parts[0].c_str());
        assemblyNum = std::atoi(parts[1].c_str());
        if (parts.size() >= 3) {
            teleportTarget = parts[2];
        }
    } else {
        // Single number format
        assemblyNum = std::atoi(name.c_str());
    }
}

void NavGrid::dijkstra(int n, int source, int exitIndex,
                       std::vector<std::vector<int>>& paths,
                       std::vector<int>& distances) {
    paths.assign(n, std::vector<int>());
    distances.assign(n, MAXLEN);
    std::vector<bool> visited(n, false);

    distances[source] = 0;

    for (int iter = 0; iter < n; ++iter) {
        int u = minDistance(distances, visited);
        if (u < 0) break;
        visited[u] = true;

        for (int v = 0; v < n; ++v) {
            if (!visited[v] && matrix_[u][v] != MAXLEN) {
                int alt = distances[u] + matrix_[u][v];
                if (alt < distances[v]) {
                    distances[v] = alt;
                    paths[v] = paths[u];
                    paths[v].push_back(u);
                }
            }
        }
    }

    for (int i = 0; i < n; ++i) {
        if (i != source) {
            paths[i].push_back(i);
        }
    }

    int appendedStart = static_cast<int>(vertexIds_.size()) - appendedRoomsCount_ - appendedPeopleCount_;
    for (int row = 0; row < appendedRoomsCount_ + appendedPeopleCount_; ++row) {
        int pointIdx = appendedStart + row;
        if (pointIdx >= 0 && pointIdx < static_cast<int>(vertexIds_.size())) {
            matrixRoomToExit_[row][exitIndex] = distances[pointIdx];
        }
    }
}

bool NavGrid::canReachDirectly(const NavPointC& from, const NavPointC& to) const {
    if (from.state == 1 && to.state == 0) {
        return false;
    }

    Point2D a{from.x, from.y};
    Point2D b{to.x, to.y};

    for (const auto& obs : obstacles_) {
        Point2D o1{obs.x1, obs.y1};
        Point2D o2{obs.x2, obs.y2};
        if (segmentsIntersect(a, b, o1, o2)) {
            return false;
        }
    }

    return true;
}

std::vector<std::map<std::string, int>> NavGrid::generateLines() {
    for (size_t i = 0; i < points_.size(); ++i) {
        const auto& point = points_[i];
        reachable_[i] = false;
        for (const auto& exit : exits_) {
            NavPointC exitPoint{};
            exitPoint.x = exit.cx;
            exitPoint.y = exit.cy;
            exitPoint.state = 1;
            if (canReachDirectly(point, exitPoint)) {
                reachable_[i] = true;
                break;
            }
        }
    }

    generateGraph();

    for (size_t k = 0; k < points_.size(); ++k) {
        for (size_t i = 0; i < points_.size(); ++i) {
            if (std::find(removeRoomIndices_.begin(), removeRoomIndices_.end(), static_cast<int>(i)) != removeRoomIndices_.end()) {
                continue;
            }
            if (reachable_[i]) {
                continue;
            }
            for (size_t j = 0; j < points_.size(); ++j) {
                if (i == j) continue;
                if (reachable_[j] && canReachDirectly(points_[i], points_[j])) {
                    reachable_[i] = true;
                    break;
                }
            }
        }
    }

    int exitsCount = static_cast<int>(exits_.size());
    int logicalVertexCount = static_cast<int>(vertexIds_.size());
    int matrixSize = static_cast<int>(matrix_.size());

    if (matrixSize == 0) {
        return {};
    }

    minDistancesExit_.assign(exitsCount, std::vector<int>(logicalVertexCount, MAXLEN));
    pathToAllExit_.assign(exitsCount, std::vector<std::vector<int>>(logicalVertexCount));

    update_ = false;
    pathToExit_.clear();
    minDistances_.clear();
    destination_.clear();

    for (int exitIndex = 0; exitIndex < exitsCount; ++exitIndex) {
        std::vector<std::vector<int>> paths;
        std::vector<int> distances;
        int source = logicalVertexCount + exitIndex;
        dijkstra(matrixSize, source, exitIndex, paths, distances);

        for (int v = 0; v < logicalVertexCount; ++v) {
            minDistancesExit_[exitIndex][v] = distances[v];
            pathToAllExit_[exitIndex][v] = paths[v];
        }

        if (!update_) {
            minDistances_.assign(distances.begin(), distances.begin() + logicalVertexCount);
            pathToExit_.assign(paths.begin(), paths.begin() + logicalVertexCount);
            destination_.assign(logicalVertexCount, exitIndex);
            update_ = true;
        } else {
            for (int v = 0; v < logicalVertexCount; ++v) {
                if (distances[v] < minDistances_[v]) {
                    minDistances_[v] = distances[v];
                    pathToExit_[v] = paths[v];
                    destination_[v] = exitIndex;
                }
            }
        }
    }

    std::vector<std::vector<bool>> line(matrixSize, std::vector<bool>(matrixSize, false));
    for (int v = 0; v < logicalVertexCount; ++v) {
        const auto& path = pathToExit_[v];
        for (size_t idx = 1; idx < path.size(); ++idx) {
            int a = path[idx - 1];
            int b = path[idx];
            if (a >= 0 && a < matrixSize && b >= 0 && b < matrixSize) {
                line[a][b] = true;
                line[b][a] = true;
            }
        }
    }

    std::vector<std::pair<int, int>> edges;
    int cutoff = logicalVertexCount - appendedRoomsCount_ - appendedPeopleCount_;
    cutoff = std::max(0, cutoff);
    for (int i = 0; i < cutoff; ++i) {
        for (int j = i + 1; j < cutoff; ++j) {
            if (line[i][j] || line[j][i]) {
                edges.emplace_back(vertexIds_[i], vertexIds_[j]);
            }
        }
    }

    simplifyLines(edges);

    std::vector<std::map<std::string, int>> result;
    result.reserve(edges.size());
    for (const auto& [a, b] : edges) {
        std::map<std::string, int> edge;
        edge["a"] = a;
        edge["b"] = b;
        result.push_back(std::move(edge));
    }

    return result;
}

std::vector<std::pair<double, double>> NavGrid::getWaypointCoordinates(int exitId, int startVertexIndex) const {
    std::vector<std::pair<double, double>> coordinates;
    if (pathToAllExit_.empty()) {
        return coordinates;
    }

    int exitIndex = resolveExitIndex(exitId);
    if (exitIndex < 0 || exitIndex >= static_cast<int>(pathToAllExit_.size())) {
        return coordinates;
    }

    const auto& exitPaths = pathToAllExit_[exitIndex];
    if (exitPaths.empty()) {
        return coordinates;
    }

    int lookupIndex = startVertexIndex;
    if (lookupIndex < 0 || lookupIndex >= static_cast<int>(exitPaths.size())) {
        if (startVertexIndex >= 0 && startVertexIndex < static_cast<int>(pointToVertexIndex_.size())) {
            int candidate = pointToVertexIndex_[startVertexIndex];
            if (candidate >= 0 && candidate < static_cast<int>(exitPaths.size())) {
                lookupIndex = candidate;
            }
        }
        if (lookupIndex < 0 || lookupIndex >= static_cast<int>(exitPaths.size())) {
            auto it = std::find(vertexIds_.begin(), vertexIds_.end(), startVertexIndex);
            if (it != vertexIds_.end()) {
                lookupIndex = static_cast<int>(std::distance(vertexIds_.begin(), it));
            }
        }
    }

    if (lookupIndex < 0 || lookupIndex >= static_cast<int>(exitPaths.size())) {
        return coordinates;
    }

    const auto& path = exitPaths[lookupIndex];
    if (path.size() <= 1) {
        return coordinates;
    }

    for (int idx = static_cast<int>(path.size()) - 2; idx >= 0; --idx) {
        int graphIdx = path[idx];
        if (graphIdx >= static_cast<int>(vertexIds_.size())) {
            int exitIndex = graphIdx - static_cast<int>(vertexIds_.size());
            if (exitIndex >= 0 && exitIndex < static_cast<int>(exits_.size())) {
                coordinates.emplace_back(exits_[exitIndex].cx, exits_[exitIndex].cy);
            }
        } else if (graphIdx >= 0 && graphIdx < static_cast<int>(vertexIds_.size())) {
            int pointIdx = vertexIds_[graphIdx];
            if (pointIdx >= 0 && pointIdx < static_cast<int>(points_.size())) {
                coordinates.emplace_back(points_[pointIdx].x, points_[pointIdx].y);
            }
        }
    }

    return coordinates;
}

std::pair<double, double> NavGrid::getExitCenter(int exitId) const {
    int index = resolveExitIndex(exitId);
    if (index < 0 || index >= static_cast<int>(exits_.size())) {
        return {0.0, 0.0};
    }
    return {exits_[index].cx, exits_[index].cy};
}

int NavGrid::findClosestGraphVertex(double x, double y, bool onlyReachable) const {
    auto search = [&](bool requireReachable) {
        double bestDist = std::numeric_limits<double>::max();
        int bestIndex = -1;
        for (int graphIdx = 0; graphIdx < static_cast<int>(vertexIds_.size()); ++graphIdx) {
            int pointIdx = vertexIds_[graphIdx];
            if (pointIdx < 0 || pointIdx >= static_cast<int>(points_.size())) {
                continue;
            }
            if (requireReachable) {
                if (pointIdx < 0 || pointIdx >= static_cast<int>(reachable_.size()) || !reachable_[pointIdx]) {
                    continue;
                }
            }
            const auto& pt = points_[pointIdx];
            double dx = pt.x - x;
            double dy = pt.y - y;
            double dist = std::hypot(dx, dy);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = graphIdx;
            }
        }
        return bestIndex;
    };

    int idx = search(onlyReachable);
    if (idx >= 0 || !onlyReachable) {
        return idx;
    }
    return search(false);
}

bool NavGrid::hasEdge(const std::vector<std::pair<int, int>>& edges, int a, int b) const {
    for (const auto& edge : edges) {
        if ((edge.first == a && edge.second == b) || (edge.first == b && edge.second == a)) {
            return true;
        }
    }
    return false;
}

bool NavGrid::isGreater45(const std::vector<std::pair<int, int>>& edges, size_t idxA, size_t idxB) const {
    if (idxA >= edges.size() || idxB >= edges.size()) {
        return false;
    }

    int samePoint = -1;
    int a = -1;
    int b = -1;

    auto lineA = edges[idxA];
    auto lineB = edges[idxB];

    if (lineA.first == lineB.first) {
        samePoint = lineA.first;
        a = lineA.second;
        b = lineB.second;
    } else if (lineA.first == lineB.second) {
        samePoint = lineA.first;
        a = lineA.second;
        b = lineB.first;
    } else if (lineA.second == lineB.first) {
        samePoint = lineA.second;
        a = lineA.first;
        b = lineB.second;
    } else if (lineA.second == lineB.second) {
        samePoint = lineA.second;
        a = lineA.first;
        b = lineB.first;
    } else {
        return false;
    }

    if (samePoint < 0 || a < 0 || b < 0 ||
        samePoint >= static_cast<int>(points_.size()) ||
        a >= static_cast<int>(points_.size()) ||
        b >= static_cast<int>(points_.size())) {
        return false;
    }

    Point2D origin = toPoint(points_[samePoint]);
    Point2D pa = toPoint(points_[a]);
    Point2D pb = toPoint(points_[b]);

    double x1 = pa.x - origin.x;
    double y1 = pa.y - origin.y;
    double x2 = pb.x - origin.x;
    double y2 = pb.y - origin.y;

    double dotProduct = x1 * x2 + y1 * y2;
    double module = std::sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2));
    if (module < kEpsilon) {
        return false;
    }
    double cosValue = dotProduct / module;
    return cosValue < 0.707;
}

void NavGrid::simplifyLines(std::vector<std::pair<int, int>>& edges) const {
    for (size_t i = 0; i < edges.size(); ++i) {
        size_t j = 0;
        while (j < edges.size()) {
            if (i == j) {
                ++j;
                continue;
            }

            int samePoint = -1;
            int a = -1;
            int b = -1;

            auto lineA = edges[i];
            auto lineB = edges[j];

            if (lineA.first == lineB.first) {
                samePoint = lineA.first;
                a = lineA.second;
                b = lineB.second;
            } else if (lineA.first == lineB.second) {
                samePoint = lineA.first;
                a = lineA.second;
                b = lineB.first;
            } else if (lineA.second == lineB.first) {
                samePoint = lineA.second;
                a = lineA.first;
                b = lineB.second;
            } else if (lineA.second == lineB.second) {
                samePoint = lineA.second;
                a = lineA.first;
                b = lineB.first;
            } else {
                ++j;
                continue;
            }

            if (samePoint < 0 || a < 0 || b < 0 ||
                samePoint >= static_cast<int>(points_.size()) ||
                a >= static_cast<int>(points_.size()) ||
                b >= static_cast<int>(points_.size())) {
                ++j;
                continue;
            }

            if (!isIntersectWithObs(toPoint(points_[a]), toPoint(points_[b])) &&
                !isGreater45(edges, i, j)) {
                if (!hasEdge(edges, a, b)) {
                    edges.emplace_back(a, b);
                }

                double len1 = distance(points_[a], points_[samePoint]);
                double len2 = distance(points_[b], points_[samePoint]);
                if (len1 >= len2) {
                    edges.erase(edges.begin() + static_cast<std::ptrdiff_t>(i));
                    if (i > 0) {
                        --i;
                    }
                    j = 0;
                } else {
                    edges.erase(edges.begin() + static_cast<std::ptrdiff_t>(j));
                    if (j > 0) {
                        --j;
                    }
                }
            } else {
                ++j;
            }
        }
    }
}

int NavGrid::resolveExitIndex(int exitId) const {
    for (size_t idx = 0; idx < exits_.size(); ++idx) {
        if (exits_[idx].id == exitId) {
            return static_cast<int>(idx);
        }
    }
    if (exitId >= 0 && exitId < static_cast<int>(exits_.size())) {
        return exitId;
    }
    return -1;
}

} // namespace rvocpp
