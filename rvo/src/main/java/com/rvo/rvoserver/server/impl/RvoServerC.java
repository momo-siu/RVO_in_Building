package com.rvo.rvoserver.server.impl;

import com.rvo.rvoserver.Mapper.BlueprintMapper;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativeAgent;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativeNavPoint;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativeObstacle;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativePeopleGroup;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativePoint;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativeRoom;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput.NativeSimulationConfig;
import com.rvo.rvoserver.pojo.Agent;
import com.rvo.rvoserver.pojo.Exit;
import com.rvo.rvoserver.pojo.NavGrid;
import com.rvo.rvoserver.pojo.Obstacle;
import com.rvo.rvoserver.pojo.Pos;
import com.rvo.rvoserver.server.JsonServer;
import com.rvo.rvoserver.server.RvoServer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RvoServerC is now a thin adapter that forwards all evacuation simulations to the C++
 * implementation. The legacy Java simulation code has been removed to avoid divergence.
 */
@Slf4j
@Component
public class RvoServerC implements RvoServer {

    public static volatile int mutex = 0;
    public static volatile boolean stop = false;

    private volatile boolean running = false;

    @Autowired
    private BlueprintMapper blueprintMapper;

    @Autowired(required = false)
    private NativeRvoSimulationService nativeRvoSimulationService;

    @Autowired
    private JsonServer jsonServer;

    @Value("${path.projectPath}")
    private String projectPath;

    @Override
    public boolean isOK() {
        return mutex == 0 && !running;
    }

    @Override
    public int getCnt() {
        return 0;
    }

    @Override
    @Async
    @SuppressWarnings({"unchecked", "rawtypes"})
    public void calculatePathWithNav(int bID,
                                     List<Agent> agents,
                                     List<Obstacle> obstacles,
                                     List<Exit> exits,
                                     List<Pos> navPoints,
                                     double scale,
                                     List<HashMap> rooms,
                                     List<HashMap> peosList,
                                     int status,
                                     int weight,
                                     double k,
                                     String fileName,
                                     NavGrid navGrid,
                                     List<Exit> exitsAll,
                                     double imgX0,
                                     double imgY0,
                                     double sT) throws IOException {

        if (nativeRvoSimulationService == null) {
            throw new IllegalStateException("NativeRvoSimulationService bean is not initialized. Please ensure the native simulator is configured.");
        }

        mutex = 1;
        running = true;
        stop = false;
        blueprintMapper.setSchedule(bID, 0);

        NativeSimulationInput inputData = prepareNativeInput(
                bID,
                agents,
                obstacles,
                exits,
                navPoints,
                scale,
                (List<HashMap<String, Object>>) (List<?>) rooms,
                (List<HashMap<String, Object>>) (List<?>) peosList,
                status,
                weight,
                k,
                fileName,
                imgX0,
                imgY0,
                sT
        );

        try {
            boolean success = nativeRvoSimulationService.runSimulation(bID, inputData, fileName);
            if (!success) {
                blueprintMapper.setSchedule(bID, 0);
                throw new IOException("C++ RVO simulator failed. Please check cpp_error.log for details.");
            }

            String effectiveFileName = (fileName == null || fileName.isEmpty()) ? "default" : fileName;
            Path outputDir = Paths.get(projectPath, "rvo", "source", String.valueOf(bID), effectiveFileName);
            new LegacyResultWriter().writeLegacyArtifacts(outputDir);
            jsonServer.toJsonFile(bID, status, effectiveFileName, imgX0, imgY0, sT);

            blueprintMapper.setSchedule(bID, 600);
        } finally {
            mutex = 0;
            running = false;
        }
    }

