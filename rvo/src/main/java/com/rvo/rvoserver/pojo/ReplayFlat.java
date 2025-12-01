package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReplayFlat implements Serializable {

    private int index;
    private int startTime;
    private int duration;
    private int size;

}
