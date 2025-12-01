package com.rvo.rvoserver.core.rvo2;

import org.apache.commons.math3.geometry.euclidean.twod.Vector2D;

public class Line {
    /**
     * The direction of this directed line.
     */
    public Vector2D direction = Vector2D.ZERO;

    /**
     * A point on this directed line.
     */
    public Vector2D point = Vector2D.ZERO;

    /**
     * Constructs and initializes a directed line.
     */
    public Line() {
    }

    /**
     * Constructs and initializes a directed line with the specified point and
     * direction.
     *
     * @param point     A point on the directed line.
     * @param direction The direction of the directed line.
     */
    public Line(Vector2D point, Vector2D direction) {
        this.direction = direction;
        this.point = point;
    }
}
