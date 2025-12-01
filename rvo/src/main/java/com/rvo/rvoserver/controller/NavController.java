package com.rvo.rvoserver.controller;

import com.rvo.rvoserver.pojo.*;
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
            ArrayList<Integer> room_id = new ArrayList<>();
            Pos temp1 = new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue());
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
            points.add(new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue(), state, room_id));
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
        List<Exit> exits = new ArrayList<>();
        int out_num = 0;
        for(int i = 0; i < exitLists.size(); i++) {
            Pos exitA = new Pos(((Number) exitLists.get(i).get("x0")).doubleValue(), ((Number) exitLists.get(i).get("y0")).doubleValue());
            Pos exitB = new Pos(((Number) exitLists.get(i).get("x1")).doubleValue(), ((Number) exitLists.get(i).get("y2")).doubleValue());
            int numOfPerson = ((Number) exitLists.get(i).get("peoNum")).intValue();
            String exitName = (String)  exitLists.get(i).get("name");
            Exit exit = new Exit((long) i, exitA, exitB, numOfPerson,exitName);
            exits.add(exit);
            out_num += Integer.parseInt(exitLists.get(i).get("peoNum").toString());
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
