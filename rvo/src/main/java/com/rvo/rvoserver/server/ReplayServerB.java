package com.rvo.rvoserver.server;

import com.alibaba.fastjson.JSONObject;
import com.rvo.rvoserver.Mapper.BlueprintMapper;
import com.rvo.rvoserver.pojo.ReplayFlat;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestBody;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
@ServerEndpoint("/webSocketServer1/{bID}")
public class ReplayServerB {

    private List<String> replay;

    private Map<Integer, String> replayStr;

//    @Autowired
//    EvaluateServer evaluateServer;

    // 这里使用静态，让 service 属于类
    private static EvaluateServer evaluateServer;

    // 注入的时候，给类的 service 注入
    @Autowired public void setEvaluateServer(EvaluateServer evaluateServer) {
        ReplayServerB.evaluateServer = evaluateServer;
    }


    private Map<String, Object> replayData; //分片信息
    @Value("${path.projectPath}")
    private String projectPath; //项目地址

    private Path resolveSourcePath(String bID, String... children) {
        String[] segments = new String[children.length + 3];
        segments[0] = "rvo";
        segments[1] = "source";
        segments[2] = bID;
        if (children.length > 0) {
            System.arraycopy(children, 0, segments, 3, children.length);
        }
        return Paths.get(projectPath, segments);
    }

    private static BlueprintMapper blueprintMapper;

    @Autowired public void setBlueprintMapper(BlueprintMapper blueprintMapper) {
        ReplayServerB.blueprintMapper = blueprintMapper;
    }

    /**
     * 与客户端的连接会话，需要通过他来给客户端发消息
     */
    private Session session;

    /**
     * 当前用户ID
     */
    private String bID;

    private boolean[] sample = null;

    private final int sample_max = 1000;

    /**
     *  concurrent包的线程安全Set，用来存放每个客户端对应的MyWebSocket对象。
     *  虽然@Component默认是单例模式的，但springboot还是会为每个websocket连接初始化一个bean，所以可以用一个静态set保存起来。
     */
    private static CopyOnWriteArraySet<ReplayServerB> webSockets =new CopyOnWriteArraySet<>();

    /**
     *用来存在线连接用户信息
     */
    private static ConcurrentHashMap<String,Session> sessionPool = new ConcurrentHashMap<String,Session>();

    public int[] generateSample(int m) {
        if (sample_max >= m) {
            sample = new boolean[m];
            Arrays.fill(sample, true);
            return new int[1];
        }

        ArrayList<Integer> numbers = new ArrayList<>();
        Random random = new Random();
        random.setSeed(43);

        for (int i = 0; i < m; i++) {
            numbers.add(i);
        }

        int[] result = new int[sample_max];
        for (int i = 0; i < sample_max; i++) {
            int randomIndex = random.nextInt(numbers.size());
            result[i] = numbers.get(randomIndex);
            numbers.remove(randomIndex);
        }

        sample = new boolean[m];
        Arrays.fill(sample, false);
        for(int i : result) {
            sample[i] = true;
        }

//        for(boolean b : sample) {
//            System.out.print(b?1:0);
//        }

        return result;
    }

    /**
     * 连接成功方法
     * @param session 连接会话
     * @param bID 用户编号
     */
    @OnOpen
    public void onOpen(Session session , @PathParam("bID") String bID, @PathParam("status") int status, @PathParam("file") String fileName ){
        try {
            this.session = session;
            this.bID = bID;
            webSockets.add(this);
            sessionPool.put(bID, session);
//            log.info("【websocket消息】 用户：" + bID + " 加入连接...");

            //记录最后一个人
            int lastPeople = blueprintMapper.getLastPeople(Integer.parseInt(bID));
            sample[lastPeople] = true;

            //获取片信息
            replayData = evaluateServer.getReplayData(Integer.parseInt(bID),status,fileName);

            //读入回放文件数据
            //检查文件状态
            Path replayPath = resolveSourcePath(bID, fileName, "result.rvo");
            File file = replayPath.toFile();
            if(!file.exists()) {
//                log.info("文件不存在:" + replayPath);
                session.close();
                return;
            }

//            log.info("读取成功");

        } catch (Exception e) {
//            log.error("---------------WebSocket连接异常---------------");
            e.printStackTrace();
        }
    }

