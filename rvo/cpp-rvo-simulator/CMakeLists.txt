cmake_minimum_required(VERSION 3.10)
project(RVOSimulator)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找RVO2库
# 假设RVO2库已经安装在系统中，或者通过子模块引入
# 如果RVO2作为子模块，取消下面的注释：
# add_subdirectory(RVO2)

# 包含目录
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/RVO2/src  # 如果RVO2是子模块
    ${CMAKE_CURRENT_BINARY_DIR}/RVO2/src
)

# JSON库 - 使用nlohmann/json (header-only)
# 可以通过git submodule或vcpkg安装
# 这里假设使用单文件版本
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/third_party)

# 源文件
set(SOURCES
    src/main.cpp
    src/simulator.cpp
    src/json_parser.cpp
    src/file_writer.cpp
)

# 可执行文件
add_executable(rvo_simulator ${SOURCES})

# 链接库
# 如果RVO2是静态库：
# target_link_libraries(rvo_simulator RVO2)

# 编译选项
if(MSVC)
    target_compile_options(rvo_simulator PRIVATE /W4 /EHsc)
else()
    target_compile_options(rvo_simulator PRIVATE -Wall -Wextra -pedantic)
endif()

# 安装
install(TARGETS rvo_simulator DESTINATION bin)

add_subdirectory(RVO2)
target_link_libraries(rvo_simulator PRIVATE RVO)