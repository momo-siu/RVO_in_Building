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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@ServerEndpoint("/webSocketServer/{bID}/{status}/{file}")
public class ReplayServer {

    private List<String> replay;

    private Map<Integer, String> replayStr;

//    @Autowired
//    EvaluateServer evaluateServer;

    // 这里使用静态，让 service 属于类
    private static EvaluateServer evaluateServer;

    // 注入的时候，给类的 service 注入
    @Autowired public void setEvaluateServer(EvaluateServer evaluateServer) {
        ReplayServer.evaluateServer = evaluateServer;
    }


    private Map<String, Object> replayData; //分片信息

    private static String projectPath; //项目地址

    @Value("${path.projectPath}") public void setProjectPath(String projectPath) {
        ReplayServer.projectPath = projectPath;
    }

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
        ReplayServer.blueprintMapper = blueprintMapper;
    }

    /**
     * 与客户端的连接会话，需要通过他来给客户端发消息
     */
    private Session session;

    /**
     * 当前用户ID
     */
    private String bID;

    private int status; // 播放选项

    private String fileName; // 播放文件

    private boolean[] sample = null;

    private final int sample_max = 3000;

    /**
     *  concurrent包的线程安全Set，用来存放每个客户端对应的MyWebSocket对象。
     *  虽然@Component默认是单例模式的，但springboot还是会为每个websocket连接初始化一个bean，所以可以用一个静态set保存起来。
     */
    private static CopyOnWriteArraySet<ReplayServer> webSockets =new CopyOnWriteArraySet<>();

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

        for(boolean b : sample) {
            System.out.print(b?1:0);
        }

        return result;
    }

    /**
     * 连接成功方法
     * @param session 连接会话
     * @param bID 用户编号
     */
    @OnOpen
    public void onOpen(Session session , @PathParam("bID") String bID, @PathParam("status") int status, @PathParam("file") String fileName){
        try {
            this.session = session;
            this.bID = bID;
            this.status = status;
            this.fileName = fileName;
            webSockets.add(this);
            for(String id : sessionPool.keySet()) {
                sessionPool.get(id).close();
            }
            sessionPool.clear();
            sessionPool.put(bID, session);
//            log.info("【websocket消息】 用户：" + bID + " 加入连接...");

            //获取片信息
            replayData = evaluateServer.getReplayData(Integer.parseInt(bID),status,fileName);

            //读入回放文件数据
            //检查文件状态
            Path replayPath = resolveSourcePath(bID, fileName, "result-json.rvo");
            File file = replayPath.toFile();
            if(!file.exists()) {
//                log.info("文件不存在:" + replayPath);
                return;
            }

            //读取文件
//        List<List<Map<String, Object>>> res = new ArrayList<>();
//            log.info("开始读取文件");
            BufferedReader br = new BufferedReader(new FileReader(file));
            String line = br.readLine();
            replay = new ArrayList<>();
//            while((line = br.readLine()) != null) {
//                Scanner scanner = new Scanner(line);
//                int index = scanner.nextInt();
//                int len = scanner.nextInt();
//                if(sample == null) {
//                    generateSample(len);
//                }
//                List<Map<String, Object>> data = new ArrayList<>();
//                while(scanner.hasNext()) {
//                    int id = scanner.nextInt();
//                    double x = scanner.nextDouble();
//                    double y = scanner.nextDouble();
//                    if(sample[id]) {
//                        Map<String, Object> m = new HashMap<>();
//                        m.put("id", id);
//                        m.put("x", x);
//                        m.put("y", y);
//                        data.add(m);
//                    }
//                }
////                if(data.size() == 0) { break; }
//                replay.add(JSONObject.toJSONString(data));
//                System.out.print("1");
//            }
            for(int i = 1; i < line.length() - 1; i++) {
                if(line.charAt(i) == '[') {
                    StringBuilder sb = new StringBuilder();
                    while(line.charAt(i) != ']') {
                        sb.append(line.charAt(i));
                        i++;
                    }
                    sb.append(']');
                    replay.add(sb.toString());
                }
//                System.out.print(1);
            }
//            System.out.println();
            br.close();
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
    public void onMessage(@PathParam("bID") String userId, @RequestBody String body){
        try {
//            System.out.println(body);
            //将Body解析
            JSONObject jsonObject = JSONObject.parseObject(body);
            int flat = Integer.parseInt(jsonObject.getString("flat"));

            ReplayFlat replayFlat = ((List<ReplayFlat>) replayData.get("flat")).get(flat - 1);
            List<String> res = new ArrayList<>();
            StringBuilder sb = new StringBuilder();
            sb.append("[");
//            System.out.println(replayFlat.getStartTime());
//            System.out.println(replayFlat.getDuration());
            for(int i = replayFlat.getStartTime() - 1; i < replayFlat.getStartTime() + replayFlat.getDuration() - 1 && i < replay.size(); i++) {
                if(i != replayFlat.getStartTime() - 1) {
                    sb.append(',');
                }
//                res.add(replay.get(i));
                sb.append(replay.get(i));
            }
            sb.append(']');
//            String jsonString = JSONObject.toJSONString(res);
            session.getAsyncRemote().sendText(sb.toString());
        } catch (Exception e) {
//            log.error("---------------WebSocket消息异常---------------");
            e.printStackTrace();
        }
    }
}

