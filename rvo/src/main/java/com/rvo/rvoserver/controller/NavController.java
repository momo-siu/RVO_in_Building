package com.rvo.rvoserver.controller;

import com.rvo.rvoserver.pojo.*;
import com.rvo.rvoserver.utils.AssemblyExitId;
import org.apache.commons.math3.analysis.function.Max;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class NavController {

    @PostMapping("/getLines")
    public Result getLines(@RequestBody Map request) {
        List<HashMap> navPos = (List<HashMap>) request.get("navPos"); //导航坐标点
        List<HashMap> exitLists = (List<HashMap>) request.get("exit"); //出口顶点坐标
//        List<List<HashMap>> obstacleArr = (List<List<HashMap>>) request.get("wallArr"); //墙顶点坐标
        List<HashMap> rooms = (List<HashMap>) request.get("rooms");
        List<HashMap> peosList = (List<HashMap>) request.get("peos");
        if(exitLists.size() == 0) { return Result.error("未设置出口"); }
        if(navPos.size() == 0) { return Result.error("未设置导航点"); }

        List<Pos> points = new ArrayList<>();
        for (int i = 0; i < navPos.size(); i++) {
            int state = 1;
            int navFloorId = navPos.get(i).get("floorId") != null
                    ? ((Number) navPos.get(i).get("floorId")).intValue() : 0;
            ArrayList<Integer> room_id = new ArrayList<>();
            Pos temp1 = new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue());
            temp1.setFloorId(navFloorId);
            for(int j = 0; j < rooms.size();j++){
                List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                ArrayList<Pos> temp_points = new ArrayList<Pos>();
                for(int k = 0; k < walls.size(); k++) {
                    if(((Number) walls.get(k).get("x")).doubleValue() > -10000){
                        Pos temp = new Pos(((Number)walls.get(k).get("x")).doubleValue(),((Number)walls.get(k).get("y")).doubleValue());
                        temp_points.add(temp);
                    }
                }
                if (NavGrid.isPointInPolygon(temp_points,temp1)){
                    state = 0;
                    room_id.add(j);
                }
            }
            Pos navP = new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue(), state, room_id);
            navP.setFloorId(navFloorId);
            points.add(navP);
        }

        List<Obstacle> obstacles = new ArrayList<>();
