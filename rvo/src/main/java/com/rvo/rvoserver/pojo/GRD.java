package com.rvo.rvoserver.pojo;

import lombok.Data;

import java.io.*;
import java.util.*;

@Data
public class GRD {

    private int x;
    private int y;
    private double x_min;
    private double x_max;
    private double y_min;
    private double y_max;
    private double z_min;
    private double z_max;
    private double[][] value;
    private double width;
    private double height;
    private double x0;
    private double y0;
    private double x1;
    private double y1;
    private int weight;
    private double k;

    public GRD(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public GRD(int width, int height,int weight ,double k) {
        this.width = width;
        this.height = height;
        this.weight = weight/1000;
        this.k = k;
    }

    public void setScope(double x0, double y0, double x1, double y1) {
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.width = x1 - x0;
        this.height = y1 - y0;
    }

    public GRD() {}

    public boolean initFromFile(String path) {
        File grdFile = new File(path);
        double max_10 = 0;
        int i2=0,j2=0;
        try {
            BufferedReader grdReader = new BufferedReader(new FileReader(grdFile));
            String line;
            //读入无用行
            grdReader.readLine();
            //读入尺寸
            line = grdReader.readLine();
            Scanner scanner = new Scanner(line);
            this.x = scanner.nextInt();
            this.y = scanner.nextInt();

            //读入最大最小值
            line = grdReader.readLine();
            scanner = new Scanner(line);
            this.x_min = scanner.nextDouble();
            this.x_max = scanner.nextDouble();
            line = grdReader.readLine();
            scanner = new Scanner(line);
            this.y_min = scanner.nextDouble();
            this.y_max = scanner.nextDouble();
            line = grdReader.readLine();
            scanner = new Scanner(line);
            this.z_min = scanner.nextDouble();
            this.z_max = scanner.nextDouble();
            if(this.z_min > this.z_max){
                double temp = this.z_min;
                this.z_min = this.z_max;
                this.z_max = temp;
            }

            //初始化value
            value = new double[this.x][this.y];
            for(int i = 0; i < this.y; i++) {
                line = grdReader.readLine();
                scanner = new Scanner(line);
                for(int j = 0; j < this.x; j++) {
                    this.value[j][i] = scanner.nextDouble();
                    if (max_10 < this.value[j][i]){
                        max_10 = this.value[j][i];
                        i2=i;
                        j2=j;
                    }
                }
            }
        } catch (IOException | InputMismatchException e) {
            e.printStackTrace();
            return false;
        }
//        //将value打印出来
//        for(int i = 0; i < this.y; i++) {
//            for(int j = 0; j < this.x; j++) {
//                System.out.print(this.value[j][i] + " ");
//            }
//            System.out.println();
//        }
//        System.out.println(max_10 + " " + i2 + " " + j2);
        return true;
    }

    // 输入模型，k=1表示模拟0-10，k=2表示模拟0-20，k=3表示模拟0-30，k=4表示模拟0-40
    public boolean initFromFile(int k,String file_path) {
        //初始化value
        for(int i = 1; i <= k; i++){
            String path = "";
            path = file_path + "/GRD_Data/Effective_0" + i +"-00.GRD";
            File grdFile = new File(path);
            try {
                BufferedReader grdReader = new BufferedReader(new FileReader(grdFile));
                String line;
                //读入无用行
                grdReader.readLine();
                //读入尺寸
                line = grdReader.readLine();
                Scanner scanner = new Scanner(line);
                this.x = scanner.nextInt();
                this.y = scanner.nextInt();

                //读入最大最小值
                line = grdReader.readLine();
                scanner = new Scanner(line);
                this.x_min = scanner.nextDouble();
                this.x_max = scanner.nextDouble();
                line = grdReader.readLine();
                scanner = new Scanner(line);
                this.y_min = scanner.nextDouble();
                this.y_max = scanner.nextDouble();
                line = grdReader.readLine();
                scanner = new Scanner(line);
                this.z_min = scanner.nextDouble();
                this.z_max = scanner.nextDouble();
                if(this.z_min > this.z_max){
                    double temp = this.z_min;
                    this.z_min = this.z_max;
                    this.z_max = temp;
                }
                if (this.value == null){
                    this.value = new double[this.x][this.y];
                }

                for(int k1 = 0; k1 < this.y; k1++) {
                    line = grdReader.readLine();
                    scanner = new Scanner(line);
                    for(int j = 0; j < this.x; j++) {
                        this.value[j][k1] += scanner.nextDouble();
                    }
                }
            } catch (IOException | InputMismatchException e) {
                e.printStackTrace();
                return false;
            }

        }
        for(int k1 = 0; k1 < this.y; k1++) {
            for(int j = 0; j < this.x; j++) {
                this.value[j][k1] = this.value[j][k1]/(3*k);
            }
        }


        return true;
    }

    public double calculate(List<Pos> agents, List<Double> person_grd) {
        if (value == null || x <= 0 || y <= 0) {
            if (person_grd != null) {
                for (int i = 0; i < agents.size(); i++) {
                    if (person_grd.size() <= i) person_grd.add(0.0); else person_grd.set(i, person_grd.get(i));
                }
            }
            return 0;
        }
        double res = 0;
        int i = 0;
        for(Pos agent : agents) {
            if(agent.x < x0 || agent.x > x1 || agent.y < y0 || agent.y > y1) {
                if (person_grd != null) {
                    if (person_grd.size() <= i) person_grd.add(0.0); else person_grd.set(i, person_grd.get(i));
                }
                i++;
                continue;
            }
            double v = value[(int) ((agent.x - x0) / (width / x))][(int) ((agent.y - y0) / (height / y))]/(3600*300*10);
            res += v;
            if (person_grd != null) {
                if (person_grd.size() <= i) person_grd.add(v); else person_grd.set(i, person_grd.get(i) + v);
            }
            i++;
        }
        return res;
    }

    public double calculate(List<Pos> agents) {
        if (value == null || x <= 0 || y <= 0) return 0;
        double res = 0;
        for(Pos agent : agents) {
            if(agent.x < x0 || agent.x > x1 || agent.y < y0 || agent.y > y1) {
                continue;
            }
            res += value[(int) ((agent.x - x0) / (width / x))][(int) ((agent.y - y0) / (height / y))];
        }
        return res;
    }

    public double calculate(Pos agent) {
        if (value == null || x <= 0 || y <= 0) return 0;
        if(agent.x < x0 || agent.x > x1 || agent.y < y0 || agent.y > y1) {
            return  0;
        }
        return value[(int) ((agent.x - x0) / (width / x))][(int) ((agent.y - y0) / (height / y))];
    }


    // 积分计算x,y连线的GRD剂量值
    public double calculateLine(Pos one, Pos two) {
        double res = 0;
        int t_x0 = (int) Math.round(Math.min(one.x, two.x));
        int t_y0 = (int) Math.round(Math.min(one.y, two.y));
        int t_x1 = (int) Math.round(Math.max(one.x, two.x));
        int t_y1 = (int) Math.round(Math.max(one.y, two.y));
        double q = (double)(t_y1-t_y0)/(double)(t_x1-t_x0);
        double add_x = Math.sqrt((1/(1+Math.pow(q,2))));
        double add_y = q*add_x;
        List<Pos> agents = new ArrayList<>();
        for (int l = 0; l <= Math.floor(Math.sqrt(Math.pow(t_x1-t_x0,2)) + Math.pow(t_y1-t_y0,2)); l++){
            agents.add(new Pos(t_x0 + l*add_x,t_y0 + l*add_y));
        }
        return (k)*weight*calculate(agents)/1000 + (1-k) * one.getDistance(two)/1000;
    }

}
