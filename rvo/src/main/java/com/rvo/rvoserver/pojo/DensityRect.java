package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DensityRect {

    private Long id;
    private Pos lt;
    private Pos rd;
    private double begin;
    private double end;

    public void setX0(double x0) {
        lt.setX(x0);
    }

    public void setY0(double y0) {
        lt.setY(y0);
    }

    public void setX1(double x1) {
        rd.setX(x1);
    }

    public void setY1(double y1) {
        rd.setY(y1);
    }

    public Pos getCenter() {
        return new Pos((lt.getX() + rd.getX()) / 2, (lt.getY() + rd.getY()) / 2);
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

    public double getX0() {
        return lt.getX();
    }

    public double getY0() {
        return lt.getY();
    }

    public double getX1() {
        return rd.getX();
    }

    public double getY1() {
        return rd.getY();
    }
}
