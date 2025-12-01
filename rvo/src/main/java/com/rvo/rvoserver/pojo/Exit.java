package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Exit {

    private Long id;
    private Pos lt;
    private Pos rd;
    private int numOfPerson;
    private String exitName;
    public Pos getCenter() {
        ArrayList<Integer> room_id = new ArrayList<>();
        room_id.add(-2);
        return new Pos((lt.getX() + rd.getX()) / 2, (lt.getY() + rd.getY()) / 2,1, room_id);
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
