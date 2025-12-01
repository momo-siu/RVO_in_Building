package com.rvo.rvoserver.Mapper;

import com.rvo.rvoserver.pojo.Blueprint;

import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface BlueprintMapper {

    @Options(keyProperty = "blueprintID", useGeneratedKeys = true)
    @Insert("insert into blueprint(bName, background, height, width, description, addr) values(#{bName}, #{background}, #{height}, #{width}, #{description}, #{addr})")
    void createBlueprint(Blueprint blueprint);

    @Select("select * from blueprint")
    List<Blueprint> listBlueprint();

    @Update("update blueprint set background=#{s} where blueprintID=#{bID}")
    void setBg(int bID, String s);

    @Select("select * from blueprint where blueprintID=#{bID}")
    Blueprint getBlueprint(int bID);

//    @Select("select * from record where blueprintID=#{bID} order by cTime desc")
//    List<Record> getRecords(int bID);
//
//    @Insert("insert into record(blueprintID, blueprintJson) values(#{bID}, #{json})")
//    void saveBlueprint(int bID, String json);

    @Update("update blueprint set blueprintJson=#{json} where blueprintID=#{bID}")
    void saveRecord(int bID, String json);

//    @Update("update record set hasReplay=true, replay=#{replay} where blueprintID=#{bID}")
//    void updateRecord(int bID, String replay);

    @Update("update blueprint set width=#{width}, height=#{height} where blueprintID=#{bID}")
    void setSize(int bID, int width, int height);

    @Update("update blueprint set updateTime=current_timestamp where blueprintID=#{bID}")
    void updateTime(int bID);
    
    @Update("update blueprint set state=1 where blueprintID=#{bID}")
    void start(int bID);

    @Update("update blueprint set state=0 where blueprintID=#{bID}")
    void stop(int bID);

    @Update("update blueprint set state=2, hasReplay=true where blueprintID=#{bID}")
    void finish(int bID);

    @Update("update blueprint set schedule=#{schedule} where blueprintID=#{bID}")
    void setSchedule(int bID, int schedule);

    @Select("select state from blueprint where blueprintID=#{bID}")
    int getState(int bID);

    @Select("select schedule from blueprint where blueprintID=#{bID}")
    int getSchedule(int bID);

    @Update("update blueprint set duration=#{cnt} where blueprintID=#{bID}")
    void setDuration(int bID, int cnt);

    @Select("select duration from blueprint where blueprintID=#{bID}")
    int getDuration(int bID);

    @Update("update blueprint set numOfExits=#{size} where blueprintID=#{bID}")
    void setExitNum(int bID, int size);

    @Select("select numOfExits from blueprint where blueprintID=#{bID}")
    int getNumOfExits(int bID);

    @Update("update blueprint set background=#{backgroundPath} where blueprintID=#{id}")
    void saveBackground(int id, String backgroundPath);

    @Update("update blueprint set lastPeople=#{lastPeople} where blueprintID=#{bID}")
    void setLastPeople(int bID, int lastPeople);

    @Select("select lastPeople from blueprint where blueprintID=#{bID}")
    int getLastPeople(int bID);

    @Update("update blueprint set bName=#{name}, description=#{description}, addr=#{addr} where blueprintID=#{id}")
    void updateBlueprint(int id, String name, String description, String addr);

    @Delete("delete from blueprint where blueprintID=#{bID}")
    void deleteBlueprint(int bID);

    @Update("update blueprint set x0=#{imgX0}, y0=#{imgY0}, x1=#{imgX1}, y1=#{imgY1} where blueprintID=#{bID}")
    void saveScope(int bID, double imgX0, double imgY0, double imgX1, double imgY1);

    @Select("select * from blueprint where bName=#{name}")
    Blueprint getBlueprintByName(String name);

    @Select("select hasReplay from blueprint where blueprintID=#{bID}")
    boolean hasReplays(int bID);
}
