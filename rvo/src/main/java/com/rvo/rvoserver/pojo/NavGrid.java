package com.rvo.rvoserver.pojo;

import com.rvo.rvoserver.server.JavaPythonCaller;
import com.rvo.rvoserver.server.JsonServer;
import com.rvo.rvoserver.server.impl.JsonServerA;
import com.rvo.rvoserver.utils.AssemblyExitId;
import com.rvo.rvoserver.utils.LineUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import java.awt.geom.Point2D;
import java.io.IOException;
import java.util.*;

public class NavGrid {

    JsonServer jsonServer = new JsonServerA();

    private final int MAXLEN = Integer.MAX_VALUE; //寻路时的最大距离

    final int MinPos = -9999;

    private List<Pos> points; //导航点坐标列表

    private List<Map<String, Integer>> lines; //导航点连线列表

    private List<Exit> exits; //出口集合

    private List<List<Integer>> pathToExit; //路线集合

    private List<List<List<Integer>>> pathToAllExit; // 每个房间到每个出口的路线集合

    private List<Map<Integer, List<Integer>>> pathToAllExitMap;

    private List<Integer> destination; //距离最近出口编号

    private int[][] matrix; //无向图矩阵

    private int[][] matrixRoomToExit; // 房间到出口的权重矩阵

    private List<Integer> minDistances; //最短距离

    private List<List<Integer>> minDistances_exit; //最短距离

    private boolean update = false;

    private boolean[] reachable;

    private GRD grd;

    private int status; // 模拟模式，1为时间优先，2为剂量优先

    private int bID;

    private List<Integer> vertexID;

    private String projectPath;

    private String venvPath;

    public List<Obstacle> obstacles; //障碍物集合

    public List<HashMap> rooms;

    public List<HashMap> peosList;

    private int nonRoom = 0;

    private boolean is_cal; // 是否已经计算过了

    private List<Integer> rid = new ArrayList<>();

    private List<Integer> remove_rooms = new ArrayList<>(); // 多余的房间

    private List<Integer> roomVertexIndices = new ArrayList<>();

    private List<Integer> populationVertexIndices = new ArrayList<>();

    private String fileName;

    public NavGrid() {
    }

