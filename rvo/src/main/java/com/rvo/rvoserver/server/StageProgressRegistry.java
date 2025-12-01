package com.rvo.rvoserver.server;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StageProgressRegistry {

    private final Map<Integer, String> stageMap = new ConcurrentHashMap<>();

    public void updateStage(int bID, String stageKey) {
        if (stageKey == null) {
            return;
        }
        stageMap.put(bID, stageKey.toLowerCase());
    }

    public void clearStage(int bID) {
        stageMap.remove(bID);
    }

    public Optional<String> getStageKeyword(int bID) {
        return Optional.ofNullable(stageMap.get(bID));
    }

    public String resolveStageMessage(int bID, int rawSchedule) {
        String message = getStageKeyword(bID)
                .map(this::translateStageKeyword)
                .orElse(null);
        if (message != null) {
            return message;
        }
        return translateScheduleToMessage(rawSchedule);
    }

    private String translateStageKeyword(String stage) {
        return switch (stage) {
            case "loading" -> "读入数据中...";
            case "running" -> "计算方案中...";
            case "saving" -> "结果保存中...";
            case "done" -> "演算完成";
            default -> null;
        };
    }

    private String translateScheduleToMessage(int rawSchedule) {
        int percent = rawSchedule >= 0 ? rawSchedule / 6 : 0;
        percent = Math.max(0, Math.min(100, percent));
        if (percent == 99) {
            return "采样中...";
        }
        if (percent >= 100 || rawSchedule >= 600) {
            return "演算完成";
        }
        if (percent >= 90 || rawSchedule >= 540) {
            return "结果保存完成...";
        }
        if (percent >= 60 || rawSchedule >= 360) {
            return "结果保存中...";
        }
        if (percent >= 30 || rawSchedule >= 180) {
            return "计算方案中...";
        }
        if (percent >= 5 || rawSchedule >= 30) {
            return "读入数据中...";
        }
        return "准备演算中...";
    }
}
