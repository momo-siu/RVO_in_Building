package com.rvo.rvoserver.controller;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.mysql.cj.jdbc.SuspendableXAConnection;
import com.rvo.rvoserver.Mapper.BlueprintMapper;
import com.rvo.rvoserver.pojo.*;
import com.rvo.rvoserver.server.*;
import com.rvo.rvoserver.server.impl.JsonServerA;
import com.rvo.rvoserver.server.impl.RvoServerC;
import com.rvo.rvoserver.utils.EncryptedClassLoader;
import com.sun.tools.javac.Main;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.math.DD;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.AsyncResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.*;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.NoSuchAlgorithmException;
import java.text.DecimalFormat;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;
import org.json.JSONArray;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

@RestController
@Slf4j
public class EvaluateController {

    final int MinPos = -9999;

    private static final String ALGORITHM = "AES";

    @Value("${path.projectPath}")
    private String projectPath; //项目地址

    @Value("${path.venvPath}")
    private String venvPath; // py编译器地址

    @Autowired
    RvoServer rvoServer;

    @Autowired
    BlueprintServer blueprintServer;

    @Autowired
    private BlueprintMapper blueprintMapper;

    @Autowired
    EvaluateServer evaluateServer;


    @Autowired
    JsonServer jsonServer;

    @PostMapping("/commit")
    public Result evaluate(@RequestBody Map request) throws IOException {
//        if(RvoServerC.mutex != 0) { return Result.error("有任务正在执行，请稍后重试。"); }

        int bID = Integer.parseInt((String) request.get("bID"));
//        EncryptedClassLoader classLoader = new EncryptedClassLoader(
//                Main.class.getClassLoader()
//        );
//        Class<?> encryptedClass;
//        try {
//            encryptedClass = classLoader.loadClass("com.rvo.rvoserver.server.runRvo");
//            // 获取名为 "waiting" 的静态属性
//        }catch (ClassNotFoundException e ){
//            e.printStackTrace();
//            return Result.error("类加载失败");
//        }
//
//        ArrayList<String> returnValue = new ArrayList<>();
//        try {
//            // 获取RvoRun方法
//            Method method = encryptedClass.getMethod("RvoRun",
//                    Map.class, BlueprintServer.class, BlueprintMapper.class,
//                    int.class, String.class, RvoServer.class, EvaluateServer.class, String.class);
//
//            // 调用静态方法
//            Object returnValueTemp = method.invoke(null, request, blueprintServer, blueprintMapper,
//                    MinPos, projectPath, rvoServer, evaluateServer, venvPath);
//            evaluateServer.setSchedule(bID,0);
//            Field waitingField;
//            boolean waitingValue = true;
//            do {
//                try {
//                    waitingField = encryptedClass.getField("waiting");
//                    // 获取静态属性的值
//                    waitingValue = waitingField.getBoolean(null); // 对于静态字段，第一个参数是 null
//                }catch(NoSuchFieldException e){
//                    e.printStackTrace();
//                }catch(IllegalAccessException e){
//                    e.printStackTrace();
//                }
//                try {
//                    Thread.sleep(50);
//                } catch (InterruptedException e) {
//                    e.printStackTrace();
//                }
//            }while (waitingValue == true);
//
//            returnValue = (ArrayList<String>) returnValueTemp;
//        } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException e) {
//            // 处理异常，比如打印日志或者返回错误结果
//            e.printStackTrace();
//            return Result.error("调用方法失败");
//        }

//        ArrayList<String> returnValue = runRvo.RvoRun(request, blueprintServer, blueprintMapper,
//                MinPos, projectPath, rvoServer, evaluateServer, venvPath);
//        boolean waitingValue = true;
//        do {
//            waitingValue = runRvo.waiting;
//            try {
//                Thread.sleep(50);
//            } catch (InterruptedException e) {
//                e.printStackTrace();
//            }
//        }while (waitingValue == true);
//
//
//        if (returnValue.get(0) == "0"){
//            return  Result.error(returnValue.get(1));
//        }else {
//            System.out.println("模拟完成");
//            return Result.success();
//        }
        String Path1 = projectPath + "/rvo/source/" + bID + "/error.log" ;

        // 使用FileWriter写入文件
        try (FileWriter writer = new FileWriter(Path1)) {
            // 将Map转换为字符串
            String content = mapToString(request);

            // 写入文件
            writer.write(content);
        }

        //解析json
        Gson gson = new Gson();
        String json = gson.toJson(request);
        ArrayList return_message =  new ArrayList();
        //int bID = Integer.parseInt((String) request.get("bID"));

        //将左上角右下角坐标保存到数据库
        HashMap viewInfo = (HashMap) request.get("viewInfo");
        blueprintServer.saveScope(bID, ((Number) viewInfo.get("imgX0")).doubleValue(), ((Number) viewInfo.get("imgY0")).doubleValue(), ((Number) viewInfo.get("imgX1")).doubleValue(), ((Number) viewInfo.get("imgY1")).doubleValue());


        ArrayList<String> selectMethod = (ArrayList<String>) request.get("selectMethod");
        double imgX0 = ((Number) request.get("imgX0")).doubleValue();
        double imgY0 = ((Number) request.get("imgY0")).doubleValue();
        double sT = Double.parseDouble(String.valueOf(request.get("sT")));
        if (selectMethod == null || selectMethod.size() == 0){
            return Result.error("还未选择出口方案");
        }
        String min_Time = "";
        int MTimes = Integer.MAX_VALUE;
        for (String temp_id: selectMethod){

            // 初始化所有元素为0
            int min_cnt = 3000;  // 最小轮次
            int min_peos = -1; // 最多出口人数
            double min_grd = Integer.MAX_VALUE; // 最小剂量
            double min_pre_grd = Integer.MAX_VALUE; // 最小个人剂量

            String[] ids = temp_id.split(",");
            ArrayList<Integer> intArray = new ArrayList<>(); // 创建一个int数组，长度与分割后的字符串数组相同

            for (int i = 0; i < ids.length; i++) {
                intArray.add(Integer.parseInt(ids[i])); // 将每个分割后的字符串转换为int
            }
            List<HashMap> exitLists1 = (List<HashMap>) request.get("exit"); //出口顶点坐标
            for (double k = 0; k < 0.1; k+=0.1){
                String file =  temp_id + "/" + String.valueOf((int)(10*k));
                List<HashMap> navPos = (List<HashMap>) request.get("navPos"); //导航坐标点
                // 获取选择的出口
                List<HashMap> exitLists = new ArrayList<>();
                for (HashMap exit:exitLists1){
                    if (intArray.contains(((Number)exit.get("id")).intValue())){
                        exitLists.add(exit);
                    }
                }
                List<HashMap> rooms = (List<HashMap>) request.get("rooms");
                List<HashMap> peosList = (List<HashMap>) request.get("peos");

                int status = (Integer) (request.get("status")) ;  // 模拟状态，1为路径优先，2为剂量优先
                int kw = (Integer) (request.get("k")) ;  // 模拟时长，0-10；0-20；0-30；0-40
                int weight = transInt (request.get("weight"));  // 剂量比
                double scale = ((Number) request.get("scale")).doubleValue();
                if(exitLists.size() == 0) {
                    return Result.error("没有出口");
                }
                //墙壁
                List<Obstacle> obstacles = new ArrayList<>();
                //房间
                for(int i = 0; i < rooms.size(); i++) {
                    List<HashMap> walls = (List<HashMap>) rooms.get(i).get("walls");
                    for(int j = 0; j < walls.size() - 1; j++) {
                        if(((Number) walls.get(j).get("x")).doubleValue() < MinPos || ((Number) walls.get(j + 1).get("x")).doubleValue() < MinPos) { continue; }
                        Pos A = new Pos(((Number) walls.get(j).get("x")).doubleValue(), ((Number) walls.get(j).get("y")).doubleValue());
                        Pos B = new Pos(((Number) walls.get(j + 1).get("x")).doubleValue(), ((Number) walls.get(j + 1).get("y")).doubleValue());
                        obstacles.add(new Obstacle(obstacles.size() + 1, A, B));
                    }
                }

                List<Exit> exits = new ArrayList<>();
                for(int i = 0; i < exitLists.size(); i++) {
                    Pos exitA = new Pos(((Number) exitLists.get(i).get("x0")).doubleValue(), ((Number) exitLists.get(i).get("y0")).doubleValue());
                    Pos exitB = new Pos(((Number) exitLists.get(i).get("x1")).doubleValue(), ((Number) exitLists.get(i).get("y2")).doubleValue());
                    int numOfPerson = ((Number) exitLists.get(i).get("peoNum")).intValue();
                    String exitName = (String) exitLists.get(i).get("name");
                    Exit exit = new Exit(Long.valueOf((int)exitLists.get(i).get("id")) , exitA, exitB, numOfPerson,exitName);
                    exits.add(exit);
                }
                List<Exit> exitsAll = new ArrayList<>();
                for(int i = 0; i < exitLists1.size(); i++) {
                    Pos exitA = new Pos(((Number) exitLists1.get(i).get("x0")).doubleValue(), ((Number) exitLists1.get(i).get("y0")).doubleValue());
                    Pos exitB = new Pos(((Number) exitLists1.get(i).get("x1")).doubleValue(), ((Number) exitLists1.get(i).get("y2")).doubleValue());
                    int numOfPerson = ((Number) exitLists1.get(i).get("peoNum")).intValue();
                    String exitName = (String) exitLists1.get(i).get("name");
                    Exit exit = new Exit(Long.valueOf((int)exitLists1.get(i).get("id")), exitA, exitB, numOfPerson,exitName);
                    exitsAll.add(exit);
                }

                List<Pos> points = new ArrayList<>();
                for (int i = 0; i < navPos.size(); i++) {
                    int state = 1;
                    ArrayList<Integer> room_id = new ArrayList<>();
                    Pos temp1 = new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue());
                    for(int j = 0; j < rooms.size();j++){
                        List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                        ArrayList<Pos> temp_points = new ArrayList<Pos>();
                        for(int k1 = 0; k1 < walls.size(); k1++) {
                            if(((Number) walls.get(k1).get("x")).doubleValue() > MinPos){
                                Pos temp = new Pos(((Number)walls.get(k1).get("x")).doubleValue(),((Number)walls.get(k1).get("y")).doubleValue());
                                temp_points.add(temp);
                            }
                        }
                        if (NavGrid.isPointInPolygon(temp_points,temp1)){
                            state = 0;
                            room_id.add(j);
                        }
                    }
                    points.add(new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue(),state,room_id));
                }
                try {
                    blueprintServer.saveBlueprintToFile(bID, json);
                }catch (IOException e){
                    return Result.error("文件读取失败");
                }

                //判断是否有误
                Blueprint blueprint = blueprintMapper.getBlueprint(bID);
                GRD grd = new GRD(blueprint.getWidth(), blueprint.getHeight(),weight*100,0);
                grd.setScope(blueprint.getX0(), blueprint.getY0(), blueprint.getX1(), blueprint.getY1());
                boolean grdOK = grd.initFromFile(kw,projectPath + "/rvo/source/" + blueprint.getBlueprintID());
                NavGrid navGrid = new NavGrid(bID, points, obstacles, exits, rooms,peosList, grd, status, projectPath, venvPath,false, file);
                navGrid.generateLines();
                if(!navGrid.isReached()) {
                    return Result.error("导航点无法到达出口");
                }

                //判断所有人能否到出口
//                for(int i = 0; i < rooms.size(); i++) {
//                    List<HashMap> peos = (List<HashMap>) rooms.get(i).get("peos");
//                    for (int j = 0; j < peos.size(); j++) {
//                        if(!navGrid.isToExit(new Pos(((Number) peos.get(j).get("x")).doubleValue(), ((Number) peos.get(j).get("y")).doubleValue()))) {
//                            runRvo.waiting = false;
//                            return_message.add("0");
//                            return_message.add("房间：" + rooms.get(i).get("rid") + "无法到达出口");
//                            return return_message;
//                        }
//                    }
//                }
//                for(int i = 0; i < peosList.size(); i++) {
//                    List<HashMap> peos = (List<HashMap>) peosList.get(i).get("peos");
//                    for (int j = 0; j < peos.size(); j++) {
//                        if(!navGrid.isToExit(new Pos(((Number) peos.get(j).get("x")).doubleValue(), ((Number) peos.get(j).get("y")).doubleValue()))) {
//                            runRvo.waiting = false;
//                            return_message.add("0");
//                            return_message.add("人口片：" + peosList.get(i).get("pid") +"有人无法到达出口");
//                            return return_message;
//                        }
//                    }
//                }

                // 读取模型结果
                String filePath = projectPath + "/rvo/source/" + bID + "/" + file + "/output.json";
                // 读取文件内容
                String content = "";
                try {
                    content = new String(Files.readAllBytes(Paths.get(filePath)));
                }catch (IOException e){
                    return Result.error("文件读取失败");
                }

                JSONArray jsonArray = new JSONArray(content);

                // 创建二维数组
                double[][] roomToExit = new double[jsonArray.length()][];

                // 填充二维数组
                for (int i = 0; i < jsonArray.length(); i++) {
                    JSONArray innerArray = jsonArray.getJSONArray(i);
                    roomToExit[i] = new double[innerArray.length()];
                    for (int j = 0; j < innerArray.length(); j++) {
                        roomToExit[i][j] = innerArray.getDouble(j);
                    }
                }

                //封装数据
                //人
                List<Agent> agents = new ArrayList<>();

                Random random = new Random();
                for(int i = 0; i < rooms.size(); i++) {
                    double high_max = Integer.MIN_VALUE, high_min = Integer.MAX_VALUE;
                    double weight_max = Integer.MIN_VALUE, weight_min = Integer.MAX_VALUE;
                    List<HashMap> temp_walls = (List<HashMap>) rooms.get(i).get("walls");
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
                    for(int kt = 0; kt < walls1.size(); kt++) {
                        if(((Number) walls1.get(kt).get("x")).doubleValue() > MinPos){
                            Pos temp_1 = new Pos(((Number)walls1.get(kt).get("x")).doubleValue(),((Number)walls1.get(kt).get("y")).doubleValue());
                            temp_points1.add(temp_1);
                        }
                    }
                    if (navGrid.isPointInPolygon(temp_points1,temp)){
                        temp = new Pos((weight_min+9*weight_max)/10,(9*high_max+high_min)/10,0,room_id);
                    }

                    for(int j = 0; j < rooms.size(); j++) {
                        if(j != i){
                            List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                            ArrayList<Pos> temp_points = new ArrayList<Pos>();
                            for(int kt = 0; kt < walls.size(); kt++) {
                                if(((Number) walls.get(kt).get("x")).doubleValue() > MinPos){
                                    Pos temp_1 = new Pos(((Number)walls.get(kt).get("x")).doubleValue(),((Number)walls.get(kt).get("y")).doubleValue());
                                    temp_points.add(temp_1);
                                }
                            }
                            if (navGrid.isPointInPolygon(temp_points,temp)){
                                room_id.add(j);
                            }
                        }
                    }
                    List<HashMap> peos = (List<HashMap>) rooms.get(i).get("peos");

                    for (int j = 0; j < peos.size(); j++) {
                        Agent agent = new Agent();
                        agent.setId(agents.size());
                        agent.setRoom_id(room_id);
                        agent.setPos(new Pos(((Number) peos.get(j).get("x")).doubleValue(), ((Number) peos.get(j).get("y")).doubleValue()));
                        // 设置前往的出口
                        for(int w = 0; w < exits.size(); w++){
                            if(roomToExit[i][w] <= 0) continue;
                            else {
                                roomToExit[i][w] -= 1;
                                agent.setExitId(w);
                                break;
                            }
                        }
                        // 为房间内的 agent 分配路径（以房间对应的图节点为起点）
                        assignAgentWaypoints(navGrid, agent, navGrid.getRoomGraphIndexByOrder(i));
                        //判断是否与其他人重合
                        boolean isCoincide = true;
                        while (isCoincide) {
                            isCoincide = false;
                            for (Agent a : agents) {
                                if (a.getPos().equals(agent.getPos())) {
                                    isCoincide = true;
                                    break;
                                }
                            }
                            if (isCoincide) {
                                // xy坐标都随机增加或减少0.3 - 0.6
                                agent.setPos(new Pos(agent.getPos().getX() + (double) ((random.nextInt(2) == 0 ? -1 : 1) * (random.nextInt(30) + 30)) / 100, agent.getPos().getY() + (double) ((random.nextInt(2) == 0 ? -1 : 1) * (random.nextInt(30) + 30)) / 100));
                            }
                        }
                        Object o = ((HashMap) rooms.get(i).get("attr")).get("startTime");
                        agent.setSTime(Double.parseDouble((String) o));
                        double originVel = Double.parseDouble(((String) ((HashMap) rooms.get(i).get("attr")).get("speed"))) / scale / 5;
                        double randomVel = originVel + originVel * (random.nextInt(40) - 20) / 100;
                        agent.setVel(randomVel);
                        agents.add(agent);
                    }
                }
                for(int i = 0; i < peosList.size(); i++) {
                    double high_max = Integer.MIN_VALUE, high_min = Integer.MAX_VALUE;
                    double weight_max = Integer.MIN_VALUE, weight_min = Integer.MAX_VALUE;
                    List<HashMap> temp_walls = (List<HashMap>) peosList.get(i).get("walls");
                    HashMap attr = (HashMap) peosList.get(i).get("attr");
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
                        for(int kt = 0; kt < walls.size(); kt++) {
                            if(((Number) walls.get(kt).get("x")).doubleValue() > MinPos){
                                Pos temp_1 = new Pos(((Number)walls.get(kt).get("x")).doubleValue(),((Number)walls.get(kt).get("y")).doubleValue());
                                temp_points.add(temp_1);
                            }
                        }
                        if (navGrid.isPointInPolygon(temp_points,temp)){
                            room_id.add(j);
                        }
                    }


                    List<HashMap> peos = (List<HashMap>) peosList.get(i).get("peos");
                    for (int j = 0; j < peos.size(); j++) {
                        Agent agent = new Agent();
                        agent.setId(agents.size());

                        agent.setRoom_id(room_id);
                        agent.setPos(new Pos(((Number) peos.get(j).get("x")).doubleValue(), ((Number) peos.get(j).get("y")).doubleValue()));
                        // 设置前往的出口
                        for(int w = 0; w < exits.size(); w++){
                            if(roomToExit[i+ rooms.size()][w] <= 0) continue;
                            else {
                                roomToExit[i+ rooms.size()][w] -= 1;
                                agent.setExitId(w);
                                break;
                            }
                        }

                        assignAgentWaypoints(navGrid, agent, navGrid.getPopulationGraphIndexByOrder(i));

                        //判断是否与其他人重合
                        boolean isCoincide = true;
                        while (isCoincide) {
                            isCoincide = false;
                            for (Agent a : agents) {
                                if (a.getPos().equals(agent.getPos())) {
                                    isCoincide = true;
                                    break;
                                }
                            }
                            if (isCoincide) {
                                // xy坐标都随机增加或减少0.3 - 0.6
                                agent.setPos(new Pos(agent.getPos().getX() + (double) ((random.nextInt(2) == 0 ? -1 : 1) * (random.nextInt(30) + 30)) / 100, agent.getPos().getY() + (double) ((random.nextInt(2) == 0 ? -1 : 1) * (random.nextInt(30) + 30)) / 100));
                            }
                        }

                        Object o = ((HashMap) peosList.get(i).get("attr")).get("startTime");
                        agent.setSTime(Double.parseDouble((String) o));
                        double originVel = Double.parseDouble(((String) ((HashMap) peosList.get(i).get("attr")).get("speed"))) / scale / 2;
                        double randomVel = originVel + originVel * (random.nextInt(40) - 20) / 100;
                        agent.setVel(randomVel);
                        agents.add(agent);
                    }
                }
                try {
                    System.out.println("数据预加载成功，模拟人数" + agents.size());
                    rvoServer.calculatePathWithNav(bID, agents, obstacles, exits, points, scale, rooms, peosList, status,weight, k, file,navGrid,exitsAll,imgX0,imgY0,sT);
                    RvoServerC.mutex = 1;
                    //等待任务结束
                    while(RvoServerC.mutex != 0) {
                        try {
                            Thread.sleep(50);
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }
                }catch (IOException e){
                    return Result.error("模拟失败");
                }

            }
//            //System.out.println(best);
//            for (double k = 0; k < 0.7; k+=0.1) {
//                String file = String.valueOf((int)(10*k));
//                boolean save = false;
//                for (int i = 0; i < best.length; i++){
//                    if (best[i].equals(file)){
//                        save = true;
//                    }
//                }
//                if (!save){
//                    Path path = Paths.get(projectPath + bID + "/" + temp_id + "/"  + file);
//                    try {
//                        deleteFolder(path);
//                    }catch (IOException e){
//                        return Result.error("文件读取失败");
//                    }
//                }
//            }
//            // 先将文件放到8，9，10的位置
//            ArrayList<String> save_files = new ArrayList<>();
//            for (int i = 1; i <=3 ; i++){
//                if (!save_files.contains(best[i-1])){
//                    File file = new File(projectPath + bID + "/" + temp_id + "/"+ best[i-1]);
//                    String temp = String.valueOf(Integer.parseInt(best[i-1]) + 8);
//                    File file1 = new File(projectPath + bID + "/"+ temp_id + "/" + temp);
//                    file.renameTo(file1);
//                    save_files.add(best[i-1]);
//                }
//            }
//            // 按顺序命名
//            for (int i = 1; i <=3 ; i++){
//                String temp = String.valueOf(Integer.parseInt(best[i-1]) + 8);
//                Path sourcePath = Paths.get(projectPath + bID + "/" + temp_id + "/"+ temp);
//                Path targetPath = Paths.get(projectPath + bID + "/" + temp_id + "/"+ i);
//                try {
//                    copyFolder(sourcePath,targetPath);
//                }catch (IOException e){
//                    return Result.error("文件读取失败");
//                }
//
//            }
//            for (String i : save_files){
//                String temp = String.valueOf(Integer.parseInt(i) + 8);
//                Path path = Paths.get(projectPath + bID + "/" + temp_id + "/"+ temp);
//                try {
//                    deleteFolder(path);
//                }catch (IOException e){
//                    return Result.error("文件读取失败");
//                }
//            }
            // 重命名为1
            File file = new File(projectPath + "/rvo/source/" + bID + "/" + temp_id + "/0");
            File file1 = new File(projectPath + "/rvo/source/" + bID + "/"+ temp_id + "/1");
            // 先删除1
            try {
                deleteFolder(Paths.get(projectPath + "/rvo/source/" + bID + "/"+ temp_id + "/1"));
            }catch (NoSuchFileException e){
            }

