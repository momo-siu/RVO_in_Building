package com.rvo.rvoserver.controller;

import com.rvo.rvoserver.pojo.Result;
import com.rvo.rvoserver.server.BlueprintServer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.*;
import java.nio.file.Files;
import java.text.DecimalFormat;
import java.util.*;

@RestController
@Slf4j
public class BlueprintController {

    private final String backgroundPath = "/background/";

    @Value("${path.projectPath}")
    private String projectPath;

    @Autowired
    BlueprintServer blueprintServer;

    private boolean folderExists(String path, String folderName) {
        File folder = new File(path, folderName);
        return folder.exists() && folder.isDirectory();
    }

    @PostMapping("/createBlueprint")
    public Result createBlueprint(@RequestParam(value = "background", required = false) MultipartFile background,
            @RequestParam(value = "name") String name,
            @RequestParam(value = "description") String description,
            @RequestParam(value = "addr") String addr,
            @RequestParam(value = "mapWidth") int mapWidth,
            @RequestParam(value = "mapHeight") int mapHeight) throws IOException {

        int id = blueprintServer.createBlueprint(name, description, "", mapHeight, mapWidth, addr);

        // 创建文件夹 - 使用配置的项目路径，确保项目保存在 source/{id} 目录下
        File projectFolder = new File(projectPath, String.valueOf(id));
        if (!projectFolder.exists()) {
            if (!projectFolder.mkdirs()) {
                return Result.error("Server file error");
            }
        }

        // 保存背景图片
        if (background != null && !background.isEmpty()) {
            String originalFileName = background.getOriginalFilename();
            String newFileName = "background" + originalFileName.substring(originalFileName.lastIndexOf("."));
            background.transferTo(new File(projectFolder, newFileName));
            String backgroundPath = "source/" + id + "/" + newFileName; // 前端访问路径
            blueprintServer.saveBackground(id, backgroundPath);
        }

        return Result.success(id);
    }

    @PostMapping("/updateBlueprint")
    public Result updateBlueprint(@RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("bID") String bID,
            @RequestParam("addr") String addr) throws IOException {

        int id = Integer.parseInt(bID);

        // 修改项目
        blueprintServer.updateBlueprint(id, name, description, addr);
        return Result.success(id);
    }

    @PostMapping("/listBlueprint")
    public Result listBlueprint() {
        List<Map<String, Object>> res = blueprintServer.listBlueprint();
        return Result.success(res);
    }

    @PostMapping("/uploadBackground")
    public Result uploadHeader(HttpServletRequest request) throws IOException {
        int bID = Integer.parseInt(request.getHeader("bID"));
        // 获取文件
        MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
        MultipartFile file = multipartRequest.getFile("file");
        String originalFileName = file.getOriginalFilename();
        String newFileName = UUID.randomUUID().toString()
                + originalFileName.substring(originalFileName.lastIndexOf("."));
        file.transferTo(new File(backgroundPath + newFileName));
        blueprintServer.setBg(bID, "background/" + newFileName);
        return Result.success("background/" + newFileName);
    }

    @PostMapping("/uploadSize")
    public Result uploadSize(HttpServletRequest request) throws IOException {
        int bID = Integer.parseInt(request.getHeader("bID"));
        // 获取文件
        MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
        MultipartFile file = multipartRequest.getFile("file");
        assert file != null;
        InputStream inputStream = file.getInputStream();
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
        String s = reader.readLine();
        String[] split = s.split(",");
        blueprintServer.setSize(bID, Integer.parseInt(split[0]), Integer.parseInt(split[1]));
        Map<String, Integer> res = new HashMap<>();
        res.put("width", Integer.parseInt(split[0]));
        res.put("height", Integer.parseInt(split[1]));
        return Result.success(res);
    }

    @PostMapping("/getBlueprint")
    public Result getBlueprint(int bID) {
        Map<String, Object> res = blueprintServer.getBlueprint(bID);
        // if(res == null) { return Result.error("找不到该项目"); }
        return Result.success(res);
    }

    @PostMapping("/saveBlueprint")
    public Result saveBlueprint(HttpServletRequest request, @RequestBody String json) {
        int bID = Integer.parseInt(request.getHeader("bID"));

        // String navPos = request.getParameter("navPos");
        // String agentPos = request.getParameter("agentPos");
        // String wallArr = request.getParameter("wallArr");
        // String exit = request.getParameter("exit");
        // System.out.println(json);

        blueprintServer.saveBlueprint(bID, json);
        return Result.success();
    }

    // //创建新版本
    // @PostMapping("/newVersion")
    // public Result newVersion() {
    //
    // }
    @PostMapping("/getSize")
    public Result getSize(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        Map<String, Object> res = blueprintServer.getSize(bID);
        return Result.success(res);
    }

    @PostMapping("/getBackground")
    public Result getBackground(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        String res = blueprintServer.getBackground(bID);
        return Result.success(res);
    }

    @PostMapping("/getInfo")
    public Result getInfo(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        Map<String, Object> res = blueprintServer.getInfo(bID);
        return Result.success(res);
    }

    @PostMapping("/deleteBlueprint")
    public Result deleteBlueprint(@RequestBody Map request) {
        int bID = (int) request.get("bID");
        boolean res = blueprintServer.deleteBlueprint(bID);
        return Result.success(res);
    }

    // 获取出口列表
    @PostMapping("/exit")
    public Result exit(@RequestBody Map request) {
        int bID = (int) request.get("bID");
        Map<String, Object> res = blueprintServer.exit(bID);
        if (res == null) {
            return Result.error("该项目不存在或未模拟执行");
        }
        return Result.success(res);
    }

    @PostMapping("/projects")
    public Result projects() {
        Map<String, Object> res = blueprintServer.projects();
        return Result.success(res);
    }

    // 获取出口统计信息
    @PostMapping("/exitData")
    public Result exitData(@RequestBody Map request) {
        int bID = (int) request.get("bID");
        Map<String, Object> res = blueprintServer.exitData(bID);
        if (res == null) {
            return Result.error("该项目不存在或未模拟执行");
        }
        return Result.success(res);
    }

    // 保存副本
    @PostMapping("/copy")
    public Result copy(@RequestBody Map request) {
        int bID = Integer.parseInt((String) request.get("bID"));
        int res = blueprintServer.copy(bID);
        if (res == -1) {
            return Result.error("该项目不存在");
        }
        return Result.success(res);
    }
}
