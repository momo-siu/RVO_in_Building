package com.rvo.rvoserver.server.impl;

import com.rvo.rvoserver.Mapper.BlueprintMapper;
import com.rvo.rvoserver.pojo.Agent;
import com.rvo.rvoserver.pojo.Exit;
import com.rvo.rvoserver.pojo.NavGrid;
import com.rvo.rvoserver.pojo.Obstacle;
import com.rvo.rvoserver.pojo.Pos;
import com.rvo.rvoserver.server.CppRvoCaller;
import com.rvo.rvoserver.server.RvoServer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RvoServerC is now a thin adapter that forwards all evacuation simulations to the C++
 * implementation. The legacy Java simulation code has been removed to avoid divergence.
 */
@Component
public class RvoServerC implements RvoServer {

    public static volatile int mutex = 0;
    public static volatile boolean stop = false;

    private volatile boolean running = false;

    @Autowired
    private BlueprintMapper blueprintMapper;

    @Autowired(required = false)
    private CppRvoCaller cppRvoCaller;

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

        if (cppRvoCaller == null) {
            throw new IllegalStateException("CppRvoCaller bean is not initialized. Please ensure the C++ simulator is configured.");
        }

        mutex = 1;
        running = true;
        stop = false;
        blueprintMapper.setSchedule(bID, 0);

        Map<String, Object> inputData = prepareInputDataForCpp(
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

        boolean success = cppRvoCaller.callCppSimulator(bID, inputData, fileName);

        try {
            if (!success) {
                blueprintMapper.setSchedule(bID, 0);
                throw new IOException("C++ RVO simulator failed. Please check cpp_error.log for details.");
            }

            blueprintMapper.setSchedule(bID, 600);
        } finally {
            mutex = 0;
            running = false;
        }
    }

    private Map<String, Object> prepareInputDataForCpp(int bID,
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
        Map<String, Object> inputData = new HashMap<>();

        inputData.put("bID", bID);
        inputData.put("scale", scale);
        inputData.put("status", status);
        inputData.put("weight", weight);
        inputData.put("k", k);
        inputData.put("fileName", fileName);
        inputData.put("imgX0", imgX0);
        inputData.put("imgY0", imgY0);
        inputData.put("sT", sT);

        List<Map<String, Object>> agentsList = new ArrayList<>();
        for (Agent agent : agents) {
            Map<String, Object> agentMap = new HashMap<>();
            agentMap.put("id", agent.getId());
            agentMap.put("x", agent.getPos().getX());
            agentMap.put("y", agent.getPos().getY());
            agentMap.put("velocity", agent.getVel());
            agentMap.put("startTime", agent.getSTime());
            agentMap.put("exitId", agent.getExitId());
            agentMap.put("roomIds", new ArrayList<>(agent.getRoom_id()));
            if (agent.getGraphNodeIndex() != null) {
                agentMap.put("graphNodeIndex", agent.getGraphNodeIndex());
            }
            if (agent.getWaypointXs() != null && !agent.getWaypointXs().isEmpty()) {
                agentMap.put("waypointXs", new ArrayList<>(agent.getWaypointXs()));
            }
            if (agent.getWaypointYs() != null && !agent.getWaypointYs().isEmpty()) {
                agentMap.put("waypointYs", new ArrayList<>(agent.getWaypointYs()));
            }
            agentsList.add(agentMap);
        }
        inputData.put("agents", agentsList);

        List<Map<String, Object>> obstacleList = new ArrayList<>();
        for (Obstacle obstacle : obstacles) {
            Map<String, Object> obstacleMap = new HashMap<>();
            obstacleMap.put("id", obstacle.getId());
            obstacleMap.put("x1", obstacle.getA().getX());
            obstacleMap.put("y1", obstacle.getA().getY());
            obstacleMap.put("x2", obstacle.getB().getX());
            obstacleMap.put("y2", obstacle.getB().getY());
            obstacleList.add(obstacleMap);
        }
        inputData.put("obstacles", obstacleList);

        List<Map<String, Object>> exitList = new ArrayList<>();
        for (Exit exit : exits) {
            Map<String, Object> exitMap = new HashMap<>();
            exitMap.put("id", exit.getId());
            exitMap.put("x0", exit.getLt().getX());
            exitMap.put("y0", exit.getLt().getY());
            exitMap.put("x1", exit.getRd().getX());
            exitMap.put("y1", exit.getRd().getY());
            exitMap.put("capacity", exit.getNumOfPerson());
            exitMap.put("name", exit.getExitName());
            exitList.add(exitMap);
        }
        inputData.put("exits", exitList);

        List<Map<String, Object>> navPointList = new ArrayList<>();
        for (Pos navPoint : navPoints) {
            Map<String, Object> navMap = new HashMap<>();
            navMap.put("x", navPoint.getX());
            navMap.put("y", navPoint.getY());
            navMap.put("state", navPoint.getState());
            navMap.put("roomIds", new ArrayList<>(navPoint.getRoom_id()));
            navPointList.add(navMap);
        }
        inputData.put("navPoints", navPointList);

        inputData.put("rooms", rooms);
        inputData.put("peos", peosList);

        return inputData;
    }
}

