package com.rvo.rvoserver.server.impl;

import com.alibaba.fastjson.JSONObject;
import com.rvo.rvoserver.pojo.Exit;
import com.rvo.rvoserver.server.JsonServer;
import org.springframework.beans.factory.BeanClassLoaderAware;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.*;

@Component
public class JsonServerA implements JsonServer {

    private boolean[] sample = null;

    private final int sample_max = 3000;

    public static int writing = 0;

    @Value("${path.projectPath}")
    private String projectPath; //项目地址

    private Path resolveProjectPath(String basePath, int bID, String... children) {
        if (basePath == null || basePath.isEmpty()) {
            throw new IllegalStateException("projectPath is not initialized");
        }
        // 过滤掉 null 值
        java.util.List<String> validChildren = new java.util.ArrayList<>();
        for (String child : children) {
            if (child != null) {
                validChildren.add(child);
            }
        }
        // 构建路径
        Path path = Paths.get(basePath, "rvo", "source", String.valueOf(bID));
        for (String child : validChildren) {
            path = path.resolve(child);
        }
        return path;
    }
    
    private Path resolveProjectPath(int bID, String... children) {
        // 使用注入的 projectPath，如果为 null 则尝试使用传入的参数
        String basePath = this.projectPath;
        if (basePath == null || basePath.isEmpty()) {
            throw new IllegalStateException("projectPath is not initialized. Please check application.properties configuration.");
        }
        return resolveProjectPath(basePath, bID, children);
    }

    public int[] generateSample(int m) {
        if (sample_max >= m) {
            sample = new boolean[m];
            Arrays.fill(sample, true);
            return new int[1];
        }

        ArrayList<Integer> numbers = new ArrayList<>();
        Random random = new Random();
        random.setSeed(43);

        for (int i = 0; i < m; i++) {
            numbers.add(i);
        }

        int[] result = new int[sample_max];
        for (int i = 0; i < sample_max; i++) {
            int randomIndex = random.nextInt(numbers.size());
            result[i] = numbers.get(randomIndex);
            numbers.remove(randomIndex);
        }

        sample = new boolean[m];
        Arrays.fill(sample, false);
        for(int i : result) {
            sample[i] = true;
        }

//        for(boolean b : sample) {
//            System.out.print(b?1:0);
//        }

        return result;
    }

