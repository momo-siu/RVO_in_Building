package com.rvo.rvoserver.pojo;

import com.rvo.rvoserver.Mapper.BlueprintMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;

@Data
@NoArgsConstructor
public class Pos {

    public double x;
    public double y;
    public int state; // 是在房内还是房外0在房内，1在房外,3 表示无用
    public int floorId = 0; // 楼层编号，默认0层
    public Integer toFloorId = 0;
    public ArrayList<Integer> room_id = new ArrayList<>(); // 所在房间的编号
    public ArrayList<Integer> gotList = new ArrayList<>(); // 已经走过的导航点
    public Integer navIndex = null; // 当前点在导航点列表中的索引，-2表示出口


    public Pos(double x,double y){
        this.x = x;
        this.y = y;
        this.state = 3;
        this.floorId = 0;
        this.room_id = new ArrayList<>();
        this.gotList = new ArrayList<>();
        this.navIndex = null;
    }

    public Pos(double x,double y,int state){
        this.x = x;
        this.y = y;
        this.state = state;
        this.floorId = 0;
        this.room_id = new ArrayList<>();
        this.gotList = new ArrayList<>();
    }
    public Pos(double x,double y, int state,  ArrayList<Integer> room_id){
        this.x = x;
        this.y = y;
        this.state = state;
        this.floorId = 0;
        this.room_id = room_id;
        this.gotList = new ArrayList<>();
    }

    public Pos(double x,double y,ArrayList<Integer> gotList){
        this.x = x;
        this.y = y;
        this.state = 3;
        this.floorId = 0;
        this.room_id = new ArrayList<>();
        this.gotList = gotList;
        this.navIndex = null;
    }


    public double getDistance(Pos B) {
        return Math.sqrt(Math.pow(x - B.x, 2) + Math.pow(y - B.y, 2));
    }


    public void transformScale(double scale) {
        this.x *= scale;
        this.y *= scale;
    }

    public boolean equals(Pos B) {
        return x == B.x && y == B.y;
    }
}
