# C++ RVO疏散模拟器

这个C++程序用于替换Java后端的RVO计算部分，使用C++的RVO2库实现避障路径规划。

## 依赖

- RVO2库 (https://github.com/snape/RVO2)
- JSON库 (nlohmann/json 或 rapidjson)
- CMake 3.10+

## 编译

```bash
mkdir build
cd build
cmake ..
make
```

## 使用

程序接受JSON格式的输入文件，输出与Java版本兼容的文件格式。

```bash
./rvo_simulator <input.json> <output_dir>
```

## 输入格式

输入JSON文件应包含：
- agents: 人员列表
- obstacles: 障碍物列表
- exits: 出口列表
- navPoints: 导航点列表
- 其他配置参数

## 输出格式

程序会生成以下文件（与Java版本兼容）：
- replayData.txt: 回放数据（Java ObjectOutputStream格式）
- result.rvo: 结果数据（文本格式）
- heatMap.rvo: 热力图数据（Java ObjectOutputStream格式）
- exitStatistic.txt: 出口统计（文本格式）
- Time.txt: 时间数据
