package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;

@Data
@AllArgsConstructor
public class Agent {

    private int id;
    private Pos pos;
    private int exitId; // 前往的出口
    private ArrayList<Integer> room_id; // 最开始所在房间
    private double sTime;//开始时间
    private double vel;//速度
    private double radius=0.1;// 半径
    private Integer floorId = 0; // 当前楼层
    private Integer targetFloorId = 0; // 目标楼层
    private Double transferRemainingTime = 0.0;
    private ArrayList<Integer> gotList; // 已经经过的 waypoint（按 NavGrid vertexID 存储）
    private ArrayList<Double> waypointXs; // 预计算路径的 x 座标序列
    private ArrayList<Double> waypointYs; // 预计算路径的 y 座标序列
    private Integer graphNodeIndex; // 在导航图中的起始顶点索引

    public Agent() {
        sTime = 0;
        gotList = new ArrayList<>();
        waypointXs = new ArrayList<>();
        waypointYs = new ArrayList<>();
        graphNodeIndex = null;
    }

    public void reSetVel(){
        this.vel = 0;
    }

    public void transformScale(double scale) {
        pos.transformScale(scale);
    }

    public void addWaypoint(Pos waypoint) {
        if (waypoint == null) {
            return;
        }
        if (waypointXs == null) {
            waypointXs = new ArrayList<>();
            waypointYs = new ArrayList<>();
        }
        waypointXs.add(waypoint.getX());
        waypointYs.add(waypoint.getY());
    }

    public void clearWaypoints() {
        if (waypointXs != null) {
            waypointXs.clear();
        }
        if (waypointYs != null) {
            waypointYs.clear();
        }
    }

    public Integer getGraphNodeIndex() {
        return graphNodeIndex;
    }

    public void setGraphNodeIndex(Integer graphNodeIndex) {
        this.graphNodeIndex = graphNodeIndex;
    }
}
