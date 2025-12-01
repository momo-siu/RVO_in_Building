//package com.rvo.rvoserver.utils;
//
//import jakarta.annotation.PostConstruct;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.data.redis.core.RedisTemplate;
//import org.springframework.stereotype.Component;
//
//import javax.annotation.*;
//import java.io.*;
//import java.util.HashSet;
//import java.util.Set;
//
//@Component
//public class FloydAlgorithm {
//
//    @Autowired
//    private RedisTemplate redisTemplate;
//
//    public static FloydAlgorithm floydAlgorithm;
//
//    public static int MaxValue = 10000;
//    public static int[][] path;
//
//    @PostConstruct
//    public void init() {
//        floydAlgorithm = this;
//    }
//
//
//    public void buildFloyd(int pointnums, int[][] paths) throws IOException, IOException {
//
//        int vertex = pointnums;
//        //初始化路径数组
//
//        int[][] matrix = paths;
//        path = new int[matrix.length][matrix.length];
//
//        File file = new File("shortestpath.txt");
//        //if file doesnt exists, then create it
//        if(!file.exists()){
//            file.createNewFile();
//        }
//        //true = append file
//        //FileWriter fileWritter = new FileWriter(file.getName(),true);
//        OutputStreamWriter outStream = new OutputStreamWriter(new FileOutputStream(file),"UTF-8");
//        //OutputStreamWriter outStream = new OutputStreamWriter(new FileOutputStream(file,true),"UTF-8");
//
//        //调用算法计算最短路径
//        floyd(matrix,outStream);
//
//        outStream.close();
//        System.out.println("Done");
//    }
//
//    //非递归实现
//    public static void floyd(int[][] matrix, OutputStreamWriter outputStream) throws IOException {
//
//        floydAlgorithm.netPointService.deleteAll();
//        Set<Integer> singlepath = new HashSet<>();
//        //中文字符可能会出现乱码
//        BufferedWriter  bw = new BufferedWriter(outputStream);
//        for (int i = 0; i < matrix.length; i++) {
//            for (int j = 0; j < matrix.length; j++) {
//                path[i][j] = -1;
//            }
//        }
//
//        for (int m = 0; m < matrix.length; m++) {
//            for (int i = 0; i < matrix.length; i++) {
//                for (int j = 0; j < matrix.length; j++) {
//                    if (matrix[i][m] + matrix[m][j] < matrix[i][j]) {
//                        matrix[i][j] = matrix[i][m] + matrix[m][j];
//                        //记录经由哪个点到达
//                        path[i][j] = m;
//                    }
//                }
//            }
//        }
//
//        for (int i = 0; i < matrix.length; i++) {
//            for (int j = 0; j < matrix.length; j++) {
//                if (i != j) {
//                    if (matrix[i][j] == MaxValue) {
//                        System.out.println(i + "到" + j + "不可达");
////                        floydAlgorithm.netPointService.addshortestpath(i,j);
//
//                        //bw.newLine();
//                    } else {
//                        System.out.print(i + "到" + j + "的最短路径长度是：" + matrix[i][j]);
//                        System.out.print("最短路径为：" + i + "->");
//                        singlepath.add(i);
//                        floydAlgorithm.netPointService.flushshortestpath(i,j);
//                        floydAlgorithm.netPointService.addshortestpath(i,j,i);
//                        bw.write(String.valueOf(i)+",");
//                        findPath(i, j, bw, i, j);
//                        System.out.println(j);
//                        bw.write(String.valueOf(j));
//                        singlepath.add(j);
//                        floydAlgorithm.netPointService.addshortestpath(i,j,j);
//                    }
//                }
////                else {
////                    bw.write(String.valueOf(i)+","+String.valueOf(i));
////                }
//                bw.newLine();
//                //bw.flush();
//            }
//        }
//        bw.close();
//    }
//
//    //递归寻找路径
//    public static void findPath(int i, int j, BufferedWriter bufferedWriter, int start, int end) throws IOException {
//        int m = path[i][j];
//        if (m == -1) {
//            return;
//        }
//
//        findPath(i, m, bufferedWriter, start, end);
//        System.out.print(m + "->");
//        floydAlgorithm.netPointService.addshortestpath(start,end,m);
//        bufferedWriter.write(String.valueOf(m)+",");
//        findPath(m, j, bufferedWriter, start, end);
//    }
//}