    /**
     * 关闭连接
     */
    @OnClose
    public void onClose(){
        try {
            webSockets.remove(this);
            sessionPool.remove(this.bID);
//            log.info("【websocket消息】 用户："+ this.bID + " 断开连接...");
            replay.clear();
        } catch (Exception e) {
//            log.error("---------------WebSocket断开异常---------------");
        }
    }

    @OnMessage
    public void onMessage(@PathParam("bID") String bID, @RequestBody String body, @PathParam("file") String fileName){
        try {
//            System.out.println(body);
            //将Body解析
            JSONObject jsonObject = JSONObject.parseObject(body);
            int flat = Integer.parseInt(jsonObject.getString("flat"));

            ReplayFlat replayFlat = ((List<ReplayFlat>) replayData.get("flat")).get(flat - 1);
            //读取文件
            List<List<Map<String, Object>>> res = new ArrayList<>();
            BufferedReader br = new BufferedReader(new FileReader(resolveSourcePath(bID, fileName, "result.rvo").toFile()));
            String line;
            //跳转指定行
            int cnt = 1;
            while(cnt < replayFlat.getStartTime() && br.readLine() != null) { cnt++; }

            //读取指定行数数据
            cnt = 0;
            while(cnt < replayFlat.getDuration() && (line = br.readLine()) != null) {
                Scanner scanner = new Scanner(line);
                int index = scanner.nextInt();
                int len = scanner.nextInt();
                if(sample == null) {
                    generateSample(len);
                }
                List<Map<String, Object>> data = new ArrayList<>();
                while(scanner.hasNext()) {
                    int id = scanner.nextInt();
                    double x = scanner.nextDouble();
                    double y = scanner.nextDouble();
                    if(sample[id]) {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", id);
                        m.put("x", x);
                        m.put("y", y);
                        data.add(m);
                    }
                }
                if(data.size() == 0) { break; }
                res.add(data);
                cnt++;
            }
            String jsonString = JSONObject.toJSONString(res);
            session.getAsyncRemote().sendText(jsonString);
        } catch (Exception e) {
//            log.error("---------------WebSocket消息异常---------------");
            e.printStackTrace();
        }
    }


    /**
     * 此为广播消息
     * @param message
     */
    public void sendAllMessage(String message) {
//        log.info("【websocket消息】广播消息:"+message);
        for(ReplayServerB webSocket : webSockets) {
            try {
                if(webSocket.session.isOpen()) {
                    webSocket.session.getAsyncRemote().sendText(message);
                }
            } catch (Exception e) {
//                log.error("---------------WebSocket消息广播异常---------------");
            }
        }
    }

    /**
     * 单点消息
     * @param userId
     * @param message
     */
    public void sendOneMessage(String userId, String message) {
        Session session = sessionPool.get(userId);
        if (session != null&&session.isOpen()) {
            try {
//                log.info("【websocket消息】 单点消息:"+message);
                session.getAsyncRemote().sendText(message);
            } catch (Exception e) {
//                log.error("---------------WebSocket单点消息发送异常---------------");
            }
        }
    }

    /**
     * 发送多人单点消息
     * @param userIds
     * @param message
     */
    public void sendMoreMessage(String[] userIds, String message) {
        for(String userId:userIds) {
            Session session = sessionPool.get(userId);
            if (session != null&&session.isOpen()) {
                try {
//                    log.info("【websocket消息】 单点消息:"+message);
                    session.getAsyncRemote().sendText(message);
                } catch (Exception e) {
//                    log.error("---------------WebSocket多人单点消息发送异常---------------");
                }
            }
        }
    }
}

