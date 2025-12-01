package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Obstacle {

    int id;
    private Pos A;
    private Pos B;

    public void transformScale(double scale) {
        A.transformScale(scale);
        B.transformScale(scale);
    }

}
