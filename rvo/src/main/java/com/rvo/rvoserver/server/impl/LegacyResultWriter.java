package com.rvo.rvoserver.server.impl;

import com.google.gson.Gson;
import com.rvo.rvoserver.pojo.ReplayFlat;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.io.PrintWriter;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
class LegacyResultWriter {

    private static final Gson GSON = new Gson();

    void writeLegacyArtifacts(Path outputDir) {
        Path rawPath = outputDir.resolve("simulation_raw.json");
        if (!Files.exists(rawPath)) {
            log.warn("simulation_raw.json not found in {}. Skipping legacy artifact generation.", outputDir);
            return;
        }

        SimulationRaw raw;
        try (Reader reader = Files.newBufferedReader(rawPath, StandardCharsets.UTF_8)) {
            raw = GSON.fromJson(reader, SimulationRaw.class);
        } catch (IOException e) {
            log.warn("Failed to read simulation_raw.json from {}", rawPath, e);
            return;
        } catch (RuntimeException ex) {
            log.warn("Failed to parse simulation_raw.json from {}", rawPath, ex);
            return;
        }

        if (raw == null) {
            log.warn("Parsed simulation_raw.json is null for {}", rawPath);
            return;
        }

        ensureLegacyOutputs(outputDir, raw);
    }

    private void ensureLegacyOutputs(Path outputDir, SimulationRaw raw) {
        try {
            Files.createDirectories(outputDir);
        } catch (IOException e) {
            log.error("Unable to create output directory {}", outputDir, e);
            return;
        }

        Map<Integer, Integer> exitIndexMap = buildExitIndexMap(raw);

        writeStatistic(outputDir, raw, exitIndexMap);
        writeReplayData(outputDir, raw);
        writeTimeFile(outputDir, raw);
        writeExitFile(outputDir, raw);
        writeHeatMap(outputDir, raw);
        writeExitStatistic(outputDir, raw, exitIndexMap);
    }

    private Map<Integer, Integer> buildExitIndexMap(SimulationRaw raw) {
        Map<Integer, Integer> indexMap = new HashMap<>();
        if (raw.exits != null) {
            for (int i = 0; i < raw.exits.size(); i++) {
                Exit exit = raw.exits.get(i);
                int exitId = (int) exit.id;
                indexMap.put(exitId, i);
            }
        }
        return indexMap;
    }

    private void writeStatistic(Path outputDir, SimulationRaw raw, Map<Integer, Integer> exitIndexMap) {
        Path statisticPath = outputDir.resolve("statistic");
        List<Map<String, Integer>> records = new ArrayList<>();
        if (raw.completedEvents != null) {
            List<CompletedEvent> sorted = new ArrayList<>(raw.completedEvents);
            sorted.sort(Comparator.comparingInt(e -> e.frame));
            for (CompletedEvent event : sorted) {
                Map<String, Integer> entry = new HashMap<>();
                entry.put("id", event.agentId);
                entry.put("cnt", event.frame);
                entry.put("exit", exitIndexMap.getOrDefault(event.exitId, 0));
                records.add(entry);
            }
        }

        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(statisticPath))) {
            oos.writeObject(records);
        } catch (IOException e) {
            log.warn("Failed to write statistic file at {}", statisticPath, e);
        }
    }

    private void writeReplayData(Path outputDir, SimulationRaw raw) {
        Path replayTxt = outputDir.resolve("replayData.txt");
        List<ReplayFlat> flats = new ArrayList<>();
        int totalFrames = raw.frames == null ? 0 : raw.frames.size();
        if (totalFrames <= 0) {
            flats.add(new ReplayFlat(1, 1, 0, 0));
        } else {
            final int chunkSize = 300;
            int index = 1;
            int cursor = 1;
            while (cursor <= totalFrames) {
                int remaining = totalFrames - (cursor - 1);
                int duration = Math.min(chunkSize, remaining);
                flats.add(new ReplayFlat(index++, cursor, duration, duration));
                cursor += duration;
            }
        }

        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(replayTxt))) {
            oos.writeObject(flats);
        } catch (IOException e) {
            log.warn("Failed to write replayData.txt at {}", replayTxt, e);
        }
    }

    private void writeTimeFile(Path outputDir, SimulationRaw raw) {
        Path timePath = outputDir.resolve("Time.txt");
        int finalFrame = 0;
        if (raw.frames != null && !raw.frames.isEmpty()) {
            finalFrame = raw.frames.get(raw.frames.size() - 1).index;
        } else if (raw.completedEvents != null && !raw.completedEvents.isEmpty()) {
            finalFrame = raw.completedEvents.stream().mapToInt(e -> e.frame).max().orElse(0);
        }

        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(timePath))) {
            oos.writeObject(finalFrame);
        } catch (IOException e) {
            log.warn("Failed to write Time.txt at {}", timePath, e);
        }
    }

    private void writeExitFile(Path outputDir, SimulationRaw raw) {
        Path exitPath = outputDir.resolve("exit.txt");
        int exitCount = raw.exits == null ? 0 : raw.exits.size();
        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(exitPath))) {
            oos.writeObject(exitCount);
        } catch (IOException e) {
            log.warn("Failed to write exit.txt at {}", exitPath, e);
        }
    }

    private void writeHeatMap(Path outputDir, SimulationRaw raw) {
        Path heatPath = outputDir.resolve("heatMap.rvo");
        List<List<Map<String, Integer>>> heatData = new ArrayList<>();
        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(heatPath))) {
            oos.writeObject(heatData);
        } catch (IOException e) {
            log.warn("Failed to write heatMap.rvo at {}", heatPath, e);
        }
    }

    private void writeExitStatistic(Path outputDir, SimulationRaw raw, Map<Integer, Integer> exitIndexMap) {
        Path exitStatisticPath = outputDir.resolve("exitStatistic.txt");
        List<CompletedEvent> events = raw.completedEvents == null ? Collections.emptyList() : raw.completedEvents;

        try (BufferedWriter writer = Files.newBufferedWriter(exitStatisticPath, StandardCharsets.UTF_8);
             PrintWriter printWriter = new PrintWriter(writer)) {
            printWriter.println(events.size());
            for (CompletedEvent event : events) {
                printWriter.printf("%d %d %d %.4f exit%d%n",
                        event.agentId,
                        exitIndexMap.getOrDefault(event.exitId, 0),
                        event.frame,
                        0.0,
                        exitIndexMap.getOrDefault(event.exitId, 0));
            }
        } catch (IOException e) {
            log.warn("Failed to write exitStatistic.txt at {}", exitStatisticPath, e);
        }
    }

    private static class SimulationRaw {
        Config config;
        List<Exit> exits;
        List<Frame> frames;
        List<CompletedEvent> completedEvents;
    }

    private static class Config {
        Integer agentCount;
    }

    private static class Exit {
        long id;
    }

    private static class Frame {
        int index;
        double time;
        List<AgentSnapshot> agents;
    }

    private static class AgentSnapshot {
        int id;
        double x;
        double y;
    }

    private static class CompletedEvent {
        int agentId;
        int exitId;
        int frame;
        double time;
    }
}
