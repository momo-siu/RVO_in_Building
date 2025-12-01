package com.rvo.rvoserver.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
public class RootSourceController {

    @Value("${path.projectPath}")
    private String projectBase;

    @GetMapping("/source/{projectId}/{filename:.+}")
    public ResponseEntity<Resource> getSourceFileRoot(@PathVariable String projectId, @PathVariable String filename)
            throws IOException {
        Path fileOnDisk = Paths.get(projectBase, "rvo", "source", projectId, filename);
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
}