    public NavGrid(List<Pos> points, List<Obstacle> obstacles, List<Exit> exits,List<HashMap> rooms, List<HashMap> peosList) {
        this.points = points;
        this.obstacles = obstacles;
        this.exits = exits;
        this.rooms = rooms;
        this.peosList = peosList;
        this.bID = -1;
        this.status = -1;
        minDistances_exit = new ArrayList<>();
        // 将房间中心作为点加入到迪杰斯特拉道路
        for(int i = 0; i < rooms.size(); i++) {
            List<HashMap> peos = (List<HashMap>) rooms.get(i).get("peos");
            if (peos.size() <= 0){
                remove_rooms.add(points.size());
            }
            double high_max = Integer.MIN_VALUE, high_min = Integer.MAX_VALUE;
            double weight_max = Integer.MIN_VALUE, weight_min = Integer.MAX_VALUE;
            List<HashMap> temp_walls = (List<HashMap>) rooms.get(i).get("walls");
            rid.add(Integer.parseInt(rooms.get(i).get("rid").toString()));
            nonRoom++;
            for(int j = 0; j < temp_walls.size(); j++) {
                if (((Number) temp_walls.get(j).get("x")).doubleValue() >= MinPos){
                    if(high_max < ((Number) temp_walls.get(j).get("y")).doubleValue()){
                        high_max = ((Number) temp_walls.get(j).get("y")).doubleValue();
                    }
                    if(high_min > ((Number) temp_walls.get(j).get("y")).doubleValue()){
                        high_min = ((Number) temp_walls.get(j).get("y")).doubleValue();
                    }
                    if(weight_max < ((Number) temp_walls.get(j).get("x")).doubleValue()){
                        weight_max = ((Number) temp_walls.get(j).get("x")).doubleValue();
                    }
                    if(weight_min > ((Number) temp_walls.get(j).get("x")).doubleValue()){
                        weight_min = ((Number) temp_walls.get(j).get("x")).doubleValue();
                    }
                }
            }
            ArrayList<Integer> room_id = new ArrayList<>();
            room_id.add(i);
            Pos temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2,0,room_id);
            List<HashMap> walls1 = (List<HashMap>) rooms.get(i).get("walls");
            ArrayList<Pos> temp_points1 = new ArrayList<Pos>();
            for(int k = 0; k < walls1.size(); k++) {
                if(((Number) walls1.get(k).get("x")).doubleValue() > MinPos){
                    Pos temp_1 = new Pos(((Number)walls1.get(k).get("x")).doubleValue(),((Number)walls1.get(k).get("y")).doubleValue());
                    temp_points1.add(temp_1);
                }
            }
            if (isPointInPolygon(temp_points1,temp)){
                temp = new Pos((weight_min+9*weight_max)/10,(9*high_max+high_min)/10,0,room_id);
            }

            for(int j = 0; j < rooms.size(); j++) {
                if(j != i){
                    List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                    ArrayList<Pos> temp_points = new ArrayList<Pos>();
                    for(int k = 0; k < walls.size(); k++) {
                        if(((Number) walls.get(k).get("x")).doubleValue() > MinPos){
                            Pos temp_1 = new Pos(((Number)walls.get(k).get("x")).doubleValue(),((Number)walls.get(k).get("y")).doubleValue());
                            temp_points.add(temp_1);
                        }
                    }
                    if (isPointInPolygon(temp_points,temp)){
                        room_id.add(j);
                    }
                }
            }
                temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2,0,room_id);
                int roomFloorId = rooms.get(i).get("floorId") != null
                        ? ((Number) rooms.get(i).get("floorId")).intValue() : 0;
                temp.setFloorId(roomFloorId);
                points.add(temp);
                roomVertexIndices.add(points.size() - 1);
        }
            // 将人口框中心作为点加入到迪杰斯特拉道路
            for(int i = 0; i < peosList.size(); i++) {
            List<HashMap> peos = (List<HashMap>) peosList.get(i).get("peos");
            if (peos.size() <= 0){
                continue;
            }
            double high_max = Integer.MIN_VALUE, high_min = Integer.MAX_VALUE;
            double weight_max = Integer.MIN_VALUE, weight_min = Integer.MAX_VALUE;
            List<HashMap> temp_walls = (List<HashMap>) peosList.get(i).get("walls");
            HashMap attr = (HashMap) peosList.get(i).get("attr");
            rid.add(Integer.parseInt(attr.get("id").toString()));
            nonRoom++;
            for(int j = 0; j < temp_walls.size(); j++) {
                if (((Number) temp_walls.get(j).get("x")).doubleValue() >= MinPos){
                    if(high_max < ((Number) temp_walls.get(j).get("y")).doubleValue()){
                        high_max = ((Number) temp_walls.get(j).get("y")).doubleValue();
                    }
                    if(high_min > ((Number) temp_walls.get(j).get("y")).doubleValue()){
                        high_min = ((Number) temp_walls.get(j).get("y")).doubleValue();
                    }
                    if(weight_max < ((Number) temp_walls.get(j).get("x")).doubleValue()){
                        weight_max = ((Number) temp_walls.get(j).get("x")).doubleValue();
                    }
                    if(weight_min > ((Number) temp_walls.get(j).get("x")).doubleValue()){
                        weight_min = ((Number) temp_walls.get(j).get("x")).doubleValue();
                    }
                }
            }
            ArrayList<Integer> room_id = new ArrayList<>();

            Pos temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2);
            for(int j = 0; j < rooms.size(); j++) {
                    List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                    ArrayList<Pos> temp_points = new ArrayList<Pos>();
                    for(int k = 0; k < walls.size(); k++) {
                        if(((Number) walls.get(k).get("x")).doubleValue() > MinPos){
                            Pos temp_1 = new Pos(((Number)walls.get(k).get("x")).doubleValue(),((Number)walls.get(k).get("y")).doubleValue());
                            temp_points.add(temp_1);
                        }
                    }
                    if (isPointInPolygon(temp_points,temp)){
                        room_id.add(j);
                    }
            }
            int status = 0;
            if (room_id.size() > 0){
                status = 1;
            }
            temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2,status,room_id);
            int groupFloorId = peosList.get(i).get("floorId") != null
                    ? ((Number) peosList.get(i).get("floorId")).intValue() : 0;
            temp.setFloorId(groupFloorId);
            points.add(temp);
            populationVertexIndices.add(points.size() - 1);
        }
        matrixRoomToExit = new int[rooms.size()+peosList.size()][exits.size()]; // 先房间后人口框（初始为所有出口，后续为 LP 选取 F1 终点时可按需裁剪）
    }

    public NavGrid(int bID, List<Pos> points, List<Obstacle> obstacles, List<Exit> exits,List<HashMap> rooms, List<HashMap> peosList, GRD grd,
                   int status, String projectPath, String venvPath,Boolean is_cal, String fileName) {
        this.points = points;
        this.obstacles = obstacles;
        this.exits = exits;
        this.rooms = rooms;
        this.peosList = peosList;
        this.grd = grd;
        this.bID = bID;
        this.status = status;
        this.projectPath = projectPath;
        this.venvPath = venvPath;
        this.is_cal = is_cal;
        this.fileName = fileName;
        minDistances_exit = new ArrayList<>();
        // 将房间和人口框中心作为点加入到迪杰斯特拉道路
        if(!is_cal){
            for(int i = 0; i < rooms.size(); i++) {
                List<HashMap> peos = (List<HashMap>) rooms.get(i).get("peos");
                if (peos.size() <= 0){
                    remove_rooms.add(points.size());
                }
                double high_max = Integer.MIN_VALUE, high_min = Integer.MAX_VALUE;
                double weight_max = Integer.MIN_VALUE, weight_min = Integer.MAX_VALUE;
                List<HashMap> temp_walls = (List<HashMap>) rooms.get(i).get("walls");
                rid.add(Integer.parseInt(rooms.get(i).get("rid").toString()));
                nonRoom++;
                for(int j = 0; j < temp_walls.size(); j++) {
                    if (((Number) temp_walls.get(j).get("x")).doubleValue() >= MinPos){
                        if(high_max < ((Number) temp_walls.get(j).get("y")).doubleValue()){
                            high_max = ((Number) temp_walls.get(j).get("y")).doubleValue();
                        }
                        if(high_min > ((Number) temp_walls.get(j).get("y")).doubleValue()){
                            high_min = ((Number) temp_walls.get(j).get("y")).doubleValue();
                        }
                        if(weight_max < ((Number) temp_walls.get(j).get("x")).doubleValue()){
                            weight_max = ((Number) temp_walls.get(j).get("x")).doubleValue();
                        }
                        if(weight_min > ((Number) temp_walls.get(j).get("x")).doubleValue()){
                            weight_min = ((Number) temp_walls.get(j).get("x")).doubleValue();
                        }
                    }
                }
                ArrayList<Integer> room_id = new ArrayList<>();
                room_id.add(i);
                Pos temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2,0,room_id);
                List<HashMap> walls1 = (List<HashMap>) rooms.get(i).get("walls");
                ArrayList<Pos> temp_points1 = new ArrayList<Pos>();
                for(int k = 0; k < walls1.size(); k++) {
                    if(((Number) walls1.get(k).get("x")).doubleValue() > MinPos){
                        Pos temp_1 = new Pos(((Number)walls1.get(k).get("x")).doubleValue(),((Number)walls1.get(k).get("y")).doubleValue());
                        temp_points1.add(temp_1);
                    }
                }
                if (isPointInPolygon(temp_points1,temp)){
                    temp = new Pos((weight_min+9*weight_max)/10,(9*high_max+high_min)/10,0,room_id);
                }
                for(int j = 0; j < rooms.size(); j++) {
                    if(j != i){
                        List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                        ArrayList<Pos> temp_points = new ArrayList<Pos>();
                        for(int k = 0; k < walls.size(); k++) {
                            if(((Number) walls.get(k).get("x")).doubleValue() > MinPos){
                                Pos temp_1 = new Pos(((Number)walls.get(k).get("x")).doubleValue(),((Number)walls.get(k).get("y")).doubleValue());
                                temp_points.add(temp_1);
                            }
                        }
                        if (isPointInPolygon(temp_points,temp)){
                            room_id.add(j);
                        }
                    }
                }
                temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2,0,room_id);
                int roomFloorId2 = rooms.get(i).get("floorId") != null
                        ? ((Number) rooms.get(i).get("floorId")).intValue() : 0;
                temp.setFloorId(roomFloorId2);
                points.add(temp);
                roomVertexIndices.add(points.size() - 1);
            }
            for(int i = 0; i < peosList.size(); i++) {
                List<HashMap> peos = (List<HashMap>) peosList.get(i).get("peos");
                if (peos.size() <= 0){
                    continue;
                }
                double high_max = Integer.MIN_VALUE, high_min = Integer.MAX_VALUE;
                double weight_max = Integer.MIN_VALUE, weight_min = Integer.MAX_VALUE;
                List<HashMap> temp_walls = (List<HashMap>) peosList.get(i).get("walls");
                HashMap attr = (HashMap) peosList.get(i).get("attr");
                rid.add(Integer.parseInt(attr.get("id").toString()));
                nonRoom++;
                for(int j = 0; j < temp_walls.size(); j++) {
                    if (((Number) temp_walls.get(j).get("x")).doubleValue() >= MinPos){
                        if(high_max < ((Number) temp_walls.get(j).get("y")).doubleValue()){
                            high_max = ((Number) temp_walls.get(j).get("y")).doubleValue();
                        }
                        if(high_min > ((Number) temp_walls.get(j).get("y")).doubleValue()){
                            high_min = ((Number) temp_walls.get(j).get("y")).doubleValue();
                        }
                        if(weight_max < ((Number) temp_walls.get(j).get("x")).doubleValue()){
                            weight_max = ((Number) temp_walls.get(j).get("x")).doubleValue();
                        }
                        if(weight_min > ((Number) temp_walls.get(j).get("x")).doubleValue()){
                            weight_min = ((Number) temp_walls.get(j).get("x")).doubleValue();
                        }
                    }
                }
                ArrayList<Integer> room_id = new ArrayList<>();
                Pos temp = new Pos((weight_min+weight_max)/2,(high_max+high_min)/2);
                for(int j = 0; j < rooms.size(); j++) {
                        List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                        ArrayList<Pos> temp_points = new ArrayList<Pos>();
                        for(int k = 0; k < walls.size(); k++) {
                            if(((Number) walls.get(k).get("x")).doubleValue() > MinPos){
                                Pos temp_1 = new Pos(((Number)walls.get(k).get("x")).doubleValue(),((Number)walls.get(k).get("y")).doubleValue());
                                temp_points.add(temp_1);
                            }
                        }
                        if (isPointInPolygon(temp_points,temp)){
                            room_id.add(j);
                        }
                }
                temp = new Pos((weight_min+weight_max)/3,(high_max+high_min)/3,0,room_id);
                int groupFloorId2 = peosList.get(i).get("floorId") != null
                        ? ((Number) peosList.get(i).get("floorId")).intValue() : 0;
                temp.setFloorId(groupFloorId2);
                points.add(temp);
                populationVertexIndices.add(points.size() - 1);
            }
        }

        matrixRoomToExit = new int[rooms.size()+peosList.size()][exits.size()];

    }


    //判断一条线是否与障碍物重合
    private boolean isIntersectWithObs(Pos A, Pos B) {
        for (Obstacle obstacle : obstacles) {
            if (LineUtils.isIntersect(A, B, obstacle.getA(), obstacle.getB())) {
                return true;
            }
        }
        return false;
    }

    // 判断一条线是否穿房间
    private boolean isIntersectWithRoom(Pos A, Pos B, ArrayList<Integer> room_id){
        for (int i = 0; i < rooms.size(); i++) {
            if (room_id.contains(i)){
                continue;
            }
            List<HashMap> temp_walls = (List<HashMap>) rooms.get(i).get("walls");
            List<HashMap> walls = new ArrayList<>();
            for(int j = 0; j < temp_walls.size(); j++) {
                if (((Number) temp_walls.get(j).get("x")).doubleValue() >= MinPos){
                    walls.add(temp_walls.get(j));
                }
            }
            for(int j = 0; j < walls.size() - 1; j++) {
                Pos A1 = new Pos(((Number) walls.get(j).get("x")).doubleValue(), ((Number) walls.get(j).get("y")).doubleValue());
                Pos B1 = new Pos(((Number) walls.get(j + 1).get("x")).doubleValue(), ((Number) walls.get(j + 1).get("y")).doubleValue());
                if (LineUtils.isIntersect(A, B, A1, B1)) {
                    return true;
                }
            }

        }
        return false;
    }

    //构建图
    private void generateGraph() {
        vertexID = new ArrayList<>();
        // 构建点数组
        // 构建二维点数组
        List<Pos> vertex = new ArrayList<>();
        for (int i = 0; i < points.size(); i++) {
                vertexID.add(i);
                vertex.add(points.get(i));
        }
        if (roomVertexIndices.size() == rooms.size()) {
            for (int i = 0; i < rooms.size(); i++) {
                roomVertexIndices.set(i, vertexID.indexOf(roomVertexIndices.get(i)));
            }
        }
        if (populationVertexIndices.size() == peosList.size()) {
            for (int i = 0; i < peosList.size(); i++) {
                populationVertexIndices.set(i, vertexID.indexOf(populationVertexIndices.get(i)));
            }
        }
        for (Exit exit : exits) {
            vertex.add(exit.getCenter());
        }

        if (roomVertexIndices.size() == rooms.size()) {
            for (int i = 0; i < rooms.size(); i++) {
                roomVertexIndices.set(i, vertexID.indexOf(roomVertexIndices.get(i)));
            }
        }
        if (populationVertexIndices.size() == peosList.size()) {
            for (int i = 0; i < peosList.size(); i++) {
                populationVertexIndices.set(i, vertexID.indexOf(populationVertexIndices.get(i)));
            }
        }

        int n = vertex.size();
        //计算每两点间的距离
        matrix = new int[n][n];
        for (int i = 0; i < n; i++) {
            matrix[i][i] = 0;

            for (int j = i + 1; j < n; j++) {
                //判断是否与墙重合
                if (isIntersectWithObs(vertex.get(i), vertex.get(j))) {
                    matrix[i][j] = MAXLEN;
                } else {
                    matrix[i][j] = (int) Math.floor(vertex.get(i).getDistance(vertex.get(j)));
                }
                if(i >= n-exits.size()){
                    matrix[i][j] = MAXLEN; // 集合点之间不互通
                }
            }
        }

        //将矩阵补充完整
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                matrix[i][j] = matrix[j][i];
            }
        }

        //限制不能从房间外到房间内
        for(int i = 0; i < n; i++){
            for(int j = 0; j < n; j++){
                if(i==j) continue;
                if(vertex.get(i).state == 1 && vertex.get(j).state == 0){
                    matrix[j][i] = MAXLEN;
                }
                if (vertex.get(i).room_id.size() > 0 && vertex.get(j).room_id.size() > 0 && vertex.get(i).state == 0
                        && vertex.get(j).state == 0 && !vertex.get(i).room_id.stream().anyMatch(vertex.get(j).room_id::contains)){
                        matrix[j][i] = MAXLEN;
                }
                if (vertex.get(j).room_id.contains(-2)){  // 集合点，需判断是否穿集合点
                    if (isIntersectWithRoom(vertex.get(i), vertex.get(j), vertex.get(i).room_id)){  // 穿房间了
                        matrix[j][i] = MAXLEN;
                    }
                }
                if (isIntersectWithRoom(vertex.get(i),vertex.get(j),vertex.get(i).room_id)){
                    matrix[j][i] = MAXLEN;
                }
            }
        }

        // 处理楼层间的传送
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                
                Pos p1 = vertex.get(i);
                Pos p2 = vertex.get(j);
                
                if (p1.getFloorId() == p2.getFloorId()) {
                    // 同楼层连通性由 matrix[i][j] 已有的物理距离/障碍物逻辑决定
                } else {
                    // 跨楼层：仅允许通过具有 teleportTarget 的集合点传送到目标楼层的同编号集合点
                    matrix[i][j] = MAXLEN; // 默认不通
                    
                    // 检查 i 是否为具有传送目标的集合点
                    if (p1.room_id.contains(-2) && p2.room_id.contains(-2)) {
                        // 寻找对应的 Exit 对象
                        Exit exit1 = null;
                        for (Exit e : exits) {
                            if (e.getCenter().equals(p1)) {
                                exit1 = e;
                                break;
                            }
                        }
                        
                        if (exit1 != null) {
                            AssemblyExitId parsed1 = AssemblyExitId.parse(exit1.getExitKey());
                            // 必须有传送目标且目标楼层匹配，才能作为跨层传送边
                            if (parsed1.teleportTarget != null && !parsed1.teleportTarget.isEmpty()) {
                                int nextF = AssemblyExitId.nextFloorTowardF1(p1.getFloorId());
                                if (p2.getFloorId() == nextF) {
                                    // 检查编号是否相同
                                    Exit exit2 = null;
                                    for (Exit e : exits) {
                                        if (e.getCenter().equals(p2)) {
                                            exit2 = e;
                                            break;
                                        }
                                    }
                                    if (exit2 != null) {
                                        AssemblyExitId parsed2 = AssemblyExitId.parse(exit2.getExitKey());
                                        if (parsed1.assemblyNum == parsed2.assemblyNum) {
                                            matrix[i][j] = 1; // 传送权重设为极小值
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //构建图
    private void generateGraph_1() {
        vertexID = new ArrayList<>();
        //构建点数组
        List<Pos> vertex = new ArrayList<>();
        for (int i = 0; i < points.size(); i++) {
                vertexID.add(i);
                vertex.add(points.get(i));
        }


        for (Exit exit : exits) {
            vertex.add(exit.getCenter());
        }

        int n = vertex.size();
        //计算每两点间的距离,和剂量
        matrix = new int[n][n];
        for (int i = 0; i < n; i++) {
            matrix[i][i] = 0;
            for (int j = i + 1; j < n; j++) {
                //判断是否与墙重合
                if (isIntersectWithObs(vertex.get(i), vertex.get(j))) {
                    matrix[i][j] = MAXLEN;
                } else {
                    matrix[i][j] = (int) Math.floor(vertex.get(i).getDistance(vertex.get(j))) + (int) grd.calculateLine(vertex.get(i), vertex.get(j));
                }
                if(i >= n-exits.size()){
                    matrix[i][j] = MAXLEN; // 集合点之间不互通
                }
            }
        }

        //将矩阵补充完整
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                matrix[i][j] = matrix[j][i];
            }
        }

        // 限制不能从房间外到房间内
        for(int i = 0; i < n; i++){
            for(int j = 0; j < n; j++){
                if(i==j) continue;
                if(vertex.get(i).state == 1 && vertex.get(j).state == 0){
                    matrix[j][i] = MAXLEN;
                }
                if (vertex.get(i).room_id.size() > 0 && vertex.get(j).room_id.size() > 0 && vertex.get(i).state == 0
                        && vertex.get(j).state == 0 && !vertex.get(i).room_id.stream().anyMatch(vertex.get(j).room_id::contains)){
                        matrix[j][i] = MAXLEN;
                }
                if (isIntersectWithRoom(vertex.get(i),vertex.get(j),vertex.get(i).room_id)){
                    matrix[j][i] = MAXLEN;
                }
            }
        }

        // 处理楼层间的传送
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                
                Pos p1 = vertex.get(i);
                Pos p2 = vertex.get(j);
                
                if (p1.getFloorId() == p2.getFloorId()) {
                    // 同楼层连通性由 matrix[i][j] 已有的物理距离/障碍物逻辑决定
                } else {
                    // 跨楼层：仅允许通过具有 teleportTarget 的集合点传送到目标楼层的同编号集合点
                    matrix[i][j] = MAXLEN; // 默认不通
                    
                    // 检查 i 是否为具有传送目标的集合点
                    if (p1.room_id.contains(-2) && p2.room_id.contains(-2)) {
                        // 寻找对应的 Exit 对象
                        Exit exit1 = null;
                        for (Exit e : exits) {
                            if (e.getCenter().equals(p1)) {
                                exit1 = e;
                                break;
                            }
                        }
                        
                        if (exit1 != null) {
                            AssemblyExitId parsed1 = AssemblyExitId.parse(exit1.getExitKey());
                            // 必须有传送目标且目标楼层匹配，才能作为跨层传送边
                            if (parsed1.teleportTarget != null && !parsed1.teleportTarget.isEmpty()) {
                                int nextF = AssemblyExitId.nextFloorTowardF1(p1.getFloorId());
                                if (p2.getFloorId() == nextF) {
                                    // 检查编号是否相同
                                    Exit exit2 = null;
                                    for (Exit e : exits) {
                                        if (e.getCenter().equals(p2)) {
                                            exit2 = e;
                                            break;
                                        }
                                    }
                                    if (exit2 != null) {
                                        AssemblyExitId parsed2 = AssemblyExitId.parse(exit2.getExitKey());
                                        if (parsed1.assemblyNum == parsed2.assemblyNum) {
                                            matrix[i][j] = 1; // 传送权重设为极小值
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //判断是否有导航点可以到终点
    public boolean isReached() {
        for (Exit exit : exits) {
            // 只有 F1 层的集合点才是最终疏散终点
            AssemblyExitId exParsed = AssemblyExitId.parse(exit.getExitKey());
            if (exParsed.floorInKey != 0) {
                continue;
            }
            for (Pos point : points) {
                boolean is_remove = false;
                for (int i : remove_rooms){
                    if (point.x == points.get(i).getX() && point.y == points.get(i).getY()){
                        is_remove = true;
                        break;
                    }
                }
                if (is_remove) continue;
                boolean reached = true;
                for (Obstacle obstacle : obstacles) {
                    if (LineUtils.isIntersect(point, exit.getCenter(), obstacle.getA(), obstacle.getB())) {
                        reached = false;
                    }
                }
                if (reached) {
                    return true;
                }
            }
        }
        return false;
    }

    // 判断是否所有房间可达所有出口
    public int anyOneCanReached(){

        //搜索，看每个点是否能到终点
        reachable = new boolean[points.size()];
        for (int i = 0; i < points.size(); i++) {
            for (Exit exit : exits) {
                if (reached(exit.getCenter(), points.get(i))) {
                    reachable[i] = true;
                }
            }
        }
        for (int k = 0; k < points.size(); k++) {
            if (remove_rooms.contains(k)) continue;
            for (int i = 0; i < points.size(); i++) {
                if (remove_rooms.contains(i)) continue;
                if (reachable[i]) {
                    continue;
                }
                for (int j = 0; j < points.size(); j++) {
                    if (i == j) {
                        continue;
                    }
                    if (reachable[j] && reached(points.get(i), points.get(j))) {
                        reachable[i] = true;
                        break;
                    }
                }
            }
        }

        for(int i = points.size()-nonRoom; i < reachable.length; i++){
            if (remove_rooms.contains(i)) continue;
            if(!reachable[i]){
                return rid.get(i-(points.size()-nonRoom));
            }
        }
        return -1;
    }

    //迪杰斯特拉寻找最短路线与距离
    public void dijkstra(int n, int source, int id) {
        List<List<Integer>> paths = new ArrayList<>();
        List<Integer> distances = new ArrayList<>(Arrays.asList(new Integer[n]));
        List<Boolean> visited = new ArrayList<>(Arrays.asList(new Boolean[n]));

        for (int i = 0; i < n; i++) {
            paths.add(new ArrayList<>());
            distances.set(i, MAXLEN);  // 初始化距离为10000表示不可到达
            visited.set(i, false);
        }

        distances.set(source, 0);  // 源点到自身的距离为0

        for (int i = 0; i < n; i++) {
            int u = minDistance(distances, visited); // 目标节点
            visited.set(u, true);

            for (int v = 0; v < n; v++) {
                if (!visited.get(v) && matrix[u][v] != MAXLEN) {
                    if (distances.get(u) + matrix[u][v] < distances.get(v)) {
                        distances.set(v, distances.get(u) + matrix[u][v]);
                        paths.get(v).clear();
                        paths.get(v).addAll(paths.get(u));
                        paths.get(v).add(u);
                    }
                }
            }
        }

        for (int i = 0; i < n; i++) {
            if (i != source) {
                List<Integer> path = new ArrayList<>(paths.get(i));
                path.add(i);
//                System.out.println("从顶点 " + source + " 到顶点 " + i + " 的最短路径为: " + path);
//                System.out.println("距离为: " + distances.get(i));
                pathToAllExitMap.get(id).put(i, path);
                if (i >= vertexID.size()-rooms.size() - peosList.size() && i < vertexID.size()){
                    matrixRoomToExit[i-vertexID.size()+rooms.size() + peosList.size()][id] = distances.get(i);
                    pathToAllExit.get(id).add(path);
                }

            }
        }

        for (int i = 0; i < n; i++) {
            if (i != source) {
                paths.get(i).add(i);
            }
        }
        minDistances_exit.set(id,distances.subList(0, vertexID.size()));
    //更新路线信息
        if (!update) {
            //初始化
            minDistances = new ArrayList<>(distances.subList(0, vertexID.size()));
            pathToExit = new ArrayList<>(paths.subList(0, vertexID.size()));
            destination = new ArrayList<>();
            for (int i = 0; i < vertexID.size(); i++) {
                destination.add(0);
            }
            update = true;
        } else {
            for (int i = 0; i < vertexID.size(); i++) {
                if (minDistances.get(i) > distances.get(i)) {
                    minDistances.set(i, distances.get(i));
                    pathToExit.set(i, paths.get(i));
                    destination.set(i, source - vertexID.size());
                }
            }
        }
    }

    private int minDistance(List<Integer> distances, List<Boolean> visited) {
        int minDist = MAXLEN;
        int minIndex = -1;
        for (int v = 0; v < distances.size(); v++) {
            if (!visited.get(v) && distances.get(v) <= minDist) {
                minDist = distances.get(v);
                minIndex = v;
            }
        }
        return minIndex;
    }

    //查看两点之间是否有墙,是否穿房间
    private boolean reached(Pos A, Pos B) {
        for (Obstacle obstacle : obstacles) {
            if (LineUtils.isIntersect(A, B, obstacle.getA(), obstacle.getB())) {
                return false;
            }
        }
        // 不允许从房间外到房间内
        if((A.state==1 && B.state==0)){
            return false;
        }
        return true;
    }

    //通过迪杰斯特拉构建连线，以路程为值
    public List<Map<String, Integer>> generateLines() throws IOException {
        //搜索，看每个点是否能到终点
        reachable = new boolean[points.size()];
        for (int i = 0; i < points.size(); i++) {
            for (Exit exit : exits) {
                if (reached(exit.getCenter(), points.get(i))) {
                    reachable[i] = true;
                }
            }
        }
        for (int k = 0; k < points.size(); k++) {
            for (int i = 0; i < points.size(); i++) {
                if (reachable[i]) {
                    continue;
                }
                for (int j = 0; j < points.size(); j++) {
                    if (i == j) {
                        continue;
                    }
                    if (reachable[j] && reached(points.get(i), points.get(j))) {
                        reachable[i] = true;
                        break;
                    }
                }
            }
        }

        //生成无向图网络并计算每个点到出口的最短距离
        if (status == -1){
            generateGraph();
        }else {
            generateGraph_1();
        }

        pathToAllExit = new ArrayList<>(exits.size());
        for (int i = 0; i<exits.size(); i++){
            pathToAllExit.add(new ArrayList<>());
        }
        pathToAllExitMap = new ArrayList<>(exits.size());
        for (int i = 0; i < exits.size(); i++) {
            minDistances_exit.add(new ArrayList<>());
            pathToAllExitMap.add(new HashMap<>());
            dijkstra(matrix.length, i + vertexID.size(),i);
        }
        //生成连线
        boolean[][] line = new boolean[matrix.length][matrix.length];
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix.length; j++) {
                line[i][j] = false;
            }
        }
        for (int i = 0; i < pathToExit.size(); i++) {
            for (int j = 1; j < pathToExit.get(i).size(); j++) {
                line[pathToExit.get(i).get(j - 1)][pathToExit.get(i).get(j)] = true;
            }
        }

//        for (int i = 0; i < pathToExit.size(); i++) {
//            System.out.println("从出口 " + " 到顶点 " + i + " 的最短路径为: " + pathToExit.get(i));
//            System.out.println("距离为: " + distances.get(i));
//       }

//        for(int i = 0; i < pathToAllExit.size(); i++){
//            for(int j = 0; j < pathToAllExit.get(i).size(); j++){
//                System.out.println("从出口 " + i + " 到房间 " + j + " 的最短路径为: " + pathToAllExit.get(i).get(j));
//            }
 //       }

        // 将数据形成 json，输入到线性规划模型：仅使用 F1 终点集合点
        try {
            if (bID != -1 && !is_cal) {
                // 筛选出 F1 层的出口及其在原 exits 列表中的列索引
                List<Exit> finalExits = new ArrayList<>();
                List<Integer> finalExitIndex = new ArrayList<>();
                for (int i = 0; i < exits.size(); i++) {
                    Exit exit = exits.get(i);
                    if (exit == null) {
                        continue;
                    }
                    String exitKey = exit.getExitKey();
                    AssemblyExitId parsed = AssemblyExitId.parse(exitKey);
                    int exitFloorId = exit.getLt() != null ? exit.getLt().getFloorId() : parsed.floorInKey;
                    if (parsed.floorInKey != 0) {
                        exitFloorId = parsed.floorInKey;
                    }
                    if (!AssemblyExitId.isUsableAsFinalDestination(exitFloorId, parsed)) {
                        continue;
                    }
                    finalExits.add(exit);
                    finalExitIndex.add(i);
                }

                int[][] matrixRoomToFinalExit;
                if (finalExits.isEmpty()) {
                    // 若未识别到任何 F1 终点，则保留原有矩阵和出口集合，避免运行时崩溃
                    matrixRoomToFinalExit = matrixRoomToExit;
                } else {
                    matrixRoomToFinalExit = new int[rooms.size() + peosList.size()][finalExits.size()];
                    for (int r = 0; r < matrixRoomToFinalExit.length; r++) {
                        for (int c = 0; c < finalExits.size(); c++) {
                            int srcCol = finalExitIndex.get(c);
                            matrixRoomToFinalExit[r][c] = matrixRoomToExit[r][srcCol];
                        }
                    }
                }

                jsonServer.dataToJsonFile(bID, matrixRoomToFinalExit, rooms, peosList,
                        finalExits.isEmpty() ? exits : finalExits, projectPath, fileName);
            }
        } catch (IOException e) {
        }
        // 运行模型
        if (bID != -1 && !is_cal){
            try {
                JavaPythonCaller.runPython(projectPath, fileName,venvPath, bID);
            } catch (RuntimeException e) {
                // 将 Python 执行异常转换为 IOException，以便上层处理
                throw new IOException("Python 脚本执行失败: " + e.getMessage(), e);
            }
        }

        //存储结果
        lines = new ArrayList<>();
        for (int i = 0; i < line.length - exits.size() - rooms.size() - peosList.size() ; i++) {
            for (int j = i + 1; j < line.length - exits.size() - rooms.size()- peosList.size() ; j++) {
                if (line[i][j] || line[j][i]) {
                    Map<String, Integer> m = new HashMap<>();
                    m.put("a", vertexID.get(i));
                    m.put("b", vertexID.get(j));
                    lines.add(m);
//                    System.out.println("从" + i + "到" + j + "可连");
                }
//                System.out.println("从" + i + "到" + j + "不可连");
            }
        }

        simplifyLines();
        return lines;
    }

    //优化连线
    public void simplifyLines() {
        for (int i = 0; i < lines.size(); i++) {
            for (int j = 0; j < lines.size(); j++) {
                if(i == j) { continue; }
                //判断两条线是否有共同顶点并找到共同点
                int samePoint; //共同点
                int a; //顶点a
                int b; //顶点b
                if(lines.get(i).get("a") == lines.get(j).get("a")) {
                    samePoint = lines.get(i).get("a");
                    a = lines.get(i).get("b");
                    b = lines.get(j).get("b");
                } else if (lines.get(i).get("a") == lines.get(j).get("b")) {
                    samePoint = lines.get(i).get("a");
                    a = lines.get(i).get("b");
                    b = lines.get(j).get("a");
                } else if (lines.get(i).get("b") == lines.get(j).get("b")) {
                    samePoint = lines.get(i).get("b");
                    a = lines.get(i).get("a");
                    b = lines.get(j).get("a");
                } else if (lines.get(i).get("b") == lines.get(j).get("a")) {
                    samePoint = lines.get(i).get("b");
                    a = lines.get(i).get("a");
                    b = lines.get(j).get("b");
                } else {
                    continue;
                }

                if (!isIntersectWithObs(points.get(a), points.get(b)) && !isGreater45(i, j)) {
                    Map<String, Integer> newLine = new HashMap<>();
                    newLine.put("a", a);
                    newLine.put("b", b);
                    lines.add(newLine);

                    //删除较长线段
                    double len1 = points.get(a).getDistance(points.get(samePoint));
                    double len2 = points.get(b).getDistance(points.get(samePoint));
                    if(len1 >= len2) {
                        //删除i
                        lines.remove(i);
                        j = 0;
                    } else {
                        lines.remove(j);
                        j--;
                    }
                }
            }
        }
    }

    //判断两条线间的角度是否大于45度
    public boolean isGreater45(int a, int b) {
        Pos a1 = points.get(lines.get(a).get("a"));
        Pos a2 = points.get(lines.get(a).get("b"));
        Pos b1 = points.get(lines.get(b).get("a"));
        Pos b2 = points.get(lines.get(b).get("b"));
        if (a1.getX() == b1.getX() && a1.getY() == b1.getY()) {

        } else if (a2.getX() == b1.getX() && a2.getY() == b1.getY()) {
            Pos tmp = a1;
            a1 = a2;
            a2 = tmp;
        } else if (a1.getX() == b2.getX() && a1.getY() == b2.getY()) {
            Pos tmp = b1;
            b1 = b2;
            b2 = tmp;
        } else if (a2.getX() == b2.getX() && a2.getY() == b2.getY()) {
            Pos tmp = a1;
            a1 = a2;
            a2 = tmp;
            tmp = b1;
            b1 = b2;
            b2 = tmp;
        } else {
            return false;
        }

        //计算向量
        double x1 = a2.getX() - a1.getX();
        double y1 = a2.getY() - a1.getY();
        double x2 = b2.getX() - b1.getX();
        double y2 = b2.getY() - b1.getY();

        double dotProduct = x1 * x2 + y1 * y2; //点积
        double module = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2); //模的乘积
        double cos = dotProduct / module;
        if (cos < 0.707) {
            return true;
        }
        return false;

    }

    //获取最近并且可达的导航点
    public Pos getNavPoint(Pos pos, int exitID) {
        //是否可到达出口
        Pos des = new Pos();
        int state = 1; // 在房间外
        ArrayList<Integer> room_id = new ArrayList<>();
        for(int j = 0; j < rooms.size();j++){
            List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
            ArrayList<Pos> points = new ArrayList<Pos>();
            for(int k = 0; k < walls.size(); k++) {
                if(((Number) walls.get(k).get("x")).doubleValue() > MinPos){
                    Pos temp = new Pos(((Number)walls.get(k).get("x")).doubleValue(),((Number)walls.get(k).get("y")).doubleValue());
                    points.add(temp);
                }
            }
            if (isPointInPolygon(points,pos)){
                state = 0;
                room_id.add(j);
            }
        }
        int dis = MAXLEN;
        Exit exit = exits.get(exitID);
        
        // 跨楼层处理：如果集合点在不同楼层，不能直接直线到达
        if (pos.getFloorId() == exit.getCenter().getFloorId()) {
            if (!isIntersectWithObs(pos, exit.getCenter()) &&!(isIntersectWithRoom(pos, exit.getCenter(),room_id)) && dis > pos.getDistance(exit.getCenter())) {
                des.setX(exit.getCenter().getX());
                des.setY(exit.getCenter().getY());
                des.setFloorId(exit.getCenter().getFloorId());
                dis = (int) pos.getDistance(des);
            }
        }

        if (dis < MAXLEN) {
            return des;
        }

        //寻找导航点
        for (int i = 0 ; i <pathToAllExit.get(exitID).size(); i++) {
            for (int j = 0; j < pathToAllExit.get(exitID).get(i).size(); j++){
                int temp = pathToAllExit.get(exitID).get(i).get(j);
                if (temp >= vertexID.size()) continue;
                Pos targetPos = points.get(vertexID.get(temp));
                
                // 必须在同一楼层才能直线感知
                if (pos.getFloorId() != targetPos.getFloorId()) continue;

                if (!(state == 1 && targetPos.state == 0)
                        &&!(state == 0 && targetPos.state == 0
                        && !room_id.stream().anyMatch(targetPos.room_id::contains))
                        &&!isIntersectWithObs(pos, targetPos)
                        && dis > pos.getDistance(targetPos) + minDistances_exit.get(exitID).get(temp)
                        && !pos.gotList.contains(vertexID.get(temp))) {
                    des.setX(targetPos.getX());
                    des.setY(targetPos.getY());
                    des.setFloorId(targetPos.getFloorId());
                    dis = (int) pos.getDistance(targetPos) + minDistances_exit.get(exitID).get(temp);
                }
            }
        }
        if (dis < MAXLEN) {
//            System.out.println("目标为导航点" + des.getX() + "出口为" + exits.get(0).getCenter().getX());
            return des;
        }

        for (int i = 0 ; i <vertexID.size(); i++) {
                Pos targetPos = points.get(vertexID.get(i));
                if (pos.getFloorId() == targetPos.getFloorId() && !(state == 1 && targetPos.state == 0)&&!(state == 0 && targetPos.state == 0
                        && !room_id.stream().anyMatch(targetPos.room_id::contains))&&!isIntersectWithObs(pos, targetPos)
                         && !pos.gotList.contains(vertexID.get(i))) {
                    double min_dis = Double.MAX_VALUE;
                    for (int j = 0;j<minDistances_exit.size();j++){
                        if (min_dis > pos.getDistance(targetPos) + minDistances_exit.get(j).get(i)){
                            min_dis = pos.getDistance(targetPos) + minDistances_exit.get(j).get(i);
                        }
                    }
                    if ( dis > min_dis){
                        des.setX(targetPos.getX());
                        des.setY(targetPos.getY());
                        des.setFloorId(targetPos.getFloorId());
                        dis = (int) min_dis;
                    }

                }
        }
        if (dis < MAXLEN) {
//            System.out.println("目标为导航点" + des.getX() + "出口为" + exits.get(0).getCenter().getX());
            return des;
        }

        return null;
    }

    // 获取房间index
    public int getRoomIndex(int rID){
        return rID + vertexID.size() - rooms.size() - peosList.size();
    }


    //判断是否能到出口
    public boolean isToExit(Pos pos) {
        //是否可到达出口
        Pos des = new Pos();
        int dis = MAXLEN;
        for (Exit exit : exits) {
            // 必须在同一楼层且无障碍
            if (pos.getFloorId() == exit.getCenter().getFloorId() && !isIntersectWithObs(pos, exit.getCenter()) && dis > pos.getDistance(exit.getCenter())) {
                des.setX(exit.getCenter().getX());
                des.setY(exit.getCenter().getY());
                des.setFloorId(exit.getCenter().getFloorId());
                dis = (int) pos.getDistance(des);
            }
        }
        if (dis < MAXLEN) {
            return true;
        }

        //寻找导航点
        for (int i = 0; i < vertexID.size(); i++) {
            Pos targetPos = points.get(vertexID.get(i));
            if (pos.getFloorId() == targetPos.getFloorId() && !isIntersectWithObs(pos, targetPos) &&
                    dis > pos.getDistance(targetPos) + minDistances.get(i)) {
                des.setX(targetPos.getX());
                des.setY(targetPos.getY());
                des.setFloorId(targetPos.getFloorId());
                dis = (int) pos.getDistance(targetPos) + minDistances.get(i);
            }
        }
        if (dis < MAXLEN) {
//            System.out.println("点" + pos.x + " " +pos.y +",目标为导航点" + des.getX() + "出口为" + exits.get(0).getCenter().getX());
            return true;
        }
        return false;
    }

    public void transformScale(double scale) {
        for(Pos pos : points) {
            pos.transformScale(scale);
        }
    }

    public List getMinDistancesExit(){
        return minDistances_exit;
    }

    public int getRoomGraphIndexByOrder(int roomOrder) {
        if (roomOrder < 0 || roomOrder >= roomVertexIndices.size()) {
            return -1;
        }
        return roomVertexIndices.get(roomOrder);
    }

    public int getPopulationGraphIndexByOrder(int populationOrder) {
        if (populationOrder < 0 || populationOrder >= populationVertexIndices.size()) {
            return -1;
        }
        return populationVertexIndices.get(populationOrder);
    }

    public List<double[]> getWaypointCoordinates(int exitId, int startVertexIndex) {
        int exitIndex = resolveExitIndex(exitId);
        if (pathToAllExitMap == null || exitIndex < 0 || exitIndex >= pathToAllExitMap.size() || vertexID == null) {
            return Collections.emptyList();
        }
        Map<Integer, List<Integer>> exitPaths = pathToAllExitMap.get(exitIndex);
        if (exitPaths == null) {
            return Collections.emptyList();
        }

        int lookupIndex = startVertexIndex;
        List<Integer> path = exitPaths.get(lookupIndex);
        if ((path == null || path.isEmpty()) && vertexID != null) {
            int candidateIndex = vertexID.indexOf(startVertexIndex);
            if (candidateIndex >= 0) {
                lookupIndex = candidateIndex;
                path = exitPaths.get(lookupIndex);
            }
        }

        if (path == null || path.size() <= 1) {
            return Collections.emptyList();
        }

        List<double[]> coordinates = new ArrayList<>();
        for (int idx = path.size() - 2; idx >= 0; idx--) {
            int graphIdx = path.get(idx);
            Pos waypointPos;
            if (graphIdx >= vertexID.size()) {
                int exitOrder = graphIdx - vertexID.size();
                if (exitOrder < 0 || exitOrder >= exits.size()) {
                    continue;
                }
                waypointPos = exits.get(exitOrder).getCenter();
            } else {
                if (graphIdx < 0 || graphIdx >= vertexID.size()) {
                    continue;
                }
                int pointIdx = vertexID.get(graphIdx);
                if (pointIdx < 0 || pointIdx >= points.size()) {
                    continue;
                }
                waypointPos = points.get(pointIdx);
            }
            coordinates.add(new double[]{waypointPos.getX(), waypointPos.getY()});
        }
        return coordinates;
    }

    public Pos getExitCenter(int exitId) {
        int exitIndex = resolveExitIndex(exitId);
        if (exitIndex < 0 || exitIndex >= exits.size()) {
            return null;
        }
        Exit exit = exits.get(exitIndex);
        if (exit == null || exit.getCenter() == null) {
            return null;
        }
        Pos center = exit.getCenter();
        return new Pos(center.getX(), center.getY());
    }

    private int resolveExitIndex(int exitId) {
        if (exitId >= 0 && exits != null && exitId < exits.size()) {
            return exitId;
        }
        if (exits != null) {
            for (int idx = 0; idx < exits.size(); idx++) {
                Exit exit = exits.get(idx);
                if (exit != null && exit.getId() != null && exit.getId().intValue() == exitId) {
                    return idx;
                }
            }
        }
        return -1;
    }

    // 判断点p是否在多边形polygon内
    public static boolean isPointInPolygon(ArrayList<Pos> polygon, Pos p) {
        int intersectCount = 0;
        for (int i = 0; i < polygon.size(); i++) {
            Pos p1 = polygon.get(i);
            Pos p2 = polygon.get((i + 1) % polygon.size()); // 闭环处理
            if (isPointOnLineSegment(p1, p2, p)) {
                return true; // 点在多边形边上
            }
            // 判断线段两端点是否在射线两侧
            if (p1.getY() < p.getY() && p2.getY() >= p.getY() || p2.getY() < p.getY() && p1.getY() >= p.getY()) {
                // 计算交点的x坐标
                double x = (p.getY() - p1.getY()) * (p2.getX() - p1.getX()) / (p2.getY() - p1.getY()) + p1.getX();
                if (x > p.getX()) { // 交点在射线上
                    intersectCount++;
                }
            }
        }
        // 如果交点为奇数，点在多边形内
        return intersectCount % 2 == 1;
    }

    // 判断点p是否在线段p1p2上
    private static boolean isPointOnLineSegment(Pos p1, Pos p2, Pos p) {
        return (p.getX() - p1.getX()) * (p2.getY() - p1.getY()) == (p.getY() - p1.getY()) * (p2.getX() - p1.getX()) &&
                Math.min(p1.getX(), p2.getX()) <= p.getX() && p.getX() <= Math.max(p1.getX(), p2.getX()) &&
                Math.min(p1.getY(), p2.getY()) <= p.getY() && p.getY() <= Math.max(p1.getY(), p2.getY());
    }


}
