package com.rvo.rvoserver.server.impl;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import com.rvo.rvoserver.Mapper.BlueprintMapper;
import com.rvo.rvoserver.pojo.*;
import com.rvo.rvoserver.server.EvaluateServer;
import com.rvo.rvoserver.utils.compress.DataStorageUtils;
import jakarta.servlet.ServletOutputStream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.*;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.util.*;

@Component
@Slf4j
public class EvaluateServerA implements EvaluateServer {

    @Value("${path.projectPath}")
    private String projectPath; //项目地址

    private Path resolveSourcePath(int bID, String... children) {
        String[] segments = new String[children.length + 3];
        segments[0] = "rvo";
        segments[1] = "source";
        segments[2] = String.valueOf(bID);
        if (children.length > 0) {
            System.arraycopy(children, 0, segments, 3, children.length);
        }
        return Paths.get(projectPath, segments);
    }

    @Autowired
    BlueprintMapper blueprintMapper;


    @Override
    public int getState(int bID) {
        return blueprintMapper.getState(bID);
    }

    @Override
    public int getSchedule(int bID) {
        return blueprintMapper.getSchedule(bID);
    }

    @Override
    public void setSchedule(int bID,int num){
        blueprintMapper.setSchedule(bID,num);
    }


    @Override
    public List<List<Map<String, Object>>> getReplay(int bID) throws IOException {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        String replayPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() + "/result.rvo";
        File file = new File(replayPath);
        if(!file.exists()) { return null; }

        //读取文件
        List<List<Map<String, Object>>> res = new ArrayList<>();
        BufferedReader br = new BufferedReader(new FileReader(file));
        String line;
        while((line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            List<Map<String, Object>> data = new ArrayList<>();
            while(scanner.hasNext()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", scanner.nextInt());
                m.put("x", scanner.nextDouble());
                m.put("y", scanner.nextDouble());
                data.add(m);
            }
            res.add(data);
        }

        return res;
    }

    @Override
    public Map<String, Object> getReplayData(int bID, int status,String file) throws IOException, ClassNotFoundException {
        Map<String, Object> res = new HashMap<>();

        //获取回放分片信息
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        List<ReplayFlat> replayData = loadReplayFlats(blueprint.getBlueprintID(), file);
        if (replayData == null) {
            return null;
        }
        res.put("flat", replayData);

        //获取回放地图信息
        File frameFile = new File(projectPath + "/rvo/source/" + blueprint.getBlueprintID() + "/frame.json");
        if(!frameFile.exists()) { return null; }
//        BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(frameFile)));
//        String line;
//        StringBuilder sb = new StringBuilder();
//        while((line = br.readLine()) != null) {
//            System.out.println(line);
//            sb.append(line).append('\n');
//        }
        ObjectInputStream dis = new ObjectInputStream(new FileInputStream(frameFile));
        String json = (String) dis.readObject();

        //解析json
        Gson gson = new Gson();
        Type type = new TypeToken<Map<String, Object>>() {}.getType();
        Map<String, Object> map = gson.fromJson(json, type);
        res.put("frame", map);

        return res;
    }

    private List<ReplayFlat> loadReplayFlats(int blueprintId, String file) throws IOException, ClassNotFoundException {
        Path jsonPath = resolveSourcePath(blueprintId, file, "replayData.json");
        if (Files.exists(jsonPath)) {
            try (Reader reader = Files.newBufferedReader(jsonPath, StandardCharsets.UTF_8)) {
                Type type = new TypeToken<List<ReplayFlat>>() {}.getType();
                List<ReplayFlat> replayFlats = new Gson().fromJson(reader, type);
                if (replayFlats != null) {
                    return replayFlats;
                }
            } catch (IOException | JsonSyntaxException ex) {
                log.warn("Failed to read replayData.json for blueprint {} file {}, fallback to binary metadata", blueprintId, file, ex);
            }
        }

        Path binPath = resolveSourcePath(blueprintId, file, "replayData.txt");
        if (!Files.exists(binPath)) {
            return null;
        }
        try (ObjectInputStream ois = new ObjectInputStream(Files.newInputStream(binPath))) {
            return (List<ReplayFlat>) ois.readObject();
        }
    }

    @Override
    public List<List<Map<String, Object>>> getReplayFlat(int bID, int flat, int status,String fileName) throws IOException, ClassNotFoundException {
        //获取片信息
        Map<String, Object> replayData = getReplayData(bID,status,fileName);
        ReplayFlat replayFlat = ((List<ReplayFlat>) replayData.get("flat")).get(flat - 1);

        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        String replayPath;
        replayPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/" +fileName + "/result.rvo";
        File file = new File(replayPath);
        if(!file.exists()) { return null; }

        //读取文件
        List<List<Map<String, Object>>> res = new ArrayList<>();
        BufferedReader br = new BufferedReader(new FileReader(file));
        String line;
        //跳转指定行
        int cnt = 1;
        while(cnt < replayFlat.getStartTime() && br.readLine() != null) { cnt++; }

        //读取指定行数数据
        cnt = 0;
        while(cnt < replayFlat.getDuration() && (line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            List<Map<String, Object>> data = new ArrayList<>();
            while(scanner.hasNext()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", scanner.nextInt());
                m.put("x", scanner.nextDouble());
                m.put("y", scanner.nextDouble());
                data.add(m);
            }
            res.add(data);
            cnt++;
        }

        return res;
    }

    @Override
    public void getReplayFlat(int bID, int flat, int status, String fileName ,ServletOutputStream out) throws IOException, ClassNotFoundException {
        //获取片信息
        Map<String, Object> replayData = getReplayData(bID,status,fileName);
        ReplayFlat replayFlat = ((List<ReplayFlat>) replayData.get("flat")).get(flat - 1);

        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return; }

        //检查文件状态
        String replayPath;
        replayPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/"+ fileName+ "/result.rvo";

        File file = new File(replayPath);
        if(!file.exists()) { return; }

        //读取文件
//        List<List<Map<String, Object>>> res = new ArrayList<>();
        BufferedReader br = new BufferedReader(new FileReader(file));
        String line;
        //跳转指定行
        int cnt = 1;
        while(cnt < replayFlat.getStartTime() && br.readLine() != null) { cnt++; }

        //网络传输
        Gson gson = new Gson();
        out.write("[".getBytes());

        //读取指定行数数据
        cnt = 0;
        while(cnt < replayFlat.getDuration() && (line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            List<Map<String, Object>> data = new ArrayList<>();
            while(scanner.hasNext()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", scanner.nextInt());
                m.put("x", scanner.nextDouble());
                m.put("y", scanner.nextDouble());
                data.add(m);
            }

            out.write(gson.toJson(data).getBytes());
            out.flush();
//            res.add(data);
            cnt++;
        }
        out.write("]".getBytes());
    }

    @Override
    public List<List<Map<String, Object>>> getReplayFlat2(int bID, int flat, int status,String fileName) throws IOException, ClassNotFoundException {
        if(flat < 1) { return new ArrayList<>(); }
        //获取片信息
        Map<String, Object> replayData = getReplayData(bID,status,fileName);
        ReplayFlat replayFlat = ((List<ReplayFlat>) replayData.get("flat")).get(flat - 1);

        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        Path replayPath = resolveSourcePath(blueprint.getBlueprintID(), fileName, "result.rvo");
        File file = replayPath.toFile();
        if(!file.exists()) { return null; }

        //读取文件
        List<List<Map<String, Object>>> res = new ArrayList<>();
        FileInputStream fis = new FileInputStream(file);
        BufferedInputStream bis = new BufferedInputStream(fis);
        DataInputStream dis = new DataInputStream(fis);
        String line;
        //跳转指定行
        int cnt = 1;
        while(cnt < replayFlat.getStartTime()) {
            int i = dis.readInt();
            fis.skip(i);
//            bis.skip(i);
            cnt++;
        }

        //读取指定行数数据
        cnt = 0;
        while(cnt < replayFlat.getDuration()) {
            int len = dis.readInt();
//            System.out.println(len);
            byte[] bytes = new byte[len];
            fis.read(bytes, 0, len);
//            bis.read(bytes, 0, len);
            String dataString = DataStorageUtils.byteToString(bytes);
//            System.out.println(dataString);

            Scanner scanner = new Scanner(dataString);
            int index = scanner.nextInt();
            int length = scanner.nextInt();

            List<Map<String, Object>> data = new ArrayList<>();
            while(scanner.hasNext()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", scanner.nextInt());
                m.put("x", scanner.nextDouble());
                m.put("y", scanner.nextDouble());
                data.add(m);
            }
            res.add(data);
            cnt++;
        }
        bis.close();
        dis.close();
        fis.close();


        return res;
    }

    @Override
    public void getReplayFlat2(int bID, int flat, int status,String fileName, ServletOutputStream out) throws IOException, ClassNotFoundException {
        if(flat < 1) {
            out.write("[]".getBytes());
            return;
        }
        //获取片信息
        Map<String, Object> replayData = getReplayData(bID,status,fileName);
        ReplayFlat replayFlat = ((List<ReplayFlat>) replayData.get("flat")).get(flat - 1);

        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) {
            out.write("[]".getBytes());
            return;
        }

        //检查文件状态
        Path replayPath = resolveSourcePath(blueprint.getBlueprintID(), fileName, "result.rvo");
        File file = replayPath.toFile();
        if(!file.exists()) {
            out.write("[]".getBytes());
            return;
        }

        //读取文件
        List<List<Map<String, Object>>> res = new ArrayList<>();
        FileInputStream fis = new FileInputStream(file);
        BufferedInputStream bis = new BufferedInputStream(fis);
        DataInputStream dis = new DataInputStream(fis);
        String line;
        //跳转指定行
        int cnt = 1;
        while(cnt < replayFlat.getStartTime()) {
            int i = dis.readInt();
            fis.skip(i);
//            bis.skip(i);
            cnt++;
        }

        Gson gson = new Gson();
        out.write("[".getBytes());
        //读取指定行数数据
        cnt = 0;
        while(cnt < replayFlat.getDuration()) {
            int len = dis.readInt();
//            System.out.println(len);
            byte[] bytes = new byte[len];
            fis.read(bytes, 0, len);
//            bis.read(bytes, 0, len);
            String dataString = DataStorageUtils.byteToString(bytes);
//            System.out.println(dataString);

            Scanner scanner = new Scanner(dataString);
            int index = scanner.nextInt();
            int length = scanner.nextInt();

            List<Map<String, Object>> data = new ArrayList<>();
            while(scanner.hasNext()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", scanner.nextInt());
                m.put("x", scanner.nextDouble());
                m.put("y", scanner.nextDouble());
                data.add(m);
            }
            out.write(gson.toJson(data).getBytes());
//            res.add(data);
            cnt++;
            if(cnt != replayFlat.getDuration()) {
                out.write(",".getBytes());
            }
            out.flush();
        }
        bis.close();
        dis.close();
        fis.close();
        out.write("]".getBytes());
    }

    @Override
    public Map<String, Object> getExportStatistics(int bID, int unit, int status, String fileName) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        String statisticPath;

        statisticPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/"+ fileName + "/statistic";


        File file = new File(statisticPath);
        if(!file.exists()) { return null; }

        //读取数据
        List<Map<String, Integer>> data = null;
        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            data = (List<Map<String, Integer>>) ois.readObject();
            ois.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }

