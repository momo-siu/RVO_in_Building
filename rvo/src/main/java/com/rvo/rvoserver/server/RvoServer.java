package com.rvo.rvoserver.server;

import com.rvo.rvoserver.pojo.*;
import org.springframework.scheduling.annotation.Async;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public interface RvoServer {

//    public List<List<Map<String, Integer>>> calculatePathWithNav(int bID, List<Agent> agents, List<Obstacle> obstacles, List<Exit> exits, List<Pos> navPoints);

    public boolean isOK();

    public void calculatePathWithNav(int bID, List<Agent> agents, List<Obstacle> obstacles, List<Exit> exits, List<Pos> navPoints, double scale, List<HashMap> rooms,List<HashMap> peosList, List<HashMap> connectors, int status ,int weight, double k, String file,NavGrid navGrid, List<Exit> exitsAll,double imgX0,double imgY0, double sT) throws IOException;

    public int getCnt();



}
