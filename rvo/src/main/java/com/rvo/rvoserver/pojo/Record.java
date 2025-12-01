package com.rvo.rvoserver.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Record {

    private int blueprintID;
    private int recordID;
    private int numberOfPeople;
    private String blueprintJson;
    private boolean hasReplay;
    private String replay;
    private LocalDateTime cTime;

}
