package com.rvo.rvoserver.server.impl;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.rvo.rvoserver.Mapper.BlueprintMapper;
import com.rvo.rvoserver.pojo.Blueprint;
import com.rvo.rvoserver.server.BlueprintServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.lang.reflect.Type;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;

@Component
@Slf4j
public class BlueprintServerB implements BlueprintServer {

    @Autowired
    BlueprintMapper blueprintMapper;

    @Value("${path.projectPath}")
    private String projectPath;

    private Path resolveSourcePath(int bID, String... children) {
        String[] segments = new String[children.length + 1];
        segments[0] = String.valueOf(bID);
        if (children.length > 0) {
            System.arraycopy(children, 0, segments, 1, children.length);
        }
        return Paths.get(projectPath, segments);
    }

    private void deleteSourceDirectory(int bID) throws IOException {
        Path sourcePath = resolveSourcePath(bID);
        if (!Files.exists(sourcePath)) {
            return;
        }

        Files.walkFileTree(sourcePath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.deleteIfExists(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                Files.deleteIfExists(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    @Override
    public int createBlueprint(String name, String description, String background, int height, int width, String addr) {
        Blueprint blueprint = new Blueprint();
        blueprint.setBName(name);
        blueprint.setBackground(background);
        blueprint.setHeight(height);
        blueprint.setWidth(width);
        blueprint.setDescription(description);
        blueprint.setAddr(addr);
        blueprintMapper.createBlueprint(blueprint);
        return blueprint.getBlueprintID();
    }

    @Override
    public List<Map<String, Object>> listBlueprint() {
        List<Blueprint> blueprints = blueprintMapper.listBlueprint();
        List<Map<String, Object>> res = new ArrayList<>();
        for (Blueprint blueprint : blueprints) {
            Map<String, Object> m = new HashMap<>();
            m.put("ID", blueprint.getBlueprintID());
            m.put("name", blueprint.getBName());
            m.put("background", blueprint.getBackground());
            m.put("cTime", blueprint.getCTime());
            m.put("description", blueprint.getDescription());
            m.put("uTime", blueprint.getUpdateTime());
            m.put("addr", blueprint.getAddr());
            res.add(m);
        }
        return res;
    }

    @Override
    public int setBg(int bID, String s) {
        blueprintMapper.setBg(bID, s);
        return 0;
    }

    @Override
    public Map<String, Object> getBlueprint(int bID) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        // List<Record> records = blueprintMapper.getRecords(bID);
        Map<String, Object> res = new HashMap<>();
        if (blueprint == null) {
            return null;
        }
        // res.put("background", blueprint.getBackground());
        // res.put("name", blueprint.getBName());
        // res.put("width", blueprint.getWidth());
        // res.put("height", blueprint.getHeight());
        // res.put("blueprintJson", records.get(0).getBlueprintJson());
        if (blueprint.getBlueprintJson() == null) {
            // res.put("navPos", new ArrayList<>());
            // res.put("agentPos", new ArrayList<>());
            // res.put("wallArr", new ArrayList<>());
            // res.put("exit", new ArrayList<>());
            // res.put("rooms", new ArrayList<>());
            return null;
        }

        // 解析json
        Gson gson = new Gson();
        Type type = new TypeToken<Map<String, Object>>() {
        }.getType();
        Map<String, Object> map = gson.fromJson(blueprint.getBlueprintJson(), type);

        if (map == null) {
            // res.put("navPos", new ArrayList<>());
            // res.put("agentPos", new ArrayList<>());
            // res.put("wallArr", new ArrayList<>());
            // res.put("exit", new ArrayList<>());
            // res.put("rooms", new ArrayList<>());
            return null;
        }

        res.putAll(map);
        return res;
    }

    @Override
    public int saveBlueprint(int bID, String json) {
        blueprintMapper.saveRecord(bID, json);
        // 更新时间
        blueprintMapper.updateTime(bID);
        return 0;
    }

    @Override
    public boolean hasReplay(int bID) {
        return blueprintMapper.hasReplays(bID);
    }

    @Override
    public void getReplay(int bID) {

    }

    @Override
    public void setSize(int bID, int width, int height) {
        blueprintMapper.setSize(bID, width, height);
    }

    @Override
    public Map<String, Object> getSize(int bID) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        if (blueprint == null) {
            return null;
        }
        Map<String, Object> res = new HashMap<>();
        res.put("height", blueprint.getHeight());
        res.put("width", blueprint.getWidth());
        return res;
    }

    @Override
    public String getBackground(int bID) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        if (blueprint == null) {
            return null;
        }
        return blueprint.getBackground();
    }

    @Override
    public void saveBlueprintToFile(int bID, String json) throws IOException {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        System.out.println(projectPath + "/" + blueprint.getBlueprintID() + "/frame.json");
        File frameFile = new File(projectPath + "/" + blueprint.getBlueprintID() + "/frame.json");
        if (!frameFile.exists()) {
            frameFile.createNewFile();
        }
        ObjectOutputStream dos = new ObjectOutputStream(new FileOutputStream(frameFile));
        dos.writeObject(json);
        dos.close();
    }

    @Override
    public void saveBackground(int id, String backgroundPath) {
        blueprintMapper.saveBackground(id, backgroundPath);
    }

    @Override
    public Map<String, Object> getInfo(int bID) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        Map<String, Object> res = new HashMap<>();
        res.put("name", blueprint.getBName());
        res.put("description", blueprint.getDescription());
        res.put("addr", blueprint.getAddr());
        return res;
    }

