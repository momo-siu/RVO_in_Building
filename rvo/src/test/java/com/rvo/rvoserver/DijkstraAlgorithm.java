//package com.rvo.rvoserver;
//
//import java.util.ArrayList;
//import java.util.Arrays;
//import java.util.List;
//
//public class DijkstraAlgorithm {
//    public static void dijkstra(int[][] matrix, int n, int source) {
//        List<List<Integer>> paths = new ArrayList<>();
//        List<Integer> distances = new ArrayList<>(Arrays.asList(new Integer[n]));
//        List<Boolean> visited = new ArrayList<>(Arrays.asList(new Boolean[n]));
//
//        for (int i = 0; i < n; i++) {
//            paths.add(new ArrayList<>());
//            distances.set(i, 10000);  // 初始化距离为10000表示不可到达
//            visited.set(i, false);
//        }
//
//        distances.set(source, 0);  // 源点到自身的距离为0
//
//        for (int i = 0; i < n; i++) {
//            int u = minDistance(distances, visited);
//            visited.set(u, true);
//
//            for (int v = 0; v < n; v++) {
//                if (!visited.get(v) && matrix[u][v] != 10000) {
//                    if (distances.get(u) + matrix[u][v] < distances.get(v)) {
//                        distances.set(v, distances.get(u) + matrix[u][v]);
//                        paths.get(v).clear();
//                        paths.get(v).addAll(paths.get(u));
//                        paths.get(v).add(u);
//                    }
//                }
//            }
//        }
//
//        for (int i = 0; i < n; i++) {
//            if (i != source) {
//                List<Integer> path = new ArrayList<>(paths.get(i));
//                path.add(i);
//                System.out.println("从顶点 " + source + " 到顶点 " + i + " 的最短路径为: " + path);
//                System.out.println("距离为: " + distances.get(i));
//            }
//        }
//    }
//
//    private static int minDistance(List<Integer> distances, List<Boolean> visited) {
//        int minDist = 10000;
//        int minIndex = -1;
//        for (int v = 0; v < distances.size(); v++) {
//            if (!visited.get(v) && distances.get(v) < minDist) {
//                minDist = distances.get(v);
//                minIndex = v;
//            }
//        }
//        return minIndex;
//    }
//
//    public static void main(String[] args) {
//        int n = 4;  // 顶点数量
//        int[][] matrix = {
//                {0, 1, 4, 10000},
//                {1, 0, 4, 2},
//                {4, 4, 0, 3},
//                {10000, 2, 3, 0}
//        };
//        int source = 0;  // 源顶点
//
//        dijkstra(matrix, n, source);
//    }
//}
