package com.rvo.rvoserver.pojo;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;

@Data
@NoArgsConstructor
public class Exit {

    private Long id;
    /** 原始集合点 id（如 楼层-编号-传送目标），供 AssemblyExitId 解析 */
    private String exitKey;
    private Pos lt;
    private Pos rd;
    private int numOfPerson;
    private String exitName;

    public Exit(Long id, Pos lt, Pos rd, int numOfPerson, String exitName) {
        this(id, null, lt, rd, numOfPerson, exitName);
    }

    public Exit(Long id, String exitKey, Pos lt, Pos rd, int numOfPerson, String exitName) {
        this.id = id;
        this.exitKey = exitKey;
        this.lt = lt;
        this.rd = rd;
        this.numOfPerson = numOfPerson;
        this.exitName = exitName;
    }
    public Pos getCenter() {
        ArrayList<Integer> room_id = new ArrayList<>();
        room_id.add(-2);
        int fid = lt != null ? lt.getFloorId() : 0;
        Pos p = new Pos((lt.getX() + rd.getX()) / 2, (lt.getY() + rd.getY()) / 2, 1, room_id);
        p.setFloorId(fid);
        return p;
    }

    public void transformScale(double scale) {
        lt.transformScale(scale);
        rd.transformScale(scale);
    }

    public boolean isIn(double x, double y) {
        return x >= lt.getX() && x <= rd.getX() && y >= lt.getY() && y <= rd.getY();
    }

    public double getArea() {
        return (rd.getX() - lt.getX()) * (rd.getY() - lt.getY());
    }
}
