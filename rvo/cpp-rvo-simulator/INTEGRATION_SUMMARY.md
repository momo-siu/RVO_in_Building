# C++ RVO集成总结

## 已完成的工作

### 1. Java后端集成
- ✅ 创建了`CppRvoCaller.java`，用于调用C++程序
- ✅ 修改了`RvoServerC.java`，支持在C++和Java实现之间切换
- ✅ 添加了配置选项`rvo.useCpp`（默认false，使用Java实现）
- ✅ 实现了输入数据准备方法`prepareInputDataForCpp`

### 2. C++程序框架
- ✅ 创建了C++项目目录结构
- ✅ 创建了CMakeLists.txt
- ✅ 创建了基础的头文件和源文件框架
- ✅ 创建了实现指南文档

## 配置说明

在`application.properties`中添加：
```properties
# 是否使用C++ RVO模拟器（默认false，使用Java实现）
rvo.useCpp=false

# C++模拟器程序路径（相对于项目根目录）
path.cppRvoSimulatorPath=cpp-rvo-simulator/build/rvo_simulator
```

## 后续工作

### 1. 完善C++程序实现
需要完成以下功能：

#### JSON解析
- 使用nlohmann/json或rapidjson解析输入JSON
- 解析agents, obstacles, exits, navPoints等数据

#### RVO2库集成
- 正确初始化RVO2模拟器
- 添加障碍物
- 实现agent添加逻辑
- 实现首选速度设置（参考Java版本的`setPreferredVelocities`）
- 实现模拟循环

#### 文件输出
- **result.rvo**: 文本格式，已提供框架
- **replayData.txt**: Java ObjectOutputStream格式（需要特殊处理）
- **heatMap.rvo**: Java ObjectOutputStream格式
- **exitStatistic.txt**: 文本格式
- **grd, preGrd**: Java ObjectOutputStream格式
- **Time.txt**: 文本格式

### 2. Java ObjectOutputStream格式处理

由于C++程序需要生成Java序列化格式的文件，有以下方案：

**方案A（推荐）**: 创建Java辅助类
- C++程序生成文本格式的中间文件
- Java后端读取并转换为ObjectOutputStream格式

**方案B**: 实现Java序列化协议
- 在C++中实现Java序列化协议（复杂但可行）

**方案C**: 修改Java读取代码
- 修改Java后端，支持读取文本格式（需要修改多个地方）

### 3. 测试
1. 使用Java版本生成测试输入JSON
2. 运行C++程序，验证输出
3. 比较C++和Java版本的输出结果
4. 确保前端能正常读取C++生成的结果

## 使用流程

1. **编译C++程序**:
```bash
cd rvo/cpp-rvo-simulator
mkdir build && cd build
cmake ..
make
```

2. **配置Java后端**:
在`application.properties`中设置：
```properties
rvo.useCpp=true
path.cppRvoSimulatorPath=../cpp-rvo-simulator/build/rvo_simulator
```

3. **运行**:
前端点击"方案模拟"时，后端会自动调用C++程序（如果配置启用）

## 注意事项

1. **性能**: C++版本应该比Java版本更快
2. **精度**: 确保浮点数计算精度一致
3. **进度更新**: C++程序需要定期更新进度文件
4. **错误处理**: 确保错误能正确传递到Java后端
5. **回退机制**: 如果C++调用失败，会自动回退到Java实现

## 文件结构

```
rvo/
├── cpp-rvo-simulator/          # C++程序
│   ├── CMakeLists.txt
│   ├── README.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── include/
│   │   └── simulator.h
│   └── src/
│       ├── main.cpp
│       ├── simulator.cpp
│       ├── json_parser.cpp
│       └── file_writer.cpp
└── src/main/java/.../
    ├── CppRvoCaller.java       # C++调用器
    └── RvoServerC.java         # 修改后的RVO服务器
```

