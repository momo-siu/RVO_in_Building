package com.rvo.rvoserver.pojo;

import java.awt.desktop.SystemSleepEvent;

/**
 * The purpose of the method:
 * 这是一个测试类，于程序无用
 */
public class Test {
    public static void main(String[] args) {
        GRD grd = new GRD();
        boolean isok = grd.initFromFile("D:\\nuclear\\rvo\\source\\48\\GRD_Data\\Total_dose_result_5m_12时间步.GRD");
        System.out.println(isok);
        return;
    }
}