    @Override
    public void updateBlueprint(int id, String name, String description, String addr) {
        blueprintMapper.updateBlueprint(id, name, description, addr);
    }

    @Override
    public boolean deleteBlueprint(int bID) {
        try {
            deleteSourceDirectory(bID);
        } catch (IOException e) {
            log.warn("Failed to delete source directory for blueprint {}", bID, e);
        }
        blueprintMapper.deleteBlueprint(bID);
        return true;
    }

    @Override
    public void saveScope(int bID, double imgX0, double imgY0, double imgX1, double imgY1) {
        blueprintMapper.saveScope(bID, imgX0, imgY0, imgX1, imgY1);
    }

    @Override
    public Map<String, Object> exit(int bID) {
        File file = new File(projectPath + "/" + bID + "/frame.json");
        if (!file.exists()) {
            return null;
        }
        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            String json = (String) ois.readObject();
            ois.close();
            Gson gson = new Gson();
            // 解析json
            Type type = new TypeToken<Map<String, Object>>() {
            }.getType();
            Map<String, Object> map = gson.fromJson(json, type);
            List<Map<String, Object>> exitList = (List<Map<String, Object>>) map.get("exit");
            List<Map<String, Object>> exit = new ArrayList<>();
            for (Map<String, Object> e : exitList) {
                Map<String, Object> m = new HashMap<>();
                m.put("exitId", ((Number) e.get("id")).intValue());
                m.put("exitName", e.get("name"));
                exit.add(m);
            }
            return new HashMap<String, Object>() {
                {
                    put("exit", exit);
                }
            };
        } catch (IOException | ClassNotFoundException e) {
            e.printStackTrace();
        }
        return null;
    }

    @Override
    public Map<String, Object> exitData(int bID) {
        // 读取出口统计文件
        File file = resolveSourcePath(bID, "exitStatistic.txt").toFile();
        if (!file.exists()) {
            return null;
        }
        List<Map<String, Object>> exitData = new ArrayList<>();

        Map<Integer, List<Integer>> tmp = new HashMap<>();
        Map<Integer, String> name = new HashMap<>();
        try {
            BufferedReader br = new BufferedReader(new FileReader(file));
            String s = br.readLine();
            String line;
            while ((line = br.readLine()) != null) {
                Scanner sc = new Scanner(line);
                int aID = sc.nextInt();
                int eID = sc.nextInt();
                int time = sc.nextInt();
                double placeholderValue = sc.nextDouble();
                String exitName = "";
                try {
                    exitName = sc.next();
                } catch (NoSuchElementException e) {
                    exitName = "";
                }
                if (tmp.containsKey(eID)) {
                    tmp.get(eID).add(time);
                } else {
                    tmp.put(eID, new ArrayList<Integer>() {
                        {
                            add(time);
                        }
                    });
                    name.put(eID, exitName);
                }
            }
            br.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
        for (Map.Entry<Integer, List<Integer>> entry : tmp.entrySet()) {
            Map<String, Object> m = new HashMap<>();
            m.put("exitId", entry.getKey());
            m.put("exitName", name.get(entry.getKey()));
            if (entry.getValue().size() == 1 && entry.getValue().get(0) == -1) {
                m.put("exitTime", new ArrayList<>(0));
            } else {
                m.put("exitTime", entry.getValue());
            }
            exitData.add(m);
        }
        return new HashMap<String, Object>() {
            {
                put("exitData", exitData);
            }
        };
    }

    @Override
    public Map<String, Object> projects() {
        List<Blueprint> blueprints = blueprintMapper.listBlueprint();
        List<Map<String, Object>> projectList = new ArrayList<>();
        for (Blueprint blueprint : blueprints) {
            Map<String, Object> m = new HashMap<>();
            m.put("projectId", blueprint.getBlueprintID());
            m.put("projectName", blueprint.getBName());
            Map<String, Object> exit = exit(blueprint.getBlueprintID());
            if (exit == null) {
                m.put("exitlist", new ArrayList<>());
                projectList.add(m);
                continue;
            }
            m.put("exitlist", exit.get("exit"));
            projectList.add(m);
        }
        return new HashMap<String, Object>() {
            {
                put("projectList", projectList);
            }
        };
    }

    public void copyDirectory(File sourceLocation, File targetLocation) throws IOException {
        if (sourceLocation.isDirectory()) {
            if (!targetLocation.exists()) {
                targetLocation.mkdir();
            }

            String[] children = sourceLocation.list();
            for (int i = 0; i < children.length; i++) {
                copyDirectory(new File(sourceLocation, children[i]),
                        new File(targetLocation, children[i]));
            }
        } else {
            InputStream in = new FileInputStream(sourceLocation);
            OutputStream out = new FileOutputStream(targetLocation);

            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
            in.close();
            out.close();
        }
    }

    @Override
    public int copy(int bID) {
        // 将原项目信息复制到新项目
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        if (blueprint == null) {
            return -1;
        }
        // 修改名字
        int i = 1;
        while (true) {
            Blueprint b = blueprintMapper.getBlueprintByName(blueprint.getBName() + "-副本" + (i == 1 ? "" : i));
            if (b == null) {
                break;
            }
            i++;
        }
        blueprint.setBName(blueprint.getBName() + "-副本");
        blueprintMapper.createBlueprint(blueprint);
        blueprintMapper.saveRecord(blueprint.getBlueprintID(), blueprint.getBlueprintJson());
        // System.out.println(blueprint.getBlueprintJson());
        // blueprintMapper.saveBackground(blueprint.getBlueprintID(),
        // blueprint.getBackground());
        // 创建新目录，将原项目文件复制到新目录 - 修复路径，确保使用正确的rvo/source路径
        File oldDir = new File(projectPath + "/" + bID);
        File newDir = new File(projectPath + "/" + blueprint.getBlueprintID());
        try {
            copyDirectory(oldDir, newDir);
        } catch (IOException e) {
            e.printStackTrace();
        }
        // 获取原背景文件名
        String[] split = blueprint.getBackground().split("/");
        String background = split[split.length - 1];
        blueprintMapper.saveBackground(blueprint.getBlueprintID(),
                "source/" + blueprint.getBlueprintID() + "/" + background);
        blueprintMapper.setSize(blueprint.getBlueprintID(), blueprint.getWidth(), blueprint.getHeight());
        blueprintMapper.saveScope(blueprint.getBlueprintID(), blueprint.getX0(), blueprint.getY0(), blueprint.getX1(),
                blueprint.getY1());
        blueprintMapper.setSchedule(blueprint.getBlueprintID(), blueprint.getSchedule());
        blueprintMapper.setDuration(blueprint.getBlueprintID(), blueprint.getDuration());
        blueprintMapper.setLastPeople(blueprint.getBlueprintID(), blueprint.getLastPeople());

        return blueprint.getBlueprintID();
    }
}