        if(data == null) { return null; }

        int duration = (int)getTime(bID,fileName)*15;
        int numOfExits = getNumExit(bID,fileName);
        int[] exits = new int[numOfExits];
        int exit_all = 0;
        List<Integer> exits_all = new ArrayList<>();
        List<Integer> peos[] = new List[numOfExits];
        List<Double> times = new ArrayList<>();
        for(int i = 0; i < peos.length; i++) { peos[i] = new ArrayList<>(); }

        //计算每个出口人数
        int index = 0;
        for (int t = 0; t < duration; t+=30) {
            while(index < data.size() && data.get(index).get("cnt") < t) {
                exits[data.get(index).get("exit")]++;
                exit_all++;
                index++;
            }
            times.add(Math.floor((double) t / 3));
            for(int j = 0; j < peos.length; j++) {
                peos[j].add(exits[j]);
            }
            exits_all.add(exit_all);
        }
        for(;index < data.size(); index++) {
            exits[data.get(index).get("exit")]++;
            exit_all++;
        }
        times.add(Math.floor((double) duration / 3));
        for(int j = 0; j < peos.length; j++) {
            peos[j].add(exits[j]);
        }
        exits_all.add(exit_all);

        Map<String, Object> res = new HashMap<>();
        res.put("time", times);
        res.put("totalTime", (int)Math.floor((double) duration / 3));
        List<Map<String, Object>> results = new ArrayList<>();
        for(int i = 0; i < exits.length; i++) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", "exit" + i);
            m.put("data", peos[i]);
            results.add(m);
        }
        Map<String, Object> m = new HashMap<>();
        m.put("name", "exit_all");
        m.put("data", exits_all);
        results.add(m);
        res.put("exits", results);
        res.put("number",exit_all);
        return res;
    }

    @Override
    public double getTime(int bID) {
        int cnt = blueprintMapper.getDuration(bID);
        return (double) cnt;
    }

    @Override
    public double getTime(int bID,String fileName) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        String TimePath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/"+ fileName + "/Time.txt";
        File file = new File(TimePath);
        if(!file.exists()) { return getTime(bID); }

        //读取数据
        Double data = null;
        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            data = (double) ((int) ois.readObject());
            ois.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }

        if(data == null) { return getTime(bID); }
        return (double) data / 15;
    }

    @Override
    public Integer getNumExit(int bID,String fileName) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        String TimePath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/"+ fileName + "/exit.txt";
        File file = new File(TimePath);
        if(!file.exists()) { return blueprintMapper.getNumOfExits(bID); }

        //读取数据
        int data = 0;
        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            data = ((int) ois.readObject());
            ois.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }

        if(data == 0) { return blueprintMapper.getNumOfExits(bID); }
        return (Integer) data;
    }

    @Override
    public List<List<Map<String, Integer>>> getHeatMap(int bID) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        String statisticPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() + "/heatMap.rvo";
        File file = new File(statisticPath);
        if(!file.exists()) { return null; }

        List<List<Map<String, Integer>>> res = null;
        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            res = (List<List<Map<String, Integer>>>) ois.readObject();
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }
        return res;
    }

    @Override
    public Map<String, Object> getGRD(int bID, int status,String fileName) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        String grdPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/"+ fileName +"/grd";

        File file = new File(grdPath);
        if(!file.exists()) { return null; }

        Map<String, Object> res = new HashMap<>();

        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            List<Double> grd = (List<Double>) ois.readObject();
            ois.close();
            res.put("grd", grd);
            List<Double> time = new ArrayList<>();
            DecimalFormat df = new DecimalFormat("#.00");
            int duration = (int)getTime(bID,fileName)*15;
            for(int i = 0; i < duration; i+=3) {
                time.add(Double.parseDouble(df.format((i/3 + 1.0))));
            }
            for (int i = grd.size()-1; i < duration; i++){
                grd.add(grd.get(i));
            }
            res.put("time", time);
            res.put("totalTime",time.size()/75);
        } catch (IOException | ClassNotFoundException e) {
            e.printStackTrace();
            return null;
        }

        //读取并返回
        return res;
    }

    @Override
    public Map<String, Object> getPerGRD(int bID, int status, String fileName) {
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);

        //检查状态
        blueprintMapper.getState(bID);
        if(bID < 2) { return null; }

        //检查文件状态
        String grdPath = projectPath + "/rvo/source/" + blueprint.getBlueprintID() +"/" +fileName +"/preGrd";

        File file = new File(grdPath);
        if(!file.exists()) {
            return null;
        }

        Map<String, Object> res = new HashMap<>();
        DecimalFormat df = new DecimalFormat("#.00000");

        try {
            ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file));
            List<Double> grd = (List<Double>) ois.readObject();
            ois.close();
            double maxGrd = 0;
            int count = 15; // 统计区间数
            List<Integer> num = new ArrayList<Integer>(count);
            for (int i = 0; i <= count; i++){
                num.add(0);
            }
            for(double temp : grd){
                if(maxGrd < temp){
                    maxGrd = temp;
                }
            }
            double t = maxGrd/count;
            List<Double> number = new ArrayList<>();
            for(double temp : grd){
                for(int i = 0; i < count; i++){
                    if(temp >= i*t && temp< (i+1)*t){
                        num.set(i+1,(num.get(i+1)+1));
                    }
                }
            }

            res.put("grd", num);
            
            for(int i = 0; i <= num.size(); i++) {
                number.add(Double.parseDouble(df.format(i * t)));
            }
            res.put("time", number);
            res.put("max_grd",maxGrd);
            res.put("totalTime",number.size()/255);
        } catch (IOException | ClassNotFoundException e) {
            e.printStackTrace();
            return null;
        }

        //读取并返回
        return res;
    }

    @Override
    @Async
    public void calDensity(int bID, List<DensityRect> rects, double scale) throws IOException {
//        log.info("正在计算密度：" + bID);
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        if(blueprint == null || !blueprint.isHasReplay() || blueprint.getState() != 2) { return; }

//        int beginFrame = (int) (begin * 30);
//        int endFrame = (int) (end * 30);
        int duration = blueprintMapper.getDuration(bID);
//        if(endFrame > duration || endFrame < 0 || beginFrame < 0 || beginFrame > duration || beginFrame >= endFrame) { return; }
        //找到最早开始时间和最晚结束时间
        int earliest = 0;
        int latest = duration;
        for(DensityRect rect : rects) {
            int beginFrame = (int) (rect.getBegin());
            int endFrame = (int) (rect.getEnd());
            if(beginFrame < earliest) {
                earliest = beginFrame;
            }
            if(endFrame > latest) {
                latest = endFrame;
            }
        }

        //读取文件为对象
        Path densityPath = resolveSourcePath(bID, "density");
        File densityFile = densityPath.toFile();
        if(!densityFile.exists()) {
            //创建文件
            try {
                densityFile.createNewFile();
            } catch (IOException e) {
                e.printStackTrace();
                return;
            }
        }
        double[] density = new double[rects.size()];

//        //将density写入文件
//        ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(densityFile));

        Path replayPath = resolveSourcePath(bID, "result.rvo");
        File file = replayPath.toFile();
        if(!file.exists()) {
            return;
        }

        BufferedReader br = new BufferedReader(new FileReader(file));
        int cnt = 0;
        String line;

        //读取earlist行
        while(cnt < earliest && (line = br.readLine()) != null) {
            cnt++;
        }

        //读取数据的同时计算密度
        int[] numOfPeos = new int[rects.size()];
        while(cnt < latest && (line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            while(scanner.hasNext()) {
                int id = scanner.nextInt();
                double x = scanner.nextDouble();
                double y = scanner.nextDouble();
                //判断是否在框里
                for(int i = 0; i < rects.size(); i++) {
                    int beginFrame = (int) (rects.get(i).getBegin() * 30);
                    int endFrame = (int) (rects.get(i).getEnd() * 30);
                    if(cnt >= beginFrame && cnt <= endFrame) {
                        if(rects.get(i).isIn(x, y)) {
                            numOfPeos[i]++;
                        }
                    }
                }
            }
            cnt++;
        }
        //计算平均密度
        for(int i = 0; i < rects.size(); i++) {
            int beginFrame = (int) (rects.get(i).getBegin() * 30);
            int endFrame = (int) (rects.get(i).getEnd() * 30);
            density[i] = (double) numOfPeos[i] / (endFrame - beginFrame);
        }
//        double avgDensity = (double) numOfPeo / (endFrame - beginFrame) / rects.get(0).getArea();
//        density.set(density.size() - 1, avgDensity);
//        oos.writeObject(density);
//        oos.close();
        //将density以文本形式写入文件
        BufferedWriter bw = new BufferedWriter(new FileWriter(densityFile));
        for(int i = 0; i < density.length; i++) {
            bw.write(density[i] + "\n");
        }
        bw.close();
//        log.info("计算完成");
    }

    @Override
    public List<Double> getDensity(int bID,String fileName) {
        //读取密度文件
        String densityPath = projectPath + "/rvo/source/" + bID +"/"+ fileName + "/density";
        if (fileName == ""){
            densityPath = projectPath + "/rvo/source/" + bID + "1/density";
        }
        File densityFile = new File(densityPath);
        if(!densityFile.exists()) {
            return null;
        }
        List<Double> density = new ArrayList<>();
        try {
            BufferedReader br = new BufferedReader(new FileReader(densityFile));
            String line;
            while((line = br.readLine()) != null) {
                density.add(Double.parseDouble(line));
            }
            br.close();
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }

        return density;
    }
    @Override
    public List<Double> getDensity1(int bID,String fileName) {
        //读取密度文件
        String densityPath = projectPath + "/rvo/source/" + bID +"/"+ fileName + "/density1";
        File densityFile = new File(densityPath);
        if(!densityFile.exists()) {
            return null;
        }
        List<Double> density = new ArrayList<>();
        try {
            BufferedReader br = new BufferedReader(new FileReader(densityFile));
            String line;
            while((line = br.readLine()) != null) {
                density.add(Double.parseDouble(line));
            }
            br.close();
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }

        return density;
    }

    @Override
    public void calDensity(int bID, List<DensityRect> rects, double imgX0, double imgY0, double imgX1, double imgY1,String fileName) throws IOException {
//        log.info("密度计算开始：" + bID);
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        //修正所有rect坐标
        for(DensityRect rect : rects) {
            rect.setX0((rect.getX0() - imgX0) / (imgX1 - imgX0) * (blueprint.getX1() - blueprint.getX0()) + blueprint.getX0());
            rect.setX1((rect.getX1() - imgX0) / (imgX1 - imgX0) * (blueprint.getX1() - blueprint.getX0()) + blueprint.getX0());
            rect.setY0((rect.getY0() - imgY0) / (imgY1 - imgY0) * (blueprint.getY1() - blueprint.getY0()) + blueprint.getY0());
            rect.setY1((rect.getY1() - imgY0) / (imgY1 - imgY0) * (blueprint.getY1() - blueprint.getY0()) + blueprint.getY0());
        }

        double scale = (imgX1 - imgX0) / blueprint.getWidth();

        int duration = blueprintMapper.getDuration(bID);
//        if(endFrame > duration || endFrame < 0 || beginFrame < 0 || beginFrame > duration || beginFrame >= endFrame) { return; }
        //找到最早开始时间和最晚结束时间
        int earliest = 0;
        int latest = duration;
        for(DensityRect rect : rects) {
            int beginFrame = (int) (rect.getBegin() * 3);
            int endFrame = (int) (rect.getEnd() * 3);
            if(beginFrame < earliest) {
                earliest = beginFrame;
            }
            if(endFrame > latest) {
                latest = endFrame;
            }
        }

        //读取文件为对象
        String densityPath = projectPath + "/rvo/source/" + bID + "/" + fileName +"/density";
        if (fileName == ""){
            densityPath = projectPath + "/rvo/source/" + bID  +"/density";
        }
        File densityFile = new File(densityPath);
        if(!densityFile.exists()) {
            //创建文件
            try {
                densityFile.createNewFile();
            } catch (IOException e) {
                e.printStackTrace();
                return;
            }
        }else {
            return;
        }
        double[] density = new double[rects.size()];

//        //将density写入文件
//        ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(densityFile));

        String replayPath = projectPath + "/rvo/source/" + bID + "/" + fileName +"/1/result.rvo";
        File file = new File(replayPath);
        if(!file.exists()) {
            return;
        }

        BufferedReader br = new BufferedReader(new FileReader(file));
        int cnt = 0;
        String line;

        //读取earlist行
        while(cnt < earliest && (line = br.readLine()) != null) {
            cnt++;
        }

        //读取数据的同时计算密度
        int[] numOfPeos = new int[rects.size()];
        while(cnt < latest && (line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            while(scanner.hasNext()) {
                int id = scanner.nextInt();
                double x = scanner.nextDouble();
                double y = scanner.nextDouble();
                //判断是否在框里
                for(int i = 0; i < rects.size(); i++) {
                    int beginFrame = (int) (rects.get(i).getBegin() * 30);
                    int endFrame = (int) (rects.get(i).getEnd() * 30);
                    if(cnt >= beginFrame && cnt <= endFrame) {
                        if(rects.get(i).isIn(x, y)) {
                            numOfPeos[i]++;
                        }
                    }
                }
            }
            cnt++;
        }
        br.close();
        //System.out.println("统计人数" + numOfPeos);
        //计算平均密度
        for(int i = 0; i < rects.size(); i++) {
            int beginFrame = (int) (rects.get(i).getBegin() * 30);
            int endFrame = (int) (rects.get(i).getEnd() * 30);
            density[i] = (double) numOfPeos[i] / rects.get(i).getArea() * scale * scale;
//            System.out.println(numOfPeos[0]);
//            System.out.println(rects.get(0).getArea());
//            System.out.println(scale);
        }

//        double avgDensity = (double) numOfPeo / (endFrame - beginFrame) / rects.get(0).getArea();
//        density.set(density.size() - 1, avgDensity);
//        oos.writeObject(density);
//        oos.close();
        //将density以文本形式写入文件
        BufferedWriter bw = new BufferedWriter(new FileWriter(densityFile));
        for(int i = 0; i < density.length; i++) {
            bw.write(density[i] + "\n");
        }
        bw.close();
//        log.info("计算完成");
    }
    @Override
    public void calDensity1(int bID, List<DensityRect> rects, double imgX0, double imgY0, double imgX1, double imgY1,String fileName) throws IOException {
//        log.info("密度计算开始：" + bID);
        Blueprint blueprint = blueprintMapper.getBlueprint(bID);
        //修正所有rect坐标
        for(DensityRect rect : rects) {
            rect.setX0((rect.getX0() - imgX0) / (imgX1 - imgX0) * (blueprint.getX1() - blueprint.getX0()) + blueprint.getX0());
            rect.setX1((rect.getX1() - imgX0) / (imgX1 - imgX0) * (blueprint.getX1() - blueprint.getX0()) + blueprint.getX0());
            rect.setY0((rect.getY0() - imgY0) / (imgY1 - imgY0) * (blueprint.getY1() - blueprint.getY0()) + blueprint.getY0());
            rect.setY1((rect.getY1() - imgY0) / (imgY1 - imgY0) * (blueprint.getY1() - blueprint.getY0()) + blueprint.getY0());
        }

        double scale = (imgX1 - imgX0) / blueprint.getWidth();

        int duration = blueprintMapper.getDuration(bID);
//        if(endFrame > duration || endFrame < 0 || beginFrame < 0 || beginFrame > duration || beginFrame >= endFrame) { return; }
        //找到最早开始时间和最晚结束时间
        int earliest = 0;
        int latest = duration;
        for(DensityRect rect : rects) {
            int beginFrame = (int) (rect.getBegin() * 3);
            int endFrame = (int) (rect.getEnd() * 3);
            if(beginFrame < earliest) {
                earliest = beginFrame;
            }
            if(endFrame > latest) {
                latest = endFrame;
            }
        }

        //读取文件为对象
        String densityPath = projectPath + "/rvo/source/" + bID + "/" + fileName +"/density1";
        File densityFile = new File(densityPath);
        if(!densityFile.exists()) {
            //创建文件
            try {
                densityFile.createNewFile();
            } catch (IOException e) {
                e.printStackTrace();
                return;
            }
        }
        double[] density = new double[rects.size()];

//        //将density写入文件
//        ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(densityFile));

        String replayPath = projectPath + "/rvo/source/" + bID + "/" + fileName +"/result.rvo";
        File file = new File(replayPath);
        if(!file.exists()) {
            return;
        }

        BufferedReader br = new BufferedReader(new FileReader(file));
        int cnt = 0;
        String line;

        //读取earlist行
        while(cnt < earliest && (line = br.readLine()) != null) {
            cnt++;
        }

        //读取数据的同时计算密度
        int[] numOfPeos = new int[rects.size()];
        while(cnt < latest && (line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            while(scanner.hasNext()) {
                int id = scanner.nextInt();
                double x = scanner.nextDouble();
                double y = scanner.nextDouble();
                //判断是否在框里
                for(int i = 0; i < rects.size(); i++) {
                    int beginFrame = (int) (rects.get(i).getBegin() * 30);
                    int endFrame = (int) (rects.get(i).getEnd() * 30);
                    if(cnt >= beginFrame && cnt <= endFrame) {
                        if(rects.get(i).isIn(x, y)) {
                            numOfPeos[i]++;
                        }
                    }
                }
            }
            cnt++;
        }
        br.close();
        //System.out.println("统计人数" + numOfPeos);
        //计算平均密度
        for(int i = 0; i < rects.size(); i++) {
            density[i] = (double) numOfPeos[i] / rects.get(i).getArea() * scale * scale;
//            System.out.println(numOfPeos[0]);
//            System.out.println(rects.get(0).getArea());
//            System.out.println(scale);
        }

//        double avgDensity = (double) numOfPeo / (endFrame - beginFrame) / rects.get(0).getArea();
//        density.set(density.size() - 1, avgDensity);
//        oos.writeObject(density);
//        oos.close();
        //将density以文本形式写入文件
        BufferedWriter bw = new BufferedWriter(new FileWriter(densityFile));
        for(int i = 0; i < density.length; i++) {
            bw.write(density[i] + "\n");
        }
        bw.close();
//        log.info("计算完成");
    }



}