    private NativeSimulationInput prepareNativeInput(int bID,
                                                     List<Agent> agents,
                                                     List<Obstacle> obstacles,
                                                     List<Exit> exits,
                                                     List<Pos> navPoints,
                                                     double scale,
                                                     List<HashMap<String, Object>> rooms,
                                                     List<HashMap<String, Object>> peosList,
                                                     int status,
                                                     int weight,
                                                     double k,
                                                     String fileName,
                                                     double imgX0,
                                                     double imgY0,
                                                     double sT) {
        NativeSimulationInput input = new NativeSimulationInput();
        NativeSimulationConfig config = input.config;
        config.bID = bID;
        config.scale = scale;
        config.status = status;
        config.weight = weight;
        config.k = k;
        config.fileName = fileName;
        config.imgX0 = imgX0;
        config.imgY0 = imgY0;
        config.sT = sT;

        double minStartTime = Double.POSITIVE_INFINITY;
        double maxStartTime = Double.NEGATIVE_INFINITY;
        int zeroVelocityCount = 0;
        Double sampleVel = null;
        Pos samplePos = null;

        for (Agent agent : agents) {
            NativeAgent nativeAgent = new NativeAgent();
            nativeAgent.id = agent.getId();
            nativeAgent.x = agent.getPos().getX();
            nativeAgent.y = agent.getPos().getY();
            nativeAgent.velocity = agent.getVel();
            nativeAgent.startTime = agent.getSTime();
            nativeAgent.exitId = agent.getExitId();
            minStartTime = Math.min(minStartTime, nativeAgent.startTime);
            maxStartTime = Math.max(maxStartTime, nativeAgent.startTime);
            if (nativeAgent.velocity <= 0.0) {
                zeroVelocityCount++;
            } else if (sampleVel == null) {
                sampleVel = nativeAgent.velocity;
                samplePos = agent.getPos();
            }
            if (agent.getRoom_id() != null) {
                nativeAgent.roomIds.addAll(agent.getRoom_id());
            }
            if (agent.getGraphNodeIndex() != null) {
                nativeAgent.graphNodeIndex = agent.getGraphNodeIndex();
            }
            if (agent.getWaypointXs() != null) {
                nativeAgent.waypointXs.addAll(agent.getWaypointXs());
            }
            if (agent.getWaypointYs() != null) {
                nativeAgent.waypointYs.addAll(agent.getWaypointYs());
            }
            input.agents.add(nativeAgent);
        }

        for (Obstacle obstacle : obstacles) {
            NativeObstacle nativeObstacle = new NativeObstacle();
            nativeObstacle.id = obstacle.getId();
            nativeObstacle.x1 = obstacle.getA().getX();
            nativeObstacle.y1 = obstacle.getA().getY();
            nativeObstacle.x2 = obstacle.getB().getX();
            nativeObstacle.y2 = obstacle.getB().getY();
            input.obstacles.add(nativeObstacle);
        }

        for (Exit exit : exits) {
            NativeSimulationInput.NativeExit nativeExit = new NativeSimulationInput.NativeExit();
            nativeExit.id = exit.getId();
            nativeExit.x0 = exit.getLt().getX();
            nativeExit.y0 = exit.getLt().getY();
            nativeExit.x1 = exit.getRd().getX();
            nativeExit.y1 = exit.getRd().getY();
            nativeExit.capacity = exit.getNumOfPerson();
            nativeExit.name = exit.getExitName();
            input.exits.add(nativeExit);
        }

        for (Pos navPoint : navPoints) {
            NativeNavPoint nativeNavPoint = new NativeNavPoint();
            nativeNavPoint.x = navPoint.getX();
            nativeNavPoint.y = navPoint.getY();
            nativeNavPoint.state = navPoint.getState();
            if (navPoint.getRoom_id() != null) {
                nativeNavPoint.roomIds.addAll(navPoint.getRoom_id());
            }
            input.navPoints.add(nativeNavPoint);
        }

        convertRooms(rooms, input.rooms);
        convertPeopleGroups(peosList, input.peopleGroups);

        log.info("Native input prepared: agents={}, obstacles={}, exits={}, navPoints={}, startTime[min={}, max={}], zeroVelocityCount={}, samplePos={}, sampleVel={}",
                input.agents.size(),
                input.obstacles.size(),
                input.exits.size(),
                input.navPoints.size(),
                minStartTime == Double.POSITIVE_INFINITY ? null : minStartTime,
                maxStartTime == Double.NEGATIVE_INFINITY ? null : maxStartTime,
                zeroVelocityCount,
                samplePos,
                sampleVel);

        return input;
    }

    private void convertRooms(List<HashMap<String, Object>> rooms, List<NativeRoom> target) {
        if (rooms == null) {
            return;
        }
        for (HashMap<String, Object> room : rooms) {
            NativeRoom nativeRoom = new NativeRoom();
            nativeRoom.rid = getInt(room.get("rid"));
            @SuppressWarnings("unchecked")
            List<HashMap<String, Object>> people = (List<HashMap<String, Object>>) room.get("peos");
            nativeRoom.peopleCount = people != null ? people.size() : 0;
            @SuppressWarnings("unchecked")
            List<HashMap<String, Object>> walls = (List<HashMap<String, Object>>) room.get("walls");
            if (walls != null) {
                for (HashMap<String, Object> point : walls) {
                    Double x = toDouble(point.get("x"));
                    Double y = toDouble(point.get("y"));
                    if (x != null && y != null) {
                        nativeRoom.walls.add(new NativePoint(x, y));
                    }
                }
            }
            target.add(nativeRoom);
        }
    }

    private void convertPeopleGroups(List<HashMap<String, Object>> peosList, List<NativePeopleGroup> target) {
        if (peosList == null) {
            return;
        }
        for (HashMap<String, Object> group : peosList) {
            NativePeopleGroup nativeGroup = new NativePeopleGroup();
            Object attrObj = group.get("attr");
            if (attrObj instanceof Map<?, ?> attrMap) {
                nativeGroup.id = getInt(attrMap.get("id"));
            } else {
                nativeGroup.id = getInt(group.get("id"));
            }
            @SuppressWarnings("unchecked")
            List<HashMap<String, Object>> people = (List<HashMap<String, Object>>) group.get("peos");
            nativeGroup.peopleCount = people != null ? people.size() : 0;
            @SuppressWarnings("unchecked")
            List<HashMap<String, Object>> walls = (List<HashMap<String, Object>>) group.get("walls");
            if (walls != null) {
                for (HashMap<String, Object> point : walls) {
                    Double x = toDouble(point.get("x"));
                    Double y = toDouble(point.get("y"));
                    if (x != null && y != null) {
                        nativeGroup.walls.add(new NativePoint(x, y));
                    }
                }
            }
            target.add(nativeGroup);
        }
    }

    private int getInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
            }
        }
        return 0;
    }

    private Double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text) {
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }
}

