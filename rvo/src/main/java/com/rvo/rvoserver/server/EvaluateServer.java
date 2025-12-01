package com.rvo.rvoserver.server;

import com.rvo.rvoserver.pojo.*;
import jakarta.servlet.ServletOutputStream;
import org.springframework.scheduling.annotation.Async;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.List;
import java.util.Map;

public interface EvaluateServer {

    int getState(int bID);

    int getSchedule(int bID);

    void setSchedule(int bId,int num);

    List<List<Map<String, Object>>> getReplay(int bID) throws IOException;


    Map<String, Object> getReplayData(int bID, int status,String file) throws IOException, ClassNotFoundException;

    List<List<Map<String, Object>>> getReplayFlat(int bID, int flat, int status,String file) throws IOException, ClassNotFoundException;

    void getReplayFlat(int bID, int flat,int status, String file, ServletOutputStream out) throws IOException, ClassNotFoundException;

    List<List<Map<String, Object>>> getReplayFlat2(int bID, int flat, int status,String file) throws IOException, ClassNotFoundException;

    void getReplayFlat2(int bID, int flat,int status, String file, ServletOutputStream out) throws IOException, ClassNotFoundException;

    Map<String, Object> getExportStatistics(int bID, int unit,int status,String file);

    double getTime(int bID);

    double getTime(int bID,String fileName);

    Integer getNumExit(int bID,String fileName);

    List<List<Map<String, Integer>>> getHeatMap(int bID);

    Map<String, Object> getGRD(int bID,int status, String file);

    Map<String, Object> getPerGRD(int bID,int status,String file);

    void calDensity(int bID, List<DensityRect> rects, double scale) throws IOException;

    List<Double> getDensity(int bID,String fileName);
    List<Double> getDensity1(int bID,String fileName);

    void calDensity(int bID, List<DensityRect> rects, double imgX0, double imgY0, double imgX1, double imgY1,String fileName) throws IOException;
    void calDensity1(int bID, List<DensityRect> rects, double imgX0, double imgY0, double imgX1, double imgY1,String fileName) throws IOException;
}
