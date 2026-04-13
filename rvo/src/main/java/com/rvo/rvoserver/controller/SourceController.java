package com.rvo.rvoserver.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api")
public class SourceController {

    @Value("${path.projectPath}")
    private String projectBase;

    // 返回磁盘文件或 classpath 回退图（用于 /api/source/... 路由）
    @GetMapping("/source/{projectId}/{filename:.+}")
    public ResponseEntity<Resource> getSourceFile(@PathVariable String projectId, @PathVariable String filename)
            throws IOException {
        Path fileOnDisk = Paths.get(projectBase, projectId, filename);
        Resource res;
        if (Files.exists(fileOnDisk) && Files.isReadable(fileOnDisk)) {
            res = new UrlResource(fileOnDisk.toUri());
        } else {
            ClassPathResource defaultRes = new ClassPathResource("/static/source/default.jpg");
            if (!defaultRes.exists()) {
                return ResponseEntity.notFound().build();
            }
            res = defaultRes;
        }

        String contentType = null;
        try {
            if (res instanceof UrlResource) {
                contentType = Files.probeContentType(Paths.get(((UrlResource) res).getURI()));
            } else {
                contentType = "image/jpeg";
            }
        } catch (Exception ignored) {
        }

        MediaType mediaType = (contentType != null) ? MediaType.parseMediaType(contentType)
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok().contentType(mediaType).body(res);
    }

    // 创建项目目录（保证位置为 {projectBase}/rvo/source/{projectId}），如模板存在则拷贝模板
    @PostMapping("/project/create")
    public ResponseEntity<Map<String, String>> createProject(@RequestParam String projectId) {
        Path target = Paths.get(projectBase, projectId);
        Map<String, String> ret = new HashMap<>();
        try {
            if (!Files.exists(target)) {
                Files.createDirectories(target);
            }

            // 如果有人误把项目创建在 projectBase/{projectId}，尝试移动过去
            Path misplaced = Paths.get(projectBase, projectId);
            if (Files.exists(misplaced) && Files.isDirectory(misplaced)) {
                try {
                    moveDirectoryContents(misplaced, target);
                    // 删除空目录（如需要）
                    try (Stream<Path> s = Files.list(misplaced)) {
                        if (!s.findAny().isPresent())
                            Files.deleteIfExists(misplaced);
                    } catch (Exception ignored) {
                    }
                } catch (Exception ex) {
                    // 不要阻塞创建流程，记录信息返回给调用方
                    ret.put("move_warning", "failed to move misplaced files: " + ex.getMessage());
                }
            }

            // 拷贝模板（如果需要），例：source/59
            Path template = Paths.get(projectBase, "59");
            if (Files.exists(template) && Files.isDirectory(template)) {
                copyTemplate(template, target);
            }

            ret.put("status", "created");
            ret.put("path", target.toString());
            return ResponseEntity.ok(ret);
        } catch (IOException e) {
            ret.put("status", "error");
            ret.put("msg", e.getMessage());
            return ResponseEntity.status(500).body(ret);
        }
    }

    // 新增：手动修正单个项目位置（由你在遇到问题时调用）
    @PostMapping("/project/fixLocation")
    public ResponseEntity<Map<String, String>> fixProjectLocation(@RequestParam String projectId) {
        Map<String, String> ret = new HashMap<>();
        Path target = Paths.get(projectBase, projectId);
        Path misplaced = Paths.get(projectBase, projectId);
        try {
            if (!Files.exists(target))
                Files.createDirectories(target);
            if (Files.exists(misplaced) && Files.isDirectory(misplaced)) {
                moveDirectoryContents(misplaced, target);
                ret.put("status", "moved");
                ret.put("from", misplaced.toString());
                ret.put("to", target.toString());
                return ResponseEntity.ok(ret);
            } else {
                ret.put("status", "not_found");
                return ResponseEntity.badRequest().body(ret);
            }
        } catch (Exception e) {
            ret.put("status", "error");
            ret.put("msg", e.getMessage());
            return ResponseEntity.status(500).body(ret);
        }
    }

