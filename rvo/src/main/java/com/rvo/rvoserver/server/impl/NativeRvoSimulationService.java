package com.rvo.rvoserver.server.impl;

import com.rvo.rvoserver.nativebridge.NativeRvoBridge;
import com.rvo.rvoserver.nativebridge.NativeSimulationInput;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Component
public class NativeRvoSimulationService {

    @Value("${path.projectPath}")
    private String projectPath;

    public boolean runSimulation(int bID, NativeSimulationInput inputData, String fileName) throws IOException {
        if (inputData == null) {
            throw new IllegalArgumentException("NativeSimulationInput cannot be null");
        }

        Path outputPath = resolveOutputPath(bID, fileName);
        Files.createDirectories(outputPath);

        NativeSimulationInput.NativeSimulationConfig config = inputData.config;
        if (config == null) {
            config = new NativeSimulationInput.NativeSimulationConfig();
            inputData.config = config;
        }
        config.bID = bID;
        config.fileName = fileName;
        config.outputDir = outputPath.toString();

        try (NativeRvoBridge bridge = new NativeRvoBridge()) {
            if (!bridge.loadFromData(inputData)) {
                log.error("Native simulator failed to load memory payload for bID {} file {}", bID, fileName);
                return false;
            }
            bridge.setOutputDir(outputPath.toString());
            if (!bridge.runSimulation()) {
                log.error("Native simulator run() failed for bID {} file {}", bID, fileName);
                return false;
            }
            if (!bridge.saveResults()) {
                log.error("Native simulator saveResults() failed for bID {} file {}", bID, fileName);
                return false;
            }
        } catch (UnsatisfiedLinkError e) {
            log.error("Failed to load native_rvo_interface. Ensure the JNI library is built and on java.library.path", e);
            throw e;
        } catch (RuntimeException e) {
            log.error("Native simulator threw an exception for bID {} file {}", bID, fileName, e);
            throw e;
        }

        return true;
    }

    private Path resolveOutputPath(int bID, String fileName) {
        return Paths.get(projectPath, "rvo", "source", String.valueOf(bID), fileName == null ? "default" : fileName);
    }
}
