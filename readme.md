# RVO_in_Building

面向建筑疏散场景的多层仿真系统，采用 **Java（业务服务）+ C++（高性能仿真核心）+ Web（3D 可视化）** 的组合架构。  
系统支持多楼层路径规划、跨层通行（楼梯/电梯语义）、回放与结果导出。

## 1. 项目概览

- `rvo/`：后端服务与原生仿真集成
  - `src/main/java`：Spring Boot 服务、业务编排、JNI 调用桥接
  - `native-simulator/`：JNI 接口层（C++）
  - `cpp-rvo-simulator/`：C++ 仿真核心（导航图、疏散步进、结果输出）
- `web-rvo/`：前端可视化（Vue + Three.js）
- `rvo.sql`：数据库脚本（如需初始化）

## 2. 核心能力

- 多楼层疏散仿真与跨层转移
- 连接器（楼梯/电梯）容量与服务时间约束
- 轨迹帧输出、进度输出与原始仿真快照输出
- 前端 3D 楼层过滤、遮挡灰化、人员动画回放
- Java 业务层与 C++ 引擎通过 JNI 进行内存级数据交互

## 3. 技术栈

- 后端：Java 17+、Spring Boot、Maven
- 原生：C++17、CMake、JNI、nlohmann/json
- 前端：Vue、Three.js、Node.js

## 4. 快速开始（Windows）

### 4.1 构建 C++ 仿真核心（可选单独调试）

```powershell
cd d:\GitHub\RVO_in_Building\rvo\cpp-rvo-simulator
mkdir build
cd build
cmake -S .. -B .
cmake --build . --config Release
```

### 4.2 构建 JNI 桥接库

```powershell
cd d:\GitHub\RVO_in_Building\rvo\native-simulator
mkdir build
cd build
cmake -S .. -B .
cmake --build . --config Release
```

> 说明：若 Java 运行时无法加载 `native_rvo_interface.dll`，请将 DLL 所在目录加入 `java.library.path`，或放到可被 JVM 找到的位置。

### 4.3 启动后端服务

```powershell
cd d:\GitHub\RVO_in_Building\rvo
mvn clean package -DskipTests
mvn spring-boot:run
```

### 4.4 启动前端

```powershell
cd d:\GitHub\RVO_in_Building\web-rvo
npm install
npm run serve
```

## 5. 关键输出文件

以一次仿真任务输出目录为准，常见文件如下：

- `result.rvo`：轨迹帧数据（文本）
- `simulation_raw.json`：仿真原始快照（配置、帧、完成事件）
- `progress.txt`：进度百分比（运行中更新）
- 兼容历史链路的衍生结果（由 Java 后处理流程生成）

## 6. 目录结构（简版）

```text
RVO_in_Building
├─ rvo
│  ├─ cpp-rvo-simulator
│  ├─ native-simulator
│  └─ src/main/java/com/rvo/rvoserver
├─ web-rvo
└─ rvo.sql
```

## 7. 架构数据流

1. Java 服务接收任务参数并组装输入对象  
2. 通过 JNI 将输入传入 C++ 仿真器  
3. C++ 执行路径与步进仿真，写出结果  
4. Java 侧进行兼容处理/结果编排  
5. 前端加载结果并进行三维回放展示

## 8. 已知说明

- 本仓库包含多个子模块，请按模块分别安装依赖。
- 不同机器的本地路径、JDK、CMake 版本可能影响 JNI 动态库加载。
- 若仅调试算法建议先独立验证 `cpp-rvo-simulator` 再联调 Java。

## 9. 后续建议（Roadmap）

- 完善统一配置（路径、端口、库加载）与一键启动脚本
- 增加端到端自动化测试（后端 + 原生 + 前端）
- 增强结果指标体系（拥堵热区、出口负载、耗时统计）

## 10. 许可证与致谢

请根据项目实际情况补充 License、第三方依赖声明与团队信息。