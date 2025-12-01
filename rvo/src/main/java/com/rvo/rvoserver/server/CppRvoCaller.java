package com.rvo.rvoserver.server;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.rvo.rvoserver.pojo.ReplayFlat;
import com.rvo.rvoserver.server.JsonServer;
import com.rvo.rvoserver.server.EvaluateServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.ObjectOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * C++ RVO模拟器调用器
 * 用于调用C++程序进行疏散方案计算
 */
@Component
public class CppRvoCaller {

    private static final Gson GSON = new Gson();

    @Value("${path.projectPath}")
    private String projectPath;

    @Value("${path.cppRvoSimulatorPath:cpp-rvo-simulator/build/rvo_simulator}")
    private String cppSimulatorPath;

    @Autowired(required = false)
    private JsonServer jsonServer;

    @Autowired(required = false)
    private EvaluateServer evaluateServer;

    @Autowired(required = false)
    private StageProgressRegistry stageProgressRegistry;

    private static final Pattern PROGRESS_PATTERN = Pattern.compile("\\[PROGRESS\\]\\s+(\\d+)");
    private static final Pattern STAGE_PATTERN = Pattern.compile("\\[STAGE\\]\\s+(\\w+)");
    private static final Map<String, Integer> STAGE_BASE_MAP;

    static {
        Map<String, Integer> base = new HashMap<>();
        base.put("loading", 50);
        base.put("running", 200);
        base.put("saving", 400);
        base.put("done", 550);
        STAGE_BASE_MAP = Collections.unmodifiableMap(base);
    }

