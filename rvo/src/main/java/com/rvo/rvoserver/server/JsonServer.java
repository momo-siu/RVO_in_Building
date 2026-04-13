package com.rvo.rvoserver.server;

import com.rvo.rvoserver.pojo.Exit;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;

public interface JsonServer {


    void toJsonFile(int bID,int status,String file,double imgX0,double imgY0,double sT) throws IOException;

    void checkFile(int bID,int status, String file) throws IOException;

/**
 * 将房间和集合点数据生成json文件
 *
 * @param bID  项目id
 * @param matrixRoomToExit  房间集合点权重矩阵
 * @param rooms  房间信息
     * @param exits  参与线性规划的终点集合点信息（当前仅包含 F1 集合点）
 * {@code @author} Jia
 * {@code @date} 2024/9/2 9:51
 */
    void dataToJsonFile(int bID, int [][] matrixRoomToExit, List<HashMap> rooms,List<HashMap> peosList, List<Exit> exits, String ProjectPath,String file) throws IOException;

}
