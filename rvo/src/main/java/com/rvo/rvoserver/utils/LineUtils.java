package com.rvo.rvoserver.utils;

import com.rvo.rvoserver.pojo.Pos;
import java.awt.geom.Line2D;

public class LineUtils {

    public static boolean isIntersect(Pos a1, Pos a2, Pos b1, Pos b2) {
        Line2D line1 = new Line2D.Double(a1.getX(), a1.getY(), a2.getX(), a2.getY());
        Line2D line2 = new Line2D.Double(b1.getX(), b1.getY(), b2.getX(), b2.getY());
        return line1.intersectsLine(line2);
    }


}
