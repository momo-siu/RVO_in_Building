package com.rvo.rvoserver.server;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public interface BlueprintServer {

    int createBlueprint(String name, String description, String background, int height, int width, String addr);

    List<Map<String, Object>> listBlueprint();

    int setBg(int bID, String s);

    Map<String, Object> getBlueprint(int bID);

    int saveBlueprint(int bID, String json);

    boolean hasReplay(int bID);

    void getReplay(int bID);

    void setSize(int bID, int width, int height);

    Map<String, Object> getSize(int bID);

    String getBackground(int bID);

    void saveBlueprintToFile(int bID, String json) throws IOException;

    void saveBackground(int id, String backgroundPath);

    Map<String, Object> getInfo(int bID);

    void updateBlueprint(int id, String name, String description, String addr);

    boolean deleteBlueprint(int bID);

    void saveScope(int bID, double imgX0, double imgY0, double imgX1, double imgY1);

    Map<String, Object> exit(int bID);

    Map<String, Object> exitData(int bID);

    Map<String, Object> projects();

    int copy(int bID);
}
