package com.rvo.rvoserver.controller;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;

@Controller
public class WebController {

    @Value("${frontIP}")
    String frontIP;

    @GetMapping("/config.js")
    public void downloadFile(HttpServletResponse response) throws IOException {
        // 设置响应头
        String fileName = "example.txt"; // 你可以根据需要动态设置文件名
        response.setContentType("text/javascript");
//        response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");

        // 假设你有一个字符串，你想要将其转换为文件并返回
        String textContent = "const IPCONFIG = '" + frontIP + "';\n" +
                "\n" +
                "const config = {\n" +
                "    baseURL: 'http://'+IPCONFIG+'/',\n" +
                "    ws:'ws://'+IPCONFIG+'/webSocketServer/'\n" +
                "}\n" +
                "\n" +
                "window.config=config; ";

        // 将文本转换为字节数组（如果需要的话）
        byte[] fileContent = textContent.getBytes("UTF-8");

        // 写入响应体
        try (ServletOutputStream outputStream = response.getOutputStream()) {
            outputStream.write(fileContent);
            outputStream.flush();
        }

        // 设置HTTP状态为200（如果需要的话，虽然这通常是默认值）
        response.setStatus(HttpStatus.OK.value());
    }

}
