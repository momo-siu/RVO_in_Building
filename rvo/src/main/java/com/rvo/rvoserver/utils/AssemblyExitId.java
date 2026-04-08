package com.rvo.rvoserver.utils;

/**
 * 集合点 id 格式：楼层-编号-传送目标（与前端 parseExitId 一致）。
 * 第三段非空表示该集合点可作为向 F1 方向相邻层的传送节点；落点为相邻层相同编号集合点。
 */
public final class AssemblyExitId {

    public final int floorInKey;
    public final int assemblyNum;
    public final String teleportTarget;

    private AssemblyExitId(int floorInKey, int assemblyNum, String teleportTarget) {
        this.floorInKey = floorInKey;
        this.assemblyNum = assemblyNum;
        this.teleportTarget = teleportTarget != null ? teleportTarget : "";
    }

    /**
     * @param raw 来自蓝图 exit.id 或 exitKey；可为 null、纯数字或 "楼层-编号-传送目标"
     */
    public static AssemblyExitId parse(Object raw) {
        if (raw == null) {
            return new AssemblyExitId(0, 0, "");
        }
        String s = raw.toString().trim();
        if (s.isEmpty()) {
            return new AssemblyExitId(0, 0, "");
        }
        String[] parts = s.split("-");
        if (parts.length < 2) {
            try {
                int n = Integer.parseInt(s);
                return new AssemblyExitId(0, n, "");
            } catch (NumberFormatException e) {
                return new AssemblyExitId(0, 0, "");
            }
        }
        int f = parseIntSafe(parts[0], 0);
        int num = parseIntSafe(parts[1], 1);
        String target = parts.length >= 3 ? parts[2] : "";
        return new AssemblyExitId(f, num, target);
    }

    private static int parseIntSafe(String s, int def) {
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    /**
     * 判断集合点是否可以作为导航图中的节点/中继点。
     * 所有合法集合点都可以参与构图，不再因为缺少传送目标而整体禁用。
     */
    public static boolean isUsableAsGraphNode(int exitFloorId, AssemblyExitId parsed) {
        return parsed != null;
    }

    /**
     * 判断集合点是否可以作为疏散的最终终点。
     * 当前仅允许 F1（floorId == 0）的集合点作为终点。
     */
    public static boolean isUsableAsFinalDestination(int exitFloorId, AssemblyExitId parsed) {
        return exitFloorId == 0;
    }

    /** 向 F1 方向的相邻楼层：地上向下，地下向上 */
    public static int nextFloorTowardF1(int floorId) {
        if (floorId > 0) {
            return floorId - 1;
        }
        if (floorId < 0) {
            return floorId + 1;
        }
        return 0;
    }
}
