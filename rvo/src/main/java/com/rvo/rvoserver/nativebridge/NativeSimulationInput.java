package com.rvo.rvoserver.nativebridge;

import java.util.ArrayList;
import java.util.List;

public class NativeSimulationInput {

    public NativeSimulationConfig config = new NativeSimulationConfig();
    public List<NativeAgent> agents = new ArrayList<>();
    public List<NativeObstacle> obstacles = new ArrayList<>();
    public List<NativeExit> exits = new ArrayList<>();
    public List<NativeNavPoint> navPoints = new ArrayList<>();
    public List<NativeRoom> rooms = new ArrayList<>();
    public List<NativePeopleGroup> peopleGroups = new ArrayList<>();

    public static class NativeSimulationConfig {
        public int bID;
        public double scale;
        public int status;
        public double k;
        public double imgX0;
        public double imgY0;
        public double sT;
        public String fileName;
        public String outputDir;
    }

    public static class NativeAgent {
        public int id;
        public double x;
        public double y;
        public double velocity;
        public double startTime;
        public int exitId;
        public int floorId = 0;
        public int targetFloorId = 0;
        public double transferRemainingTime = 0.0;
        public int graphNodeIndex = -1;
        public List<Integer> roomIds = new ArrayList<>();
        public List<Double> waypointXs = new ArrayList<>();
        public List<Double> waypointYs = new ArrayList<>();
    }

    public static class NativeObstacle {
        public int id;
        public double x1;
        public double y1;
        public double x2;
        public double y2;
        public int floorId = 0;
    }

    public static class NativeExit {
        public long id;
        public double x0;
        public double y0;
        public double x1;
        public double y1;
        public int floorId = 0;
        public int capacity;
        public String name;
    }

    public static class NativeNavPoint {
        public double x;
        public double y;
        public int state;
        public int floorId = 0;
        public int toFloorId = 0;
        public List<Integer> roomIds = new ArrayList<>();
    }

    public static class NativeRoom {
        public int rid;
        public int floorId = 0;
        public int peopleCount;
        public List<NativePoint> walls = new ArrayList<>();
    }

    public static class NativePeopleGroup {
        public int id;
        public int floorId = 0;
        public int peopleCount;
        public List<NativePoint> walls = new ArrayList<>();
    }

    public static class NativePoint {
        public double x;
        public double y;

        public NativePoint() {
        }

        public NativePoint(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }
}
