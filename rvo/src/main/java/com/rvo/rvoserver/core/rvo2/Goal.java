package com.rvo.rvoserver.core.rvo2;

import org.apache.commons.math3.geometry.euclidean.twod.Vector2D;

import java.awt.*;
import java.util.ArrayList;
import java.util.List;

public class Goal {
    public Vector2D globalGoal = Vector2D.ZERO;
    public List<Vector2D> subGoal = new ArrayList<Vector2D>();
    public List<Vector2D> movingStep = new ArrayList<Vector2D>();
    public Color color;
    public int flag = 0;
    public long reachGoalms = 0;
    public int source = -1;
    public int destination = -1;
    public int next = 0;

    public Goal(Vector2D globalGoal) {
        this.globalGoal = globalGoal;
    }

    public Goal() {
        // TODO Auto-generated constructor stub
    }

    public void add(Vector2D subGoal) {
        this.subGoal.add(subGoal);
    }

    public void addMovingStep(Vector2D step) {
        this.movingStep.add(step);
    }

    public void remove() {
        this.subGoal.remove(0);
    }

    public Vector2D getGlobalGoal() {
        return globalGoal;
    }

    public void setGlobalGoal(Vector2D globalGoal) {
        this.globalGoal = globalGoal;
    }

    public List<Vector2D> getSubGoal() {
        return subGoal;
    }

    public void setSubGoal(List<Vector2D> subGoal) {
        this.subGoal = subGoal;
    }

    public List<Vector2D> getMovingStep() {
        return movingStep;
    }

    public void setMovingStep(List<Vector2D> movingStep) {
        this.movingStep = movingStep;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }

    public int getFlag() {
        return flag;
    }

    public void setFlag(int flag) {
        this.flag = flag;
    }

    public long getReachGoalms() {
        return reachGoalms;
    }

    public void setReachGoalms(long reachGoalms) {
        this.reachGoalms = reachGoalms;
    }

    public int getSubGoalSize() {
        return subGoal.size();
    }

    public int getaddMovingStepSize() {
        return movingStep.size();
    }

    public int getSource() {
        return source;
    }

    public void setSource(int source) {
        this.source = source;
    }

    public int getDestination() {
        return destination;
    }

    public void setDestination(int destination) {
        this.destination = destination;
    }

    public int getNext() {
        return next;
    }

    public void setNext(int next) {
        this.next = next;
    }

    public Vector2D getCurrent() {
        return subGoal.get(next);
    }
}