    // 新增：获取项目下所有已模拟方案的名称（目录名）
    @GetMapping("/project/listMethods/{projectId}")
    public ResponseEntity<List<String>> listMethods(@PathVariable String projectId) {
        Path projectDir = Paths.get(projectBase, projectId);
        List<String> methods = new ArrayList<>();
        if (Files.exists(projectDir) && Files.isDirectory(projectDir)) {
            try (Stream<Path> stream = Files.walk(projectDir, 2)) {
                stream.filter(Files::isDirectory)
                        .filter(p -> Files.exists(p.resolve("output.json")) || Files.exists(p.resolve("result.rvo")))
                        .map(p -> projectDir.relativize(p).toString().replace("\\", "/"))
                        .filter(name -> !name.isEmpty())
                        .forEach(methods::add);
            } catch (IOException e) {
                return ResponseEntity.status(500).build();
            }
        }
        return ResponseEntity.ok(methods);
    }

    // 工具：把 srcDir 下内容移动到 destDir（存在同名文件则覆盖）
    private void moveDirectoryContents(Path srcDir, Path destDir) throws IOException {
        if (!Files.exists(destDir))
            Files.createDirectories(destDir);
        try (Stream<Path> stream = Files.walk(srcDir)) {
            stream.forEach(p -> {
                try {
                    Path rel = srcDir.relativize(p);
                    Path target = destDir.resolve(rel);
                    if (Files.isDirectory(p)) {
                        if (!Files.exists(target))
                            Files.createDirectories(target);
                    } else {
                        // 确保父目录存在
                        if (!Files.exists(target.getParent()))
                            Files.createDirectories(target.getParent());
                        Files.copy(p, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                } catch (IOException ex) {
                    // 抛给上层处理
                    throw new RuntimeException(ex);
                }
            });
        }
    }

    // 上传背景图，保存到 projectBase/rvo/source/{projectId}/background{ext}，返回保存的文件名
    @PostMapping("/project/{projectId}/uploadBackground")
    public ResponseEntity<Map<String, String>> uploadBackground(@PathVariable String projectId,
            @RequestParam("file") MultipartFile file) {
        Map<String, String> ret = new HashMap<>();
        if (file == null || file.isEmpty()) {
            ret.put("status", "error");
            ret.put("msg", "no file");
            return ResponseEntity.badRequest().body(ret);
        }
        try {
            String original = StringUtils.cleanPath(file.getOriginalFilename());
            String ext = "";
            int i = original.lastIndexOf('.');
            if (i >= 0)
                ext = original.substring(i).toLowerCase(); // .jpg/.png

            Path targetDir = Paths.get(projectBase, projectId);
            if (!Files.exists(targetDir))
                Files.createDirectories(targetDir);

            Path targetFile = targetDir.resolve("background" + ext);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);

            ret.put("status", "ok");
            ret.put("filename", "background" + ext);
            ret.put("path", targetFile.toString());
            return ResponseEntity.ok(ret);
        } catch (IOException e) {
            ret.put("status", "error");
            ret.put("msg", e.getMessage());
            return ResponseEntity.status(500).body(ret);
        }
    }

    // 工具：递归拷贝模板（不覆盖已有文件）
    private void copyTemplate(Path srcDir, Path destDir) throws IOException {
        Files.walk(srcDir).forEach(p -> {
            try {
                Path rel = srcDir.relativize(p);
                Path target = destDir.resolve(rel);
                if (Files.isDirectory(p)) {
                    if (!Files.exists(target))
                        Files.createDirectories(target);
                } else {
                    if (!Files.exists(target))
                        Files.copy(p, target);
                }
            } catch (IOException ex) {
                // ignore individual file copy errors
            }
        });
    }
}
