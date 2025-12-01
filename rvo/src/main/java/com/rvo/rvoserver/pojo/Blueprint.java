package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Blueprint {

    private int blueprintID;
    private int width;
    private int height;
    private String background;
    private LocalDateTime cTime;
    private String bName;
    private String blueprintJson;
    private String replay;
    private boolean hasReplay;
    private LocalDateTime updateTime;
    private int numOfPeople;
    private int duration;
    private String description;
    private String addr;
    private int state;
    private double x0;
    private double y0;
    private double x1;
    private double y1;
    private int schedule;
    private int lastPeople;

}
