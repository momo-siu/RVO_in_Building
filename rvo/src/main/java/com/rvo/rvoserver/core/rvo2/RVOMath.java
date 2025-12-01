package com.rvo.rvoserver.core.rvo2;

import org.apache.commons.math3.geometry.euclidean.twod.Vector2D;

public class RVOMath {
    /**
     * A sufficiently small positive number.
     */
    static final double EPSILON = 0.00001;

    /**
     * Computes the determinant of a two-dimensional square matrix with rows
     * consisting of the specified two-dimensional vectors.
     *
     * @param vector1 The top row of the two-dimensional square matrix.
     * @param vector2 The bottom row of the two-dimensional square matrix.
     * @return The determinant of the two-dimensional square matrix.
     */
    static double det(Vector2D vector1, Vector2D vector2) {
        return vector1.getX() * vector2.getY() - vector1.getY() * vector2.getX();
    }

    /**
     * Computes the signed distance from a line connecting the specified points
     * to a specified point.
     *
     * @param point1 The first point on the line.
     * @param point2 The second point on the line.
     * @param point3 The point to which the signed distance is to be calculated.
     * @return Positive when the point3 lies to the left of the line passing
     * through point1 and point2.
     */
    static double leftOf(Vector2D point1, Vector2D point2, Vector2D point3) {
        return det(point1.subtract(point3), point2.subtract(point1));
    }
}
