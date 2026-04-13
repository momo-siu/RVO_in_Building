package com.rvo.rvoserver.server;

import org.springframework.beans.factory.annotation.Value;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;

public class JavaPythonCaller {

    public static void runPython(String projectPath, String file, String venvPath, int bID) {
        Path projectDir = Paths.get(projectPath, String.valueOf(bID), file);
        File file1 = projectDir.toFile();
        if (!file1.exists()){
            file1.mkdirs();
        }
        String pythonScriptName = "cal_rooms.py"; // Python 脚本名称
        String project_url = projectDir.toString() + File.separator;

        // 从类路径中获取 Python 脚本的内容
        InputStream pythonScriptStream = JavaPythonCaller.class.getClassLoader().getResourceAsStream(pythonScriptName);
        if (pythonScriptStream == null) {
            System.err.println("Python script not found on classpath: " + pythonScriptName);
            return;
        }

        // 将 Python 脚本保存到临时文件中，以便执行
        File tempPythonFile;
        try {
            tempPythonFile = File.createTempFile("script", ".py");
            tempPythonFile.deleteOnExit();
            try (FileOutputStream tempFileStream = new FileOutputStream(tempPythonFile)) {
                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = pythonScriptStream.read(buffer)) != -1) {
                    tempFileStream.write(buffer, 0, bytesRead);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            return;
        }

        // 检查 Python 版本并安装兼容的 pulp 库
        try {
            // 先检查 Python 版本
            ProcessBuilder versionChecker = new ProcessBuilder(venvPath, "--version");
            Process versionProcess = versionChecker.start();
            BufferedReader versionReader = new BufferedReader(new InputStreamReader(versionProcess.getInputStream()));
            String versionLine = versionReader.readLine();
            versionProcess.waitFor();
            
            // 解析版本号（格式通常是 "Python 3.x.x"）
            int pythonVersion = 3;
            if (versionLine != null && versionLine.contains("Python")) {
                String[] parts = versionLine.split("\\s+");
                for (String part : parts) {
                    if (part.startsWith("3.")) {
                        String[] versionParts = part.split("\\.");
                        if (versionParts.length >= 2) {
                            pythonVersion = Integer.parseInt(versionParts[1]);
                        }
                        break;
                    }
                }
            }
            
            // 根据 Python 版本安装兼容的 pulp 版本
            // Python 3.8+ 可以使用最新版本，Python 3.7 需要使用 pulp<2.6
            String pulpVersion = pythonVersion >= 8 ? "pulp" : "pulp<2.6";
            System.out.println("检测到 Python 版本: " + versionLine + ", 将安装: " + pulpVersion);
            
            ProcessBuilder pipInstaller = new ProcessBuilder(venvPath, "-m", "pip", "install", "--upgrade", pulpVersion);
            Process pipProcess = pipInstaller.start();
            
            // 读取输出以便调试
            BufferedReader pipOutput = new BufferedReader(new InputStreamReader(pipProcess.getInputStream()));
            BufferedReader pipError = new BufferedReader(new InputStreamReader(pipProcess.getErrorStream()));
            String pipLine;
            while ((pipLine = pipOutput.readLine()) != null) {
                System.out.println("pip output: " + pipLine);
            }
            while ((pipLine = pipError.readLine()) != null) {
                System.err.println("pip error: " + pipLine);
            }
            
            int pipExitCode = pipProcess.waitFor();
            if (pipExitCode != 0) {
                System.err.println("pulp库安装失败，退出码: " + pipExitCode);
                // 不直接返回，尝试继续执行，可能库已经安装
            }
        } catch (IOException | InterruptedException | NumberFormatException e) {
            System.err.println("检查 Python 版本或安装 pulp 库时出错: " + e.getMessage());
            e.printStackTrace();
            // 尝试安装默认版本
            try {
                ProcessBuilder pipInstaller = new ProcessBuilder(venvPath, "-m", "pip", "install", "pulp<2.6");
                Process pipProcess = pipInstaller.start();
                int pipExitCode = pipProcess.waitFor();
                if (pipExitCode != 0) {
                    System.err.println("安装兼容版本的 pulp 库也失败");
                }
            } catch (Exception ex) {
                System.err.println("安装 pulp 库失败: " + ex.getMessage());
            }
        }

        // 运行 Python 脚本
        ProcessBuilder processBuilder = new ProcessBuilder(venvPath, tempPythonFile.getAbsolutePath(), project_url);
        try {
            Process processPython = processBuilder.start();
            
            // 读取标准输出和错误输出
            BufferedReader stdOutput = new BufferedReader(new InputStreamReader(processPython.getInputStream()));
            BufferedReader stdError = new BufferedReader(new InputStreamReader(processPython.getErrorStream()));

            // 打印标准输出
            String line;
            StringBuilder errorOutput = new StringBuilder();
            while ((line = stdOutput.readLine()) != null) {
                System.out.println("Python output: " + line);
            }

            // 收集错误输出
            while ((line = stdError.readLine()) != null) {
                System.err.println("Python error: " + line);
                errorOutput.append(line).append("\n");
            }

            int exitCodePy = processPython.waitFor();
            if (exitCodePy != 0) {
                String errorMsg = errorOutput.toString();
                System.err.println("Python script exited with error code: " + exitCodePy);
                if (errorMsg.contains("ImportError") && errorMsg.contains("Literal")) {
                    System.err.println("错误: Python 版本过低或 pulp 库版本不兼容。");
                    System.err.println("解决方案: 请升级 Python 到 3.8+ 版本，或使用命令安装兼容版本: pip install 'pulp<2.6'");
                }
                throw new RuntimeException("Python 脚本执行失败: " + errorMsg);
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
            throw new RuntimeException("执行 Python 脚本时发生异常: " + e.getMessage(), e);
        }
    }
}