    /**
     * 调用C++程序进行模拟计算
     * 
     * @param bID 项目ID
     * @param inputData 输入数据（与Java版本兼容的格式）
     * @param outputDir 输出目录（相对于projectPath/rvo/source/bID/）
     * @return 是否成功
     */
    public boolean callCppSimulator(int bID, Map<String, Object> inputData, String outputDir) {
        try {
            // 创建输入JSON文件
            String inputJsonPath = createInputJson(bID, inputData, outputDir);
            
            // 构建输出目录完整路径
            Path outputPath = Paths.get(projectPath, "rvo", "source", String.valueOf(bID), outputDir);
            if (!Files.exists(outputPath)) {
                Files.createDirectories(outputPath);
            }
            
            // 构建C++程序路径
            Path simulatorPath = Paths.get(projectPath).getParent().resolve(cppSimulatorPath);
            if (!Files.exists(simulatorPath)) {
                // 尝试相对路径
                simulatorPath = Paths.get(cppSimulatorPath);
            }
            
            // 执行C++程序
            ProcessBuilder pb = new ProcessBuilder(
                simulatorPath.toString(),
                inputJsonPath,
                outputPath.toString()
            );
            
            // 设置工作目录
            pb.directory(new File(projectPath).getParentFile());
            
            // 重定向错误输出
            String errorLogPath = outputPath.resolve("cpp_error.log").toString();
            pb.redirectError(new File(errorLogPath));
            
            // 启动进程
            Process process = pb.start();
            Thread progressThread = startProgressWatcher(bID, process);
            
            // 等待完成（最多30分钟）
            boolean finished = process.waitFor(30, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                System.err.println("C++ simulator timeout");
                joinProgressThread(progressThread);
                return false;
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                System.err.println("C++ simulator failed with exit code: " + exitCode);
                // 读取错误日志
                try {
                    String errorLog = new String(Files.readAllBytes(Paths.get(errorLogPath)));
                    System.err.println("Error log: " + errorLog);
                } catch (IOException e) {
                    // 忽略
                }
                joinProgressThread(progressThread);
                if (stageProgressRegistry != null) {
                    stageProgressRegistry.clearStage(bID);
                }
                return false;
            }

            joinProgressThread(progressThread);
            if (stageProgressRegistry != null) {
                stageProgressRegistry.clearStage(bID);
            }
            
            // 检查输出文件是否存在
            Path resultFile = outputPath.resolve("result.rvo");
            if (!Files.exists(resultFile)) {
                System.err.println("Result file not found: " + resultFile);
                return false;
            }
            
            // 转换ObjectOutputStream格式文件（如果需要）
            convertToJavaFormat(outputPath);
            
            return true;
            
        } catch (Exception e) {
            System.err.println("Error calling C++ simulator: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private Thread startProgressWatcher(int bID, Process process) {
        Thread thread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    handleProgressLine(bID, line);
                }
            } catch (IOException ignored) {
            }
        }, "cpp-progress-" + bID);
        thread.setDaemon(true);
        thread.start();
        return thread;
    }

    private void handleProgressLine(int bID, String line) {
        if (line == null) {
            return;
        }
        String sanitizedLine = line.replace("\uFEFF", "");
        System.out.println("[CPP STDOUT] " + sanitizedLine);
        Matcher matcher = PROGRESS_PATTERN.matcher(sanitizedLine.trim());
        if (matcher.matches()) {
            int percent = Integer.parseInt(matcher.group(1));
            percent = Math.max(0, Math.min(100, percent));
            if (evaluateServer != null) {
                try {
                    int scheduleValue = percent * 6;
                    String stage = null;
                    if (stageProgressRegistry != null) {
                        stage = stageProgressRegistry.getStageKeyword(bID).orElse(null);
                    }
                    if (stage != null) {
                        Integer base = STAGE_BASE_MAP.get(stage);
                        if (base != null) {
                            scheduleValue = Math.max(scheduleValue, base + percent);
                        }
                    }
                    scheduleValue = Math.max(0, Math.min(600, scheduleValue));
                    evaluateServer.setSchedule(bID, scheduleValue);
                } catch (Exception ex) {
                    System.err.println("Failed to update schedule for bID " + bID + ": " + ex.getMessage());
                }
            }
            return;
        }
        Matcher stageMatcher = STAGE_PATTERN.matcher(sanitizedLine.trim());
        if (stageMatcher.matches()) {
            String stage = stageMatcher.group(1).toLowerCase();
            int scheduleCode = mapStageToSchedule(stage);
            if (scheduleCode >= 0 && evaluateServer != null) {
                try {
                    if (stageProgressRegistry != null) {
                        if ("done".equals(stage)) {
                            stageProgressRegistry.clearStage(bID);
                        } else {
                            stageProgressRegistry.updateStage(bID, stage);
                        }
                    }
                    evaluateServer.setSchedule(bID, scheduleCode);
                } catch (Exception ex) {
                    System.err.println("Failed to update stage schedule for bID " + bID + ": " + ex.getMessage());
                }
            }
            return;
        }

        System.out.println(line);
    }

    private int mapStageToSchedule(String stage) {
        return switch (stage) {
            case "loading" -> STAGE_BASE_MAP.get("loading");
            case "running" -> STAGE_BASE_MAP.get("running");
            case "saving" -> STAGE_BASE_MAP.get("saving");
            case "done" -> 600;        // 完成
            default -> -1;
        };
    }

    private void joinProgressThread(Thread thread) {
        if (thread == null) {
            return;
        }
        try {
            thread.join(1000);
        } catch (InterruptedException ignored) {
        }
    }
    
    /**
     * 创建输入JSON文件
     */
    private String createInputJson(int bID, Map<String, Object> inputData, String outputDir) throws IOException {
        Path jsonPath = Paths.get(projectPath, "rvo", "source", String.valueOf(bID), outputDir, "input.json");
        Files.createDirectories(jsonPath.getParent());
        
        // 使用Gson将Map转换为JSON
        Gson gson = new Gson();
        try (BufferedWriter writer = Files.newBufferedWriter(jsonPath, StandardCharsets.UTF_8)) {
            gson.toJson(inputData, writer);
        }
        
        return jsonPath.toString();
    }
    
    /**
     * 将C++程序生成的文本格式转换为Java ObjectOutputStream格式
     * 如果C++程序直接生成Java格式，此方法可以为空
     */
    private void convertToJavaFormat(Path outputDir) throws IOException {
        Path rawPath = outputDir.resolve("simulation_raw.json");
        if (!Files.exists(rawPath)) {
            System.err.println("simulation_raw.json not found in " + outputDir);
            return;
        }

        JsonObject root;
        try (BufferedReader reader = Files.newBufferedReader(rawPath, StandardCharsets.UTF_8)) {
            root = JsonParser.parseReader(reader).getAsJsonObject();
        } catch (Exception ex) {
            throw new IOException("Failed to parse simulation_raw.json", ex);
        }

        JsonObject config = root.has("config") && root.get("config").isJsonObject()
                ? root.getAsJsonObject("config") : new JsonObject();

        JsonArray frames = root.has("frames") && root.get("frames").isJsonArray()
                ? root.getAsJsonArray("frames") : new JsonArray();
        int totalFrames = frames.size();

        List<ReplayFlat> flats = new ArrayList<>();
        int agentCount = 0;
        if (totalFrames > 0) {
            JsonObject firstFrame = frames.get(0).getAsJsonObject();
            JsonArray agentsArray = firstFrame.has("agents") && firstFrame.get("agents").isJsonArray()
                    ? firstFrame.getAsJsonArray("agents") : new JsonArray();
            agentCount = agentsArray.size();

            final int chunkSize = 300;
            int index = 1;
            for (int start = 1; start <= totalFrames; start += chunkSize) {
                int duration = Math.min(chunkSize, totalFrames - start + 1);
                flats.add(new ReplayFlat(index++, start, duration, agentCount));
            }
        } else {
            flats.add(new ReplayFlat(1, 1, 0, 0));
        }
        writeObject(outputDir.resolve("replayData.txt"), flats);
        writeJson(outputDir.resolve("replayData.json"), flats);

        JsonArray exitsArray = root.has("exits") && root.get("exits").isJsonArray()
                ? root.getAsJsonArray("exits") : new JsonArray();
        Map<Long, Integer> exitIndex = new HashMap<>();
        for (int i = 0; i < exitsArray.size(); i++) {
            JsonObject exitObj = exitsArray.get(i).getAsJsonObject();
            long exitId = exitObj.has("id") ? exitObj.get("id").getAsLong() : i;
            exitIndex.put(exitId, i);
        }

        JsonArray completedEvents = root.has("completedEvents") && root.get("completedEvents").isJsonArray()
                ? root.getAsJsonArray("completedEvents") : new JsonArray();
        List<Map<String, Integer>> statistics = new ArrayList<>();
        for (JsonElement element : completedEvents) {
            JsonObject obj = element.getAsJsonObject();
            Map<String, Integer> entry = new HashMap<>();
            int frameIndex = obj.has("frame") ? obj.get("frame").getAsInt() : 0;
            long exitId = obj.has("exitId") ? obj.get("exitId").getAsLong() : 0L;
            entry.put("cnt", frameIndex);
            entry.put("exit", exitIndex.getOrDefault(exitId, 0));
            statistics.add(entry);
        }
        statistics.sort(Comparator.comparingInt(m -> m.getOrDefault("cnt", 0)));
        writeObject(outputDir.resolve("statistic"), statistics);

        writeObject(outputDir.resolve("Time.txt"), Integer.valueOf(totalFrames));
        writeObject(outputDir.resolve("exit.txt"), Integer.valueOf(exitIndex.size()));

        List<Double> grd = new ArrayList<>();
        grd.add(0.0);
        writeObject(outputDir.resolve("grd"), grd);
        writeObject(outputDir.resolve("preGrd"), new ArrayList<>(grd));

        List<List<Map<String, Integer>>> heatMap = new ArrayList<>();
        Path heatMapPath = outputDir.getParent() != null
                ? outputDir.getParent().resolve("heatMap.rvo")
                : outputDir.resolve("heatMap.rvo");
        writeObject(heatMapPath, heatMap);

        generateResultJson(config);
    }

    private void writeObject(Path path, Object value) throws IOException {
        Path parent = path.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(path))) {
            oos.writeObject(value);
        }
    }

    private void writeJson(Path path, Object value) throws IOException {
        Path parent = path.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        try (BufferedWriter writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(GSON.toJson(value));
        }
    }

    private void generateResultJson(JsonObject config) throws IOException {
        if (jsonServer == null || config == null) {
            System.err.println("JsonServer bean unavailable or config missing; skip result-json.rvo generation");
            return;
        }

        int bID = config.has("bID") ? config.get("bID").getAsInt() : -1;
        int status = config.has("status") ? config.get("status").getAsInt() : 1;
        String fileName = config.has("fileName") ? config.get("fileName").getAsString() : null;
        double imgX0 = config.has("imgX0") ? config.get("imgX0").getAsDouble() : 0.0;
        double imgY0 = config.has("imgY0") ? config.get("imgY0").getAsDouble() : 0.0;
        double sT = config.has("sT") ? config.get("sT").getAsDouble() : 1.0;

        if (bID <= 0 || fileName == null || fileName.isEmpty()) {
            System.err.println("Insufficient config data for result-json generation");
            return;
        }

        jsonServer.toJsonFile(bID, status, fileName, imgX0, imgY0, sT);
    }
}