    public void toJsonFile(int bID,int status, String fileName,double imgX0,double imgY0,double sT) throws IOException {
        writing = 1;
        List<String> replay;
        Path replayPath = resolveProjectPath(bID, fileName, "result.rvo");
        if(!Files.exists(replayPath)) {
            writing = 0;
            return;
        }
        Path jsonPath = resolveProjectPath(bID, fileName, "result-json.rvo");
        Path tempPath = jsonPath.resolveSibling("result-json.rvo.tmp");

        try (BufferedReader br = Files.newBufferedReader(replayPath, StandardCharsets.UTF_8);
             BufferedWriter writer = Files.newBufferedWriter(tempPath, StandardCharsets.UTF_8,
                     StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
            writer.write("[");
            replay = new ArrayList<>();
            String line;
            boolean first = true;
            while((line = br.readLine()) != null) {
                Scanner scanner = new Scanner(line);
                int index = scanner.nextInt();
                int len = scanner.nextInt();
                if(sample == null) {
                    generateSample(len + 1);
                }
                List<Map<String, Object>> data = new ArrayList<>();
                while(scanner.hasNext()) {
                    int id = scanner.nextInt();
                    double x = scanner.nextDouble();
                    double y = scanner.nextDouble();
                    if(id < sample.length && sample[id]) {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", id);
                        m.put("x", x/sT+imgX0);
                        m.put("y", y/sT+imgY0);
                        data.add(m);
                    }
                }
                String dataJson = JSONObject.toJSONString(data);
                if(!first) {
                    writer.write(",");
                }
                writer.write(dataJson);
                first = false;
                replay.add(JSONObject.toJSONString(data));
                System.out.print("-");
            }
            writer.write("]");
        } finally {
            writing = 0;
        }

        if (Files.exists(tempPath)) {
            Files.move(tempPath, jsonPath, StandardCopyOption.REPLACE_EXISTING);
        } else {
            System.err.println("result-json temp file missing: " + tempPath + ", skip promoting to " + jsonPath);
        }
    }

    @Override
    public void checkFile(int bID,int status, String fileName) throws IOException {
        List<String> replay;
        //读入回放文件数据
        //检查文件状态
        String replayPath = resolveProjectPath(bID, fileName, "result.rvo").toString();

        File file = new File(replayPath);
        if(!file.exists()) {
//            System.out.println("找不到文件");
            return;
        }

        String jsonPath = resolveProjectPath(bID, fileName, "result-check.rvo").toString();


        File jsonFile = new File(jsonPath);
        if(!jsonFile.exists()) {
            jsonFile.createNewFile();
        }
        FileWriter fileWriter = new FileWriter(jsonFile);
        fileWriter.write("[");


        //读取文件
//        List<List<Map<String, Object>>> res = new ArrayList<>();
        BufferedReader br = new BufferedReader(new FileReader(file));
        String lastLine = null;
        lastLine = br.readLine();
        Scanner scanner2 = new Scanner(lastLine);
        int index2 = scanner2.nextInt();
        int len2 = scanner2.nextInt();
        boolean[] sample = new boolean[len2 + 1];
        //读到最后一行
        String tmp = lastLine;
        while((lastLine = br.readLine()) != null) {
            tmp = lastLine;
        }
//        System.out.println("tmp: " + tmp);
        Scanner scanner1 = new Scanner(tmp);
        int index1 = scanner1.nextInt();
        int len1 = scanner1.nextInt();
//        System.out.println("len1: " + len1);
        while (scanner1.hasNext()) {
            int id = scanner1.nextInt();
            double x = scanner1.nextDouble();
            double y = scanner1.nextDouble();
            sample[id] = true;
        }

        int cnt = 0;
        String line;
        replay = new ArrayList<>();
        boolean first = true;
        br = new BufferedReader(new FileReader(file));
        while((line = br.readLine()) != null) {
            Scanner scanner = new Scanner(line);
            int index = scanner.nextInt();
            int len = scanner.nextInt();
            List<Map<String, Object>> data = new ArrayList<>();
            while(scanner.hasNext()) {
                int id = scanner.nextInt();
                double x = scanner.nextDouble();
                double y = scanner.nextDouble();
                if(sample[id]) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", id);
                    m.put("x", x);
                    m.put("y", y);
                    data.add(m);
                }
            }
//                if(data.size() == 0) { break; }
            String dataJson = JSONObject.toJSONString(data);
            //将dataJson写入文件
            if(!first) {
                fileWriter.write(",");
            }
            fileWriter.write(dataJson);
            first = false;


            replay.add(JSONObject.toJSONString(data));
//            System.out.print("1");
        }
        fileWriter.write("]");
//        System.out.println();
        br.close();
        fileWriter.close();
//        System.out.println("读取成功");
    }

    /*
     * 写入顺序为，房间数，出口数,房间人数,出口可容纳人数,遍历出口到每个房间的权重
     */
    public void dataToJsonFile(int bID, int [][] matrixRoomToExit, List<HashMap> rooms, List<HashMap> peosList,List<Exit>exits, String projectPath,String file) throws IOException{
        // 使用传入的 projectPath 参数，如果为 null 则使用注入的字段
        String basePath = (projectPath != null && !projectPath.isEmpty()) ? projectPath : this.projectPath;
        if (basePath == null || basePath.isEmpty()) {
            throw new IllegalStateException("projectPath is not initialized. Please check application.properties configuration.");
        }
        Path directoryPath = resolveProjectPath(basePath, bID, file);
        File directory = directoryPath.toFile();
        if (!directory.exists()) {
            directory.mkdirs();
        }

        File jsonFile = directoryPath.resolve("model_data.json").toFile();
        jsonFile.createNewFile(); // 如果文件不存在，创建它

        FileWriter fileWriter = new FileWriter(jsonFile);
        JSONObject jsonData = new JSONObject();

        // 添加房间数量
        jsonData.put("1", rooms.size()+peosList.size());

        // 添加出口数量
        jsonData.put("2", exits.size());

        // 添加每个房间的人数
        List<Integer> roomPopulation = new ArrayList<>();
        for (HashMap room : rooms) {
            List<HashMap> peos = (List<HashMap>) room.get("peos");
            roomPopulation.add(peos.size());
        }
        for (HashMap room : peosList) {
            List<HashMap> peos = (List<HashMap>) room.get("peos");
            roomPopulation.add(peos.size());
        }
        jsonData.put("3", roomPopulation);

        // 添加每个出口的容纳人数
        List<Integer> exitCapacities = new ArrayList<>();
        for (Exit exit : exits) {
            exitCapacities.add(exit.getNumOfPerson());
        }
        jsonData.put("4", exitCapacities);

        // 添加房间到出口的矩阵
        jsonData.put("5", matrixRoomToExit);

        // 写入JSON数据到文件
        fileWriter.write(jsonData.toJSONString());
        fileWriter.flush(); // 刷新缓冲区
        fileWriter.close(); // 关闭文件写入流

    }
}
