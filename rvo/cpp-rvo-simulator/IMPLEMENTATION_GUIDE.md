# C++ RVO模拟器实现指南

## 概述

这个C++程序用于替换Java后端的RVO计算部分。由于涉及复杂的库集成和Java序列化格式兼容，本指南提供了详细的实现步骤。

## 步骤1: 安装依赖

### RVO2库

1. 下载RVO2库：
```bash
cd rvo/cpp-rvo-simulator
git submodule add https://github.com/snape/RVO2.git RVO2
```

或者手动下载并解压到 `cpp-rvo-simulator/RVO2` 目录。

2. 修改CMakeLists.txt以包含RVO2：
```cmake
add_subdirectory(RVO2)
target_link_libraries(rvo_simulator RVO2)
```

### JSON库

推荐使用nlohmann/json（header-only）：

```bash
cd rvo/cpp-rvo-simulator/third_party
wget https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
```

## 步骤2: 实现JSON解析

需要解析的JSON格式应与Java后端发送的数据格式一致，包括：
- agents: 人员列表
- obstacles: 障碍物列表  
- exits: 出口列表
- navPoints: 导航点列表
- 配置参数（scale, status, weight, k等）

## 步骤3: 实现RVO模拟循环

参考Java版本的`RvoServerC.calculatePathWithNav`方法：
1. 初始化RVO2模拟器
2. 添加障碍物
3. 循环模拟：
   - 从等待列表添加agent
   - 设置首选速度
   - 执行一步模拟
   - 记录结果
   - 更新进度

## 步骤4: 实现文件输出

### result.rvo格式
文本格式，每行：
```
<frame_index> <agent_count> <id1> <x1> <y1> <id2> <x2> <y2> ...
```

### Java ObjectOutputStream格式

对于`replayData.txt`, `heatMap.rvo`, `grd`, `preGrd`等文件，需要实现Java序列化格式。

可以使用以下方法：
1. 使用JNI调用Java代码进行序列化
2. 实现Java序列化协议（复杂但可行）
3. 使用文本格式替代（需要修改Java读取代码）

**推荐方案**：创建一个Java辅助类，C++程序调用它来生成ObjectOutputStream格式的文件。

## 步骤5: 集成到Java后端

修改`RvoServerC.calculatePathWithNav`方法，改为调用C++程序：

```java
ProcessBuilder pb = new ProcessBuilder(
    "path/to/rvo_simulator",
    inputJsonPath,
    outputDir
);
Process process = pb.start();
int exitCode = process.waitFor();
```

## 注意事项

1. **性能**：C++版本应该比Java版本更快，但需要确保算法逻辑一致
2. **精度**：确保浮点数计算精度与Java版本一致
3. **进度更新**：C++程序需要定期更新进度文件，Java后端读取
4. **错误处理**：确保C++程序的错误能正确传递到Java后端

## 测试

1. 使用Java版本生成一个测试输入JSON
2. 运行C++程序
3. 比较输出文件与Java版本的输出
4. 确保前端能正常读取结果

