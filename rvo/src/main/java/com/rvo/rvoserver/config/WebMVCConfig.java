package com.rvo.rvoserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMVCConfig implements WebMvcConfigurer {

    @Value("${path.projectPath}")
    private String path;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowCredentials(true)
                .allowedOrigins(new String[] { "http://127.0.0.1:8080", "http://0.0.0.0:8080" })
                .allowedMethods(new String[] { "GET", "POST", "PUT", "DELETE" })
                .allowedHeaders("*");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 先从磁盘统一目录查找（path），找不到再从 classpath:/static/source/ 查找
        registry.addResourceHandler("/source/**")
                // .addResourceLocations("file:" + path);
                .addResourceLocations("file:" + path, "classpath:/static/source/")
                .setCachePeriod(3600);
    }

}