            file.renameTo(file1); // 重命名
            // 获取模拟时间
            Map<String, Object> res = evaluateServer.getExportStatistics(bID, 1,1,temp_id+"/1");
            int now_cnt = (Integer) res.get("totalTime");
            if (now_cnt<MTimes){
                MTimes = now_cnt;
                min_Time=temp_id;
            }
            // 生成统计文件
            addRect(request,temp_id);;
        }
        evaluateServer.setSchedule(bID,600);
        // 保存项目
        Path sourcePath = Paths.get(projectPath + "/rvo/source/" + bID + "/" + min_Time + "/1");
        Path targetPath = Paths.get(projectPath + "/rvo/source/" + bID + "/1");
        try {
            copyDirectory(sourcePath,targetPath);
        }catch (IOException e){
            e.printStackTrace();
            return Result.error("文件读取失败");
        }
        targetPath = Paths.get(projectPath + "/rvo/source/" + bID);
        try {
            copyDirectory(sourcePath,targetPath);
        }catch (IOException e){
            e.printStackTrace();
            return Result.error("文件读取失败");
        }


        System.out.println("最短时间方案保存成功");
        System.out.println();
        System.out.println("模拟完成");
        return Result.success("模拟成功");
    }


    @PostMapping("/getExitMethods")
    public Result getExitMethods(@RequestBody Map request){
        List<HashMap> exitLists = (List<HashMap>) request.get("exit"); //所有集合点
        Number weight1 =  Double.parseDouble(request.get("weight").toString()); // 集合点剂量阈值
        int peoNumber = 0; // 总人数
        double weight = weight1.doubleValue();
        int numMin = transInt(request.get("numMin"));  // 最多选择出口
        int numMax = transInt(request.get("numMax")) ;  // 最小选择出口
        List<HashMap> navPos = (List<HashMap>) request.get("navPos"); //导航坐标点
        List<HashMap> rooms = (List<HashMap>) request.get("rooms");
        List<HashMap> peosList = (List<HashMap>) request.get("peos");
        Set<Integer> numberMethod = new HashSet<>();
        // 进行初筛
        if (exitLists.size() < numMin){
            return Result.error("集合点数量小于最少选择出口数，请在模拟参数中重新设置");
        }

        List<HashMap<String,Object>> ExitMethods = new ArrayList<>();

        // 计算剂量
        int bID = Integer.parseInt((String) request.get("bID"));
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        GRD grd = new GRD(blueprint.getWidth(), blueprint.getHeight(),0,1);
        grd.setScope(blueprint.getX0(), blueprint.getY0(), blueprint.getX1(), blueprint.getY1());

        boolean grdOK = grd.initFromFile(projectPath + "/rvo/source/" + blueprint.getBlueprintID() + "/GRD_Data/Effective_01-00.GRD");
        List<Exit> validExits = new ArrayList<>();
        ArrayList<Integer> nums = new ArrayList<Integer>();
        ArrayList<Double> ExitGrds = new ArrayList<>();  // 保存每个出口剂量
        for (HashMap exit:exitLists){
            double exitGrds = 0;
            int x0,x1,y0,y1;
            x0 = Math.min(((Number)exit.get("x0")).intValue(),((Number)exit.get("x2")).intValue());
            x1 = Math.max(((Number)exit.get("x0")).intValue(),((Number)exit.get("x2")).intValue());
            y0 = Math.min(((Number)exit.get("y0")).intValue(),((Number)exit.get("y2")).intValue());
            y1 = Math.max(((Number)exit.get("y0")).intValue(),((Number)exit.get("y2")).intValue());
            for (int i = x0; i < x1; i++){
                for (int j = y0; j < y1; j++){
                    exitGrds+=grd.calculate(new Pos(i,j))/ 3600;
                }
            }
            exitGrds /= ((x1-x0)*(y1-y0));
            if (exitGrds < weight){
                Pos exitA = new Pos(((Number) exit.get("x0")).doubleValue(), ((Number) exit.get("y0")).doubleValue());
                Pos exitB = new Pos(((Number) exit.get("x1")).doubleValue(), ((Number) exit.get("y1")).doubleValue());
                int numOfPerson = ((Number) exit.get("peoNum")).intValue();
                String exitName = (String) exit.get("name");
                Exit exit1 = new Exit(((Number)exit.get("id")).longValue(), exitA, exitB, numOfPerson,exitName);
                validExits.add(exit1);
                nums.add(nums.size());
                ExitGrds.add(exitGrds);
            }
            //System.out.println("出口"+exit.get("id") + ":单位面积剂量值为" + exitGrds);
        }
        if (validExits.size() < numMin){
            return Result.error("剂量筛选后，集合点数量小于最少选择出口数，请在模拟参数中重新设置，现可选出口数为: "+validExits.size() );
        }
        //System.out.println("可选最多出口数:"+validExits.size());
        List<Obstacle> obstacles = new ArrayList<>();
        //房间
        for(int i = 0; i < rooms.size(); i++) {
            peoNumber += ((List<HashMap>)rooms.get(i).get("peos")).size();
            List<HashMap> walls = (List<HashMap>) rooms.get(i).get("walls");
            for(int j = 0; j < walls.size() - 1; j++) {
                if(((Number) walls.get(j).get("x")).doubleValue() < MinPos || ((Number) walls.get(j + 1).get("x")).doubleValue() < MinPos) { continue; }
                Pos A = new Pos(((Number) walls.get(j).get("x")).doubleValue(), ((Number) walls.get(j).get("y")).doubleValue());
                Pos B = new Pos(((Number) walls.get(j + 1).get("x")).doubleValue(), ((Number) walls.get(j + 1).get("y")).doubleValue());
                obstacles.add(new Obstacle(obstacles.size() + 1, A, B));
            }
        }
        for(int i = 0; i < peosList.size(); i++) {
            peoNumber += ((List<HashMap>) peosList.get(i).get("peos")).size();
        }
        List<Pos> points = new ArrayList<>();
        for (int i = 0; i < navPos.size(); i++) {
            int state = 1;
            ArrayList<Integer> room_id = new ArrayList<>();
            Pos temp1 = new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue());
            for(int j = 0; j < rooms.size();j++){
                List<HashMap> walls = (List<HashMap>) rooms.get(j).get("walls");
                ArrayList<Pos> temp_points = new ArrayList<Pos>();
                for(int k1 = 0; k1 < walls.size(); k1++) {
                    if(((Number) walls.get(k1).get("x")).doubleValue() > MinPos){
                        Pos temp = new Pos(((Number)walls.get(k1).get("x")).doubleValue(),((Number)walls.get(k1).get("y")).doubleValue());
                        temp_points.add(temp);
                    }
                }
                if (NavGrid.isPointInPolygon(temp_points,temp1)){
                    state = 0;
                    room_id.add(j);
                }
            }
            points.add(new Pos(((Number) navPos.get(i).get("x")).doubleValue(), ((Number) navPos.get(i).get("y")).doubleValue(),state,room_id));
        }

        // 计算最短道路
        NavGrid navGrid = new NavGrid(bID, points, obstacles, validExits, rooms,peosList, grd, 1, projectPath, venvPath,true, "0");
        try {
            navGrid.generateLines();
        } catch (IOException e) {
            return Result.error("路径生成失败：" + e.getMessage());
        }
        List<List<Integer>> MinDistancesExit = navGrid.getMinDistancesExit();
        // 开始排列组合
        numMax = Math.min(validExits.size(),numMax);

        for (int i = numMin; i <= numMax; i++){
            if (i <= 0) continue;
            // 获取组合方案
            List<List<Integer>> result = new ArrayList<>();
            getAllCombinations(nums,i,0, new ArrayList<>(),result);
            // 开始遍历组合方案
            for (List<Integer> combination : result) {
                // 判断是否均可到达出口
                int num = 0;
                for (int temp : combination){
                    num += validExits.get(temp).getNumOfPerson();
                }
                if (num < peoNumber) {
                    //System.out.println("人数不够" + combination + ":" + num + "  " + peoNumber);
                    continue;
                } // 出口无法容纳所有人
                // 计算指标
                // 平均剂量;平均距离;平均时间;平均人数
                boolean can_use = true;
                String ids = ""; // 出口的id
                double avg_grd = 0;
                double avg_dis = 0;
                double avg_time = 0;
                double avg_peo = peoNumber/combination.size();
                for (int temp : combination){
                    avg_grd+=ExitGrds.get(temp);
                    if (ids.isEmpty()){
                        ids+=validExits.get(temp).getId();
                    }else {
                        ids+="," + validExits.get(temp).getId();
                    }
                }
                avg_grd /= combination.size();
                for(int j = 0; j < rooms.size(); j++) {     // 遍历房间
                    if (((List<HashMap>) rooms.get(j).get("peos")).size() > 0){
                        double min_ex = Double.MAX_VALUE;
                        for (int temp : combination){
                            if (min_ex > MinDistancesExit.get(temp).get(navGrid.getRoomIndex(j))){
                                min_ex = MinDistancesExit.get(temp).get(navGrid.getRoomIndex(j));
                            }
                        }
                        if (min_ex == Double.MAX_VALUE){
                            //System.out.println(min_ex);
                            can_use = false;
                            break;
                        }
                        double speed = Double.parseDouble((String)((HashMap)(rooms.get(j).get("attr"))).get("speed"));
                        avg_dis += min_ex * ((List<HashMap>) rooms.get(j).get("peos")).size();
                        //System.out.println(avg_dis);
                        avg_time += (min_ex * ((List<HashMap>) rooms.get(j).get("peos")).size())/(speed/2);  // 计算时间
                    }
                }
                for(int j = 0; j < peosList.size() && can_use; j++) {     // 遍历人口片
                    if (((List<HashMap>) peosList.get(j).get("peos")).size() > 0){
                        double min_ex = Double.MAX_VALUE;
                        for (int temp : combination){
                            if (min_ex > MinDistancesExit.get(temp).get(navGrid.getRoomIndex(j+rooms.size()))){
                                min_ex = MinDistancesExit.get(temp).get(navGrid.getRoomIndex(j+rooms.size()));
                            }
                        }
                        if (min_ex == Double.MAX_VALUE){
                            //System.out.println(combination + " "  + j);
                            can_use = false;
                            break;
                        }
                        double speed = Double.parseDouble((String)((HashMap)(peosList.get(j).get("attr"))).get("speed"));
                        avg_dis += min_ex * ((List<HashMap>) peosList.get(j).get("peos")).size();
                        //System.out.println(avg_dis);
                        avg_time += (min_ex * ((List<HashMap>) peosList.get(j).get("peos")).size())/speed;  // 计算时间
                    }
                }
                if (!can_use) continue;
                avg_dis /= peoNumber;
                avg_time /= peoNumber;
                DecimalFormat df = new DecimalFormat("#.00");
                DecimalFormat df1 = new DecimalFormat("#.00000");
                HashMap methods = new HashMap<>();
                methods.put("method",ids);
                methods.put("number",combination.size());
                methods.put("grd",df1.format(avg_grd));
                methods.put("dis",df.format(avg_dis));
                methods.put("time",df.format(avg_time*2));
                methods.put("peo",df.format(avg_peo));
                // 添加方案
                //System.out.println("add :" + ids);
                ExitMethods.add(methods);
                numberMethod.add(combination.size());
            }
        }
        // 按最短距离排序
        Collections.sort(ExitMethods, new Comparator<HashMap<String, Object>>() {
            @Override
            public int compare(HashMap<String, Object> o1, HashMap<String, Object> o2) {
                Double dis1 = Double.parseDouble((String) o1.get("dis"));
                Double dis2 = Double.parseDouble((String) o2.get("dis"));
                return dis1.compareTo(dis2);
            }
        });
        System.out.println("出口方案生成成功");
        if (ExitMethods.size() == 0){
            HashMap<Integer, Integer> outSide = new HashMap();
            ArrayList<Integer> canNotRoom = new ArrayList<>();
            ArrayList<Integer> canNotPeos = new ArrayList<>();
            for (List<Integer> temp1: MinDistancesExit){
                for(int k = temp1.size() - rooms.size() - peosList.size(); k < temp1.size();k++){
                    if (temp1.get(k) == Integer.MAX_VALUE){
                        if (outSide.containsKey(k)){
                            int value = outSide.get(k);
                            outSide.put(k, value + 1);
                        }else {
                            outSide.put(k,1);
                        }
                    }
                }
            }
            for (Map.Entry<Integer, Integer> entry : outSide.entrySet()) {
                if (entry.getValue() == MinDistancesExit.size()){
                    if (entry.getKey() -MinDistancesExit.get(0).size() + rooms.size() + peosList.size() >= rooms.size()){
                        canNotPeos.add(entry.getKey()-MinDistancesExit.get(0).size() + peosList.size());
                    }else {
                        canNotRoom.add(entry.getKey()-MinDistancesExit.get(0).size() + rooms.size() + peosList.size());
                    }

                }
            }
            if (canNotRoom.size()==0&&canNotPeos.size()==0){
                System.out.println(canNotRoom+ " " + canNotPeos);
            }else {
                return Result.error("出口均不可撤离所有人，请增大剂量阈值，或提高出口数量，或提高出口能容纳人数。");
            }

        }
        HashMap res= new HashMap();
        res.put("ExitMethods",ExitMethods);
        res.put("number",numberMethod);
        return Result.success(res);
 //

    }

    // 获取方案指标
    @PostMapping("/getScheme")
    public Result getScheme(@RequestBody Map request){
        int bID = Integer.parseInt((String) request.get("bID"));
        ArrayList<String> selectMethod = (ArrayList<String>) request.get("selectMethod");
        ArrayList<HashMap> msg = new ArrayList<>();

        DecimalFormat df1 = new DecimalFormat("#.00000");
        for (String temp_id: selectMethod){
            // 记录时间优先方案的最小时间，最小剂量，最大个人剂量最小
            // 记录最小时间，最小剂量，最大个人剂量最小
            HashMap result = new HashMap();
            String file = temp_id + "/1";
            String[] fruits = temp_id.split(",");
            Map<String, Object> res = evaluateServer.getExportStatistics(bID, 1,1,file);
            int now_cnt = (Integer) res.get("totalTime");
            // 剂量
            res = evaluateServer.getGRD(bID,1, file);
            double now_grd = ((ArrayList<Double>)res.get("grd")).get(((ArrayList<Double>)res.get("grd")).size()-1);
            // 个人剂量
            res = evaluateServer.getPerGRD(bID,1,file);
            double now_pre_grd = (double) res.get("max_grd");
            result.put("method",temp_id);
            result.put("number",fruits.length);
            result.put("time",now_cnt);
            result.put("grd",df1.format(now_grd));
            result.put("now_pre_grd",df1.format(now_pre_grd));
            int number = 0;
            List<Double> density1 = getDensity_1(request,temp_id);
            List<HashMap> exitLists = (List<HashMap>) request.get("rect");
            for (int i = 0; i < density1.size();i++){
                Object limitObject = exitLists.get(i).get("limit");
                double limitDouble = 0;
                if (limitObject instanceof String) {
                    limitDouble = Double.parseDouble((String) limitObject);
                } else if (limitObject instanceof Integer) {
                    limitDouble = ((Integer) limitObject).doubleValue();
                }
                if (limitDouble< density1.get(i)){
                    number++;
                }
            }
            result.put("peo",number);
            result.put("ks",density1);
            msg.add(result);
        }
        System.out.println("方案指标计算成功");
        return Result.success(msg);
    }

    //获取方案指标
    @PostMapping("/SchemeData")
    public Result SchemeData(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));

        ArrayList<HashMap> msg = new ArrayList<>();

        DecimalFormat df1 = new DecimalFormat("#.00000");
            // 记录时间优先方案的最小时间，最小剂量，最大个人剂量最小
            // 记录最小时间，最小剂量，最大个人剂量最小
            HashMap result = new HashMap();
            String file = "/1";
            Map<String, Object> res = evaluateServer.getExportStatistics(bID, 1,1,file);
            int now_cnt = (Integer) res.get("totalTime");
            // 剂量
            res = evaluateServer.getGRD(bID,1, file);
            double now_grd = ((ArrayList<Double>)res.get("grd")).get(((ArrayList<Double>)res.get("grd")).size()-1);
            // 个人剂量
            res = evaluateServer.getPerGRD(bID,1,file);
            double now_pre_grd = (double) res.get("max_grd");
            result.put("time",now_cnt);
            result.put("grd",df1.format(now_grd));
            result.put("pre_grd",df1.format(now_pre_grd));
            int number = 0;
            List<Double> density1 = getDensity_1(request,"");
            List<HashMap> exitLists = (List<HashMap>) request.get("rect");
            for (int i = 0; i < density1.size();i++){
                Object limitObject = exitLists.get(i).get("limit");
                double limitDouble = 0;
                if (limitObject instanceof String) {
                    limitDouble = Double.parseDouble((String) limitObject);
                } else if (limitObject instanceof Integer) {
                    limitDouble = ((Integer) limitObject).doubleValue();
                }
                if (limitDouble< density1.get(i)){
                    number++;
                }
            }
            result.put("crowdedAreas",number);
            msg.add(result);
        System.out.println("方案指标计算成功");
        return Result.success(msg);
    }

    // 保存方案
    @PostMapping("/saveMethod")
    public Result saveMethod(@RequestBody Map request){
        int bID = Integer.parseInt((String) request.get("bID"));
        String selectMethod =  request.get("selectMethod").toString();
        ArrayList<String> selectMethods = (ArrayList<String>) request.get("selectMethods");
        if (selectMethod == ""){
            return Result.error("请选择一个方案");
        }

        Path sourcePath = Paths.get(projectPath + "/rvo/source/" + bID + "/" + selectMethod + "/1");
        Path targetPath = Paths.get(projectPath + "/rvo/source/" + bID + "/1");
        try {
            copyDirectory(sourcePath,targetPath);
        }catch (IOException e){
            e.printStackTrace();
            return Result.error("文件读取失败");
        }
        targetPath = Paths.get(projectPath, "rvo","source", String.valueOf(bID));
        try {
            copyDirectory(sourcePath,targetPath);
        }catch (IOException e){
            e.printStackTrace();
            return Result.error("文件读取失败");
        }


        System.out.println("选择方案保存成功");
        return Result.success("项目文件保存成功");
    }

    //判断当前是否有任务正在执行
    @GetMapping("/isRunning")
    public boolean isRunning() {
        return RvoServerC.mutex != 0;
    }

    @GetMapping("/hasReplay")
    public boolean hasReplay(HttpServletRequest request) {
        int bID = Integer.parseInt(request.getHeader("bID"));
        return blueprintServer.hasReplay(bID);
    }

    @PostMapping("/getReplay")
    public Result getReplay(HttpServletRequest request) {
        int bID = Integer.parseInt(request.getHeader("bID"));
        blueprintServer.getReplay(bID);
        return null;
    }

    @GetMapping("/stream")
    public ResponseEntity<StreamingResponseBody> stream() {
        StreamingResponseBody stream = out -> {
            for (int i = 0; i < 10; i++) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                out.write(("This is line " + i + "\n").getBytes());
                out.flush();
            }
        };
        return ResponseEntity.ok().body(stream);
    }

    @GetMapping("/getReplay")
    public void getReplay(HttpServletResponse response) throws IOException, InterruptedException, ClassNotFoundException {

        ObjectInputStream ois = new ObjectInputStream(new FileInputStream("D:\\vue\\record\\21b4fd8c-abcb-4875-95a0-d0a71c82264c.rvo"));
        List<List<Map<String, Integer>>> replay = (List<List<Map<String, Integer>>>) ois.readObject();

        // 响应流
        response.setHeader("Content-Type", "text/event-stream");
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Pragma", "no-cache");
        ServletOutputStream out = null;
        try {
            out = response.getOutputStream();
            for (int i = 0; i < replay.size(); i++) {
                out.write(replay.get(i).get(0).toString().getBytes());
                // 更新数据流
                out.flush();
                Thread.sleep(100);
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (out != null) out.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    @PostMapping("/getReplayData")
    public Result getReplayData(@RequestBody Map request) throws IOException, InterruptedException, ClassNotFoundException {
        int bID = Integer.parseInt((String) request.get("bID"));
        int status = Integer.parseInt(request.get("status").toString());
        String file = String.valueOf(request.get("file"));
        Map<String, Object> res = evaluateServer.getReplayData(bID,status,file);
        if(res == null) { return Result.error("获取失败"); }
        //System.out.println(res);
        return Result.success(res);

    }

    //获取当前模拟状态及进度
    @Autowired(required = false)
    private StageProgressRegistry stageProgressRegistry;

    @PostMapping("/getState")
    public Result getState(@RequestBody Map request) {
//        System.out.println((String) request.get("bID"));
        int bID = Integer.parseInt((String) request.get("bID"));
        Map<String, Object> res = new HashMap<>();
        int rawSchedule = evaluateServer.getSchedule(bID);
        res.put("state", evaluateServer.getState(bID)/6);
        res.put("schedule", rawSchedule/6);
        if (stageProgressRegistry != null) {
            String stageMessage = stageProgressRegistry.resolveStageMessage(bID, rawSchedule);
            String stageKeyword = stageProgressRegistry.getStageKeyword(bID).orElse(null);
            System.out.println("[STATE DEBUG] bID=" + bID + ", rawSchedule=" + rawSchedule + ", stageKeyword=" + stageKeyword + ", stageMessage=" + stageMessage);
            res.put("stageMessage", stageMessage);
        }
        return Result.success(res);
    }


    @PostMapping("/getReplayFlat")
    public Result getReplayFlat(@RequestBody Map request) throws IOException, ClassNotFoundException {
        int status = (Integer) request.get("status");
        int bID = Integer.parseInt((String) request.get("bID"));
        int flat = (Integer) request.get("flat");
        String file = String.valueOf(request.get("file"));
        List<List<Map<String, Object>>> res = evaluateServer.getReplayFlat(bID, flat,status, file);
        return Result.success(res);
    }

    @PostMapping("/getReplayFlatStream")
    public void getReplayFlatStream(@RequestBody Map request, HttpServletResponse response) throws IOException, ClassNotFoundException {
        int bID = Integer.parseInt((String) request.get("bID"));
        int flat = (Integer) request.get("flat");
        int status = (Integer) request.get("status");
        String file = String.valueOf(request.get("file"));

        // 响应流
        response.setHeader("Content-Type", "text/event-stream");
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Pragma", "no-cache");
        ServletOutputStream out = null;
        try {
            out = response.getOutputStream();
            evaluateServer.getReplayFlat(bID, flat,status, file,out);
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (out != null) out.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

    }

    @GetMapping("/getReplayFlatStream2")
    public void getReplayFlatStream2(HttpServletRequest request, HttpServletResponse response) throws IOException, ClassNotFoundException {
        int bID = Integer.parseInt(request.getParameter("bID"));
        int flat = Integer.parseInt(request.getParameter("flat"));
        int status =  Integer.parseInt(request.getParameter("status"));
        String file = (String) request.getParameter("file");
//        System.out.println(bID + " " + flat);

        // 响应流
        response.setHeader("Content-Type", "text/event-stream");
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Pragma", "no-cache");
        ServletOutputStream out = null;
        try {
            out = response.getOutputStream();
            evaluateServer.getReplayFlat2(bID, flat,status, file, out);
            out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (out != null) out.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

    }

    //获取每个出口的统计人数
    @PostMapping("/getExportStatistics")
    public Result getExportStatistics(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        int status = Integer.parseInt(request.get("status").toString());
        int unit;
        String file = String.valueOf(request.get("file"));
        if (request.containsKey("unit")) {
            unit = (int) (((Number) request.get("unit")).doubleValue() * 100);
        } else {
            unit = 1;
        }
        Map<String, Object> res = evaluateServer.getExportStatistics(bID, unit,status,file);
        if(res == null) { return Result.error("请先模拟执行"); }
        //System.out.println(res);
        return Result.success(res);
    }

    // 清除老的方案
    @PostMapping("/deleteOldMethod")
    public Result deleteOldMethod(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        ArrayList<String> selectMethods = (ArrayList<String>) request.get("selectMethods");
        for (String file:selectMethods){
            Path path = Paths.get(projectPath, "rvo","source", String.valueOf(bID), file);
                try {
                    deleteFolder(path);
                }catch (IOException e){
                    //System.out.println(e.getMessage());
                }
        }
        return Result.success("success");
    }

    // 获取每个方案统计人数
    @PostMapping("/getMethodStatistics")
    public Result getMethodStatistics(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        ArrayList<String> selectMethods = (ArrayList<String>) request.get("selectMethods");
        ArrayList< Map<String, Object>> res = new ArrayList<>();
        int time = 0;
        List<Double> times = new ArrayList<>();
        for (String file:selectMethods){
            Map<String, Object> res1 = evaluateServer.getExportStatistics(bID, 1,1,file + "/1");
            res.add(res1);
            if (time < ((Number)res1.get("totalTime")).intValue()){
                time = ((Number)res1.get("totalTime")).intValue();
                times = (List<Double>)res1.get("time");
            }
        }

        HashMap result = new HashMap<>();
        result.put("res",res);
        result.put("time",times);

        //System.out.println(res);
        return Result.success(result);
    }


    //获取模拟时间
    @PostMapping("/getTime")
    public Result getTime(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        double res = evaluateServer.getTime(bID);
        return Result.success(res);
    }

    //获取热力图
    @PostMapping("/getHeatMap")
    public Result getHeatMap(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        List<List<Map<String, Integer>>> res = evaluateServer.getHeatMap(bID);
        return Result.success(res);
    }

    //获取剂量场统计
    @PostMapping("/getGRD")
    public Result getGRD(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        int status = Integer.parseInt(request.get("status").toString());
        String file = String.valueOf(request.get("file"));
        Map<String, Object> res = evaluateServer.getGRD(bID,status, file);
        if(res == null) { return Result.error("请重新模拟执行"); }
        return Result.success(res);
    }

    //获取方案剂量场统计
    @PostMapping("/getMethodGRD")
    public Result getMethodGRD(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        ArrayList<String> selectMethods = (ArrayList<String>) request.get("selectMethods");
        ArrayList< Map<String, Object>> res = new ArrayList<>();
        int time = 0;
        List<Double> times = new ArrayList<>();
        for (String file:selectMethods){
            Map<String, Object> res1 = evaluateServer.getGRD(bID, 1,file + "/1");
            res.add(res1);
            if (time < ((Number)res1.get("totalTime")).intValue()){
                time = ((Number)res1.get("totalTime")).intValue();
                times = (List<Double>)res1.get("time");
            }
        }

        HashMap result = new HashMap<>();
        result.put("res",res);
        result.put("time",times);

        //System.out.println(res);
        return Result.success(result);
    }

    //获取个人剂量场统计
    @PostMapping("/getMethodPerGRD")
    public Result getMethodPerGRD(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        ArrayList<String> selectMethods = (ArrayList<String>) request.get("selectMethods");
        ArrayList< Map<String, Object>> res = new ArrayList<>();
        int time = 0;
        List<Double> times = new ArrayList<>();
        for (String file:selectMethods){
            Map<String, Object> res1 = evaluateServer.getPerGRD(bID, 1,file + "/1");
            res.add(res1);
            if (time < ((Number)res1.get("totalTime")).intValue()){
                time = ((Number)res1.get("totalTime")).intValue();
                times = (List<Double>)res1.get("time");
            }
        }

        HashMap result = new HashMap<>();
        result.put("res",res);
        result.put("time",times);

        //System.out.println(res);
        return Result.success(result);
    }

    // 获取方案拥挤区域
    @PostMapping("/getMethodDen")
    public Result getMethodDen(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        ArrayList<String> selectMethods = (ArrayList<String>) request.get("selectMethods");
        ArrayList< Map<String, Object>> res = new ArrayList<>();
        for (String file:selectMethods){
            List<Double> density1 = getDensity_1(request,file);
            List<HashMap> exitLists = (List<HashMap>) request.get("rect");
            int number = 0;
            for (int i = 0; i < density1.size();i++){
                Object limitObject = exitLists.get(i).get("limit");
                double limitDouble = 0;
                if (limitObject instanceof String) {
                    limitDouble = Double.parseDouble((String) limitObject);
                } else if (limitObject instanceof Integer) {
                    limitDouble = ((Integer) limitObject).doubleValue();
                }
                if (limitDouble< density1.get(i)){
                    number++;
                }
            }
            HashMap result = new HashMap<>();
            result.put("peo",number);
            res.add(result);
        }

        HashMap result = new HashMap<>();
        result.put("res",res);
        //System.out.println(res);
        return Result.success(result);
    }

    //获取方案个人剂量场统计
    @PostMapping("/getPerGRD")
    public Result getPerGRD(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        int status = Integer.parseInt(request.get("status").toString());
        String file = String.valueOf(request.get("file"));
        Map<String, Object> res = evaluateServer.getPerGRD(bID,status,file);
        if(res == null) { return Result.error("请重新模拟执行"); }
        return Result.success(res);
    }

    //添加框
    public Result addRect(@RequestBody Map request,String fileName) throws IOException {
        int bID = Integer.parseInt((String) request.get("bID"));

        List<HashMap> exitLists = (List<HashMap>) request.get("rect"); //出口顶点坐标
        if (exitLists != null){
            List<DensityRect> rects = new ArrayList<>();
            for(int i = 0; i < exitLists.size(); i++) {
                Pos rectA = new Pos(((Number) exitLists.get(i).get("x0")).doubleValue(), ((Number) exitLists.get(i).get("y0")).doubleValue());
                Pos rectB = new Pos(((Number) exitLists.get(i).get("x1")).doubleValue(), ((Number) exitLists.get(i).get("y1")).doubleValue());
                double begin = ((Number) exitLists.get(i).get("begin")).doubleValue();
                double end = ((Number) exitLists.get(i).get("end")).doubleValue();
                DensityRect rect = new DensityRect((long) i, rectA, rectB, begin, end);
                rects.add(rect);
            }
            double imgX0 = ((Number) request.get("imgX0")).doubleValue();
            double imgY0 = ((Number) request.get("imgY0")).doubleValue();
            double imgX1 = ((Number) request.get("imgX1")).doubleValue();
            double imgY1 = ((Number) request.get("imgY1")).doubleValue();
            evaluateServer.calDensity(bID, rects, imgX0, imgY0, imgX1, imgY1,fileName);
        }


        return Result.success("添加成功");
    }
    public Result addRect1(@RequestBody Map request,String fileName) throws IOException {
        int bID = Integer.parseInt((String) request.get("bID"));

        List<HashMap> exitLists = (List<HashMap>) request.get("rect"); //出口顶点坐标
        List<DensityRect> rects = new ArrayList<>();
        for(int i = 0; i < exitLists.size(); i++) {
            Pos rectA = new Pos(((Number) exitLists.get(i).get("x0")).doubleValue(), ((Number) exitLists.get(i).get("y0")).doubleValue());
            Pos rectB = new Pos(((Number) exitLists.get(i).get("x1")).doubleValue(), ((Number) exitLists.get(i).get("y1")).doubleValue());
            double begin = ((Number) exitLists.get(i).get("begin")).doubleValue();
            double end = ((Number) exitLists.get(i).get("end")).doubleValue();
            DensityRect rect = new DensityRect((long) i, rectA, rectB, begin, end);
            rects.add(rect);
        }
        double imgX0 = ((Number) request.get("imgX0")).doubleValue();
        double imgY0 = ((Number) request.get("imgY0")).doubleValue();
        double imgX1 = ((Number) request.get("imgX1")).doubleValue();
        double imgY1 = ((Number) request.get("imgY1")).doubleValue();
        evaluateServer.calDensity1(bID, rects, imgX0, imgY0, imgX1, imgY1,fileName);

        return Result.success("添加成功");
    }

    //获取密度
    @PostMapping("/getDensity")
    public Result getDensity(@RequestBody Map request) {
        try {
            addRect1(request,"1");
        }catch (IOException e){
            e.printStackTrace();
        }
        int bID = Integer.parseInt((String) request.get("bID"));
        List<Double> res = evaluateServer.getDensity1(bID,"1");
        if(res == null) {
            Result.error("文件读取失败");
        }
        if(res.size() == 0) { return Result.error("正在计算中"); }
        return Result.success(res);
    }

    public List<Double> getDensity_1(Map request,String fileName) {
        try {
            addRect(request,fileName);
        }catch (IOException e){
            e.printStackTrace();
        }
        int bID = Integer.parseInt((String) request.get("bID"));
        List<Double> res = evaluateServer.getDensity(bID,fileName);
        if(res == null) {
            return new ArrayList<>();
        }
        if(res.size() == 0) { return new ArrayList<>(); }
        return res;
    }

    //获取方案信息
    @PostMapping("/getMethodInfoAll")
    public Result getMethodInfoAll(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        // 记录最小时间，最小剂量，最大个人剂量最小
        Map<String, Object> res1 = getMethodInfo_1(bID,"1");
        // 剂量
        Map<String, Object> res2 = getMethodInfo_1(bID,"2");
        // 个人剂量
        Map<String, Object> res3 = getMethodInfo_1(bID,"3");
        if(res1 == null || res2 == null || res3 == null)
        { return Result.error("请先模拟执行"); }
        Map<String, Object> res = new HashMap<>();
        res.put("res1",res1);
        res.put("res2",res2);
        res.put("res3",res3);

        return Result.success(res);
    }

    //获取方案信息
    @PostMapping("/getMethodInfo")
    public Result getMethodInfo(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        String file = String.valueOf(request.get("file"));
        // 记录最小时间，最小剂量，最大个人剂量最小
        Map<String, Object> res = getMethodInfo_1(bID,file);
        if(res == null)
        { return Result.error("请先模拟执行"); }

        return Result.success(res);
    }

    public Map<String, Object> getMethodInfo_1(int bID,String file) {
        // 记录最小时间，最小剂量，最大个人剂量最小
        Map<String, Object> res1 = evaluateServer.getExportStatistics(bID, 1,1,file);
        // 剂量
        Map<String, Object> res2 = evaluateServer.getGRD(bID,1, file);
        // 个人剂量
        Map<String, Object> res3 = evaluateServer.getPerGRD(bID,1,file);
        if(res1 == null || res2 == null || res3 == null)
        { return null; }
        res2.put("grdSize",((ArrayList<Double>)res2.get("grd")).size());
        Map<String, Object> res = new HashMap<>();
        res.put("evacuation",res1);
        res.put("globalGrd",res2);
        res.put("perGrd",res3);

        return res;
    }



    @GetMapping("/check")
    public Result check(int bID, int status,String fileName) throws IOException {
        jsonServer.checkFile(bID,status,fileName);
        return Result.success();
    }


    // 获得改定组合方案
    private static void getAllCombinations(ArrayList<Integer> nums, int n, int start, List<Integer> currentCombination, List<List<Integer>> result) {
        if (n == 0) {
            // 如果n为0，表示一个组合已经生成
            result.add(new ArrayList<>(currentCombination));
            return;
        }

        for (int i = start; i <= nums.size() - n; i++) {
            // 添加当前元素到组合中
            currentCombination.add(nums.get(i));
            // 递归调用，寻找下一个元素，n减1
            getAllCombinations(nums, n - 1, i + 1, currentCombination, result);
            // 回溯，移除最后添加的元素
            currentCombination.remove(currentCombination.size() - 1);
        }
    }
    // 复制文件
    public static void copyFolder(Path source, Path target) throws IOException {
        // 确保目标路径不存在，或者是一个空目录
        if (Files.notExists(target)) {
            Files.createDirectories(target);
        }

        Files.walkFileTree(source, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                // 创建目标目录
                Path targetDir = target.resolve(source.relativize(dir));
                Files.copy(dir, targetDir, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                // 复制文件
                Path targetFile = target.resolve(source.relativize(file));
                copyWithRetry(file, targetFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    //删除文件
    public static void deleteFolder(Path path) throws IOException {
        Files.walkFileTree(path, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                try {
                    Files.delete(file);
                }catch (Exception e){
                    deleteWithRetry(file);
                    System.out.println(e.getMessage());
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                if (exc == null) {
                    deleteWithRetry(dir);
                    return FileVisitResult.CONTINUE;
                } else {
                    throw exc;
                }
            }
        });
    }

    private static void deleteWithRetry(Path path) throws IOException {
        while (true) {
            try {
                Files.delete(path);
                return; // 删除成功，退出循环
            } catch (IOException e) {
                try {
                    Thread.sleep(50); // 等待一段时间后重试
                    System.out.println(e.getMessage());
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt(); // 重置中断状态
                    throw new IOException("Delete operation interrupted", ie);
                }
            }
        }
    }

    private static void waitForJsonIfNeeded(Path source) throws IOException {
        if (!"result-json.rvo".equalsIgnoreCase(source.getFileName().toString())) {
            return;
        }
        final int maxWaitMs = 5000;
        int waited = 0;
        while (JsonServerA.writing != 0 && waited < maxWaitMs) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted while waiting for result-json.rvo to be released", e);
            }
            waited += 100;
        }
    }

    // 复制文件
    public static void copyDirectory(Path sourceDir, Path targetDir) throws IOException {
        Files.walkFileTree(sourceDir, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                // 在目标目录中创建对应的子目录
                Path targetSubDir = targetDir.resolve(sourceDir.relativize(dir));
                Files.createDirectories(targetSubDir);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                // 复制文件到目标目录
                Path targetFile = targetDir.resolve(sourceDir.relativize(file));
                copyWithRetry(file, targetFile, StandardCopyOption.REPLACE_EXISTING);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    private static void copyWithRetry(Path source, Path target, CopyOption... options) throws IOException {
        final int maxAttempts = 10;
        int attempt = 0;
        waitForJsonIfNeeded(source);
        while (true) {
            try {
                Files.copy(source, target, options);
                return;
            } catch (FileSystemException e) {
                attempt++;
                if (attempt >= maxAttempts) {
                    if ("result-json.rvo".equalsIgnoreCase(source.getFileName().toString())) {
                        System.err.println("Skip copying locked result-json.rvo: " + source);
                        return;
                    }
                    throw e;
                }
                try {
                    Thread.sleep(100);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IOException("Copy operation interrupted", ie);
                }
            }
        }
    }

    private void assignAgentWaypoints(NavGrid navGrid, Agent agent, int graphIndex) {
        if (navGrid == null || agent == null) {
            return;
        }

        agent.clearWaypoints();
        if (graphIndex >= 0) {
            agent.setGraphNodeIndex(graphIndex);
        } else {
            agent.setGraphNodeIndex(null);
        }

        int exitId = agent.getExitId();
        if (exitId < 0) {
            return;
        }

        List<double[]> waypoints = navGrid.getWaypointCoordinates(exitId, graphIndex);
        if (waypoints == null || waypoints.isEmpty()) {
            return;
        }

        for (double[] point : waypoints) {
            if (point == null || point.length < 2) {
                continue;
            }
            agent.addWaypoint(new Pos(point[0], point[1]));
        }
    }

    public int transInt(Object o){
        int num = 0;
        if (o instanceof String) {
            num = Integer.parseInt((String) o);
        } else if (o instanceof Integer) {
            num = ((Integer) o).intValue();
        }else if (o instanceof Double) {
            num = ((Double) o).intValue();
        }else {
            return  (int)o;
        }
        return  num;
    }
    public double transDouble(Object o){
        double num = 0;
        if (o instanceof String) {
            num = Double.parseDouble((String) o);
        } else if (o instanceof Double) {
            num = ((Double) o).intValue();
        }else if (o instanceof Integer) {
            num = ((Double) o).intValue();
        }
        return (double) num;
    }
    private String mapToString(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            sb.append(entry.getKey())
                    .append(": ")
                    .append(entry.getValue())
                    .append(System.lineSeparator()); // 添加换行符
        }
        return sb.toString();
    }

}