//        for (int i = 0; i < obstacleArr.size(); i++) {
//            for (int j = 0; j < obstacleArr.get(i).size() - 1; j++) {
//                Pos A = new Pos(((Number) obstacleArr.get(i).get(j).get("x")).doubleValue(), ((Number) obstacleArr.get(i).get(j).get("y")).doubleValue());
//                Pos B = new Pos(((Number) obstacleArr.get(i).get(j + 1).get("x")).doubleValue(), ((Number) obstacleArr.get(i).get(j + 1).get("y")).doubleValue());
//                obstacles.add(new Obstacle(i, A, B));
//            }
//        }
        //房间
        for(int i = 0; i < rooms.size(); i++) {
            List<HashMap> walls = (List<HashMap>) rooms.get(i).get("walls");
            for(int j = 0; j < walls.size() - 1; j++) {
                Pos A = new Pos(((Number) walls.get(j).get("x")).doubleValue(), ((Number) walls.get(j).get("y")).doubleValue());
                Pos B = new Pos(((Number) walls.get(j + 1).get("x")).doubleValue(), ((Number) walls.get(j + 1).get("y")).doubleValue());
                if((A.getX() < -9999 && A.getY() < -9999) || (B.getX() < -9999 && B.getY() < -9999)) { continue; }
                obstacles.add(new Obstacle(obstacles.size() + 1, A, B));
            }
        }
        List<Exit> exitsRaw = new ArrayList<>();
        for(int i = 0; i < exitLists.size(); i++) {
            Pos exitA = new Pos(((Number) exitLists.get(i).get("x0")).doubleValue(), ((Number) exitLists.get(i).get("y0")).doubleValue());
            Pos exitB = new Pos(((Number) exitLists.get(i).get("x1")).doubleValue(), ((Number) exitLists.get(i).get("y2")).doubleValue());
            String exitKey = exitLists.get(i).get("id") != null ? exitLists.get(i).get("id").toString().trim() : "";
            AssemblyExitId parsed = AssemblyExitId.parse(exitKey);
            int exitFloorId = exitLists.get(i).get("floorId") != null
                    ? ((Number) exitLists.get(i).get("floorId")).intValue() : parsed.floorInKey;
            if (parsed.floorInKey != 0) {
                exitFloorId = parsed.floorInKey;
            }
            exitA.setFloorId(exitFloorId);
            exitB.setFloorId(exitFloorId);
            int numOfPerson = ((Number) exitLists.get(i).get("peoNum")).intValue();
            String exitName = (String)  exitLists.get(i).get("name");
            exitsRaw.add(new Exit((long) i, exitKey, exitA, exitB, numOfPerson, exitName));
        }
        List<Exit> exits = new ArrayList<>();
        for (Exit e : exitsRaw) {
            int ef = e.getLt() != null ? e.getLt().getFloorId() : 0;
            AssemblyExitId parsed = AssemblyExitId.parse(e.getExitKey());
            // 只要是合法集合点，就参与导航图构建
            if (AssemblyExitId.isUsableAsGraphNode(ef, parsed)) {
                exits.add(e);
            }
        }
        if (exits.isEmpty()) {
            return Result.error("没有可用于疏散的集合点（非首层集合点需填写传送目标）");
        }
        int out_num = 0;
        for (Exit e : exits) {
            out_num += e.getNumOfPerson();
        }
        for (int ei = 0; ei < exits.size(); ei++) {
            exits.get(ei).setId((long) ei);
        }

        Map<Integer, Integer> peoplePerFloor = new HashMap<>();
        for (int ri = 0; ri < rooms.size(); ri++) {
            int fid = rooms.get(ri).get("floorId") != null
                    ? ((Number) rooms.get(ri).get("floorId")).intValue() : 0;
            List<HashMap> peos = (List<HashMap>) rooms.get(ri).get("peos");
            int n = peos != null ? peos.size() : 0;
            if (n > 0) {
                peoplePerFloor.merge(fid, n, Integer::sum);
            }
        }
        for (int pi = 0; pi < peosList.size(); pi++) {
            int fid = peosList.get(pi).get("floorId") != null
                    ? ((Number) peosList.get(pi).get("floorId")).intValue() : 0;
            List<HashMap> peos = (List<HashMap>) peosList.get(pi).get("peos");
            int n = peos != null ? peos.size() : 0;
            if (n > 0) {
                peoplePerFloor.merge(fid, n, Integer::sum);
            }
        }
        for (Map.Entry<Integer, Integer> pe : peoplePerFloor.entrySet()) {
            if (pe.getKey() == 0 || pe.getValue() == null || pe.getValue() <= 0) {
                continue;
            }
            boolean hasExitOnFloor = false;
            for (Exit ex : exits) {
                int ef = ex.getLt() != null ? ex.getLt().getFloorId() : 0;
                if (ef == pe.getKey()) {
                    hasExitOnFloor = true;
                    break;
                }
            }
            if (!hasExitOnFloor) {
                String floorName = pe.getKey() > 0 ? "F" + (pe.getKey() + 1) : "B" + Math.abs(pe.getKey());
                return Result.error("楼层 " + floorName + " 有人员但无可用集合点（请为非首层配置带传送目标的集合点）");
            }
        }

        NavGrid navGrid = new NavGrid(points, obstacles, exits,rooms, peosList);
        if(!navGrid.isReached()) { return Result.error("导航点无法到达出口"); }
        List<Map<String, Integer>> lines;
        try {
            lines = navGrid.generateLines();
        } catch (IOException e) {
            return Result.error("路径生成失败：" + e.getMessage());
        }
        int rid=navGrid.anyOneCanReached();
        if(rid > 0) {
                return Result.error("房间"+ rid + "的人无法到达所有出口");
        }
        // 判断出口容量是否能接纳所有人
        int num = 0;
        for(int i = 0; i < rooms.size(); i++) {
            List<HashMap> peos = (List<HashMap>) rooms.get(i).get("peos");
            num += peos.size();
        }
        for(int i = 0; i < peosList.size(); i++) {
            List<HashMap> peos = (List<HashMap>) peosList.get(i).get("peos");
            num += peos.size();
        }

        //判断所有人能否到出口
        Map<String, Object> res = new HashMap<>();
        boolean can = true;
        if (out_num < num){
            return Result.error("集合点无法接纳容纳所有人");
        }

        for(int i = 0; i < rooms.size(); i++) {
            List<HashMap> peos = (List<HashMap>) rooms.get(i).get("peos");
            for (int j = 0; j < peos.size(); j++) {
                if(!navGrid.isToExit(new Pos(((Number) peos.get(j).get("x")).doubleValue(), ((Number) peos.get(j).get("y")).doubleValue()))) {
                    can = false;
                    System.out.println(((Number) peos.get(j).get("x")).doubleValue() + " " + ((Number) peos.get(j).get("y")).doubleValue());
                    res.put("message", "\"" + ((HashMap) rooms.get(i).get("attr")).get("name") + "\"(id:" +
                            ((HashMap) rooms.get(i).get("attr")).get("id") + ")房间中的人无法到达出口");
                    break;
                }
            }
            if(!can) { break; }
        }
        for(int i = 0; i < peosList.size(); i++) {
            List<HashMap> peos = (List<HashMap>) peosList.get(i).get("peos");
            for (int j = 0; j < peos.size(); j++) {
                if(!navGrid.isToExit(new Pos(((Number) peos.get(j).get("x")).doubleValue(), ((Number) peos.get(j).get("y")).doubleValue()))) {
                    can = false;
                    System.out.println(((Number) peos.get(j).get("x")).doubleValue() + " " + ((Number) peos.get(j).get("y")).doubleValue());
                    res.put("message", "\"" + ((HashMap) peosList.get(i).get("attr")).get("name") + "\"(id:" +
                            ((HashMap) peosList.get(i).get("attr")).get("id") + ")人口框中的人无法到达出口");
                    break;
                }
            }
            if(!can) { break; }
        }

        res.put("can", can);
        res.put("lines", lines);
        return Result.success(res);
    }

}
