//package com.rvo.rvoserver.server.impl;
//
//import com.google.gson.Gson;
//import com.google.gson.reflect.TypeToken;
//import com.rvo.rvoserver.Mapper.BlueprintMapper;
//import com.rvo.rvoserver.pojo.Blueprint;
//import com.rvo.rvoserver.pojo.Record;
//import com.rvo.rvoserver.server.BlueprintServer;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Component;
//
//import java.lang.reflect.Type;
//import java.util.ArrayList;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//
//
//public class BlueprintServerA implements BlueprintServer {
//
//    @Autowired
//    BlueprintMapper blueprintMapper;
//
//    @Value("${path.projectPath}")
//    private String projectPath;
//
//    @Override
//    public int createBlueprint(String name) {
//        Blueprint blueprint = new Blueprint();
//        blueprint.setBName(name);
//        blueprintMapper.createBlueprint(blueprint);
//        blueprintMapper.saveBlueprint(blueprint.getBlueprintID(), null);
//        //创建项目文件夹
//        return blueprint.getBlueprintID();
//    }
//
//    @Override
//    public int createBlueprint(String name, String background, int height, int width) {
//        Blueprint blueprint = new Blueprint();
//        blueprint.setBName(name);
//        blueprint.setBackground(background);
//        blueprint.setHeight(height);
//        blueprint.setWidth(width);
//        blueprintMapper.createBlueprint(blueprint);
//        blueprintMapper.saveBlueprint(blueprint.getBlueprintID(), null);
//        return blueprint.getBlueprintID();
//    }
//
//    @Override
//    public List<Map<String, Object>> listBlueprint() {
//        List<Blueprint> blueprints = blueprintMapper.listBlueprint();
//        List<Map<String, Object>> res = new ArrayList<>();
//        for (Blueprint blueprint : blueprints) {
//            Map<String, Object> m = new HashMap<>();
//            m.put("ID", blueprint.getBlueprintID());
//            m.put("name", blueprint.getBName());
//            m.put("background", blueprint.getBackground());
//            m.put("time", blueprint.getCTime());
//            res.add(m);
//        }
//        return res;
//    }
//
//    @Override
//    public int setBg(int bID, String s) {
//        blueprintMapper.setBg(bID, s);
//        return 0;
//    }
//
//    @Override
//    public Map<String, Object> getBlueprint(int bID) {
//        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
//        List<Record> records = blueprintMapper.getRecords(bID);
//        Map<String, Object> res = new HashMap<>();
//        if(blueprint == null) { return null; }
//        res.put("background", blueprint.getBackground());
//        res.put("name", blueprint.getBName());
//        res.put("width", blueprint.getWidth());
//        res.put("height", blueprint.getHeight());
////        res.put("blueprintJson", records.get(0).getBlueprintJson());
//        if(records.size() == 0) {
//            res.put("navPos", new ArrayList<>());
//            res.put("agentPos", new ArrayList<>());
//            res.put("wallArr", new ArrayList<>());
//            res.put("exit", new ArrayList<>());
//            res.put("rooms", new ArrayList<>());
//            return res;
//        }
//        //解析json
//        Gson gson = new Gson();
//        Type type = new TypeToken<Map<String, Object>>() {}.getType();
//        Map<String, Object> map = gson.fromJson(records.get(0).getBlueprintJson(), type);
//
//        if(map == null) {
//            res.put("navPos", new ArrayList<>());
//            res.put("agentPos", new ArrayList<>());
//            res.put("wallArr", new ArrayList<>());
//            res.put("exit", new ArrayList<>());
//            res.put("rooms", new ArrayList<>());
//            return res;
//        }
//
//        res.putAll(map);
//        return res;
//    }
//
//    @Override
//    public int saveBlueprint(int bID, String json) {
//        blueprintMapper.saveRecord(bID, json);
//        //更新时间
//        blueprintMapper.updateTime(bID);
//        return 0;
//    }
//
//    @Override
//    public boolean hasReplay(int bID) {
//        List<Record> records = blueprintMapper.getRecords(bID);
//        return records.size() > 0 && records.get(0).isHasReplay();
//    }
//
//    @Override
//    public void getReplay(int bID) {
//
//    }
//
//    @Override
//    public void setSize(int bID, int width, int height) {
//        blueprintMapper.setSize(bID, width, height);
//    }
//}
