cmake_minimum_required(VERSION 3.10)
project(RVOSimulator)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 包含目录（仅当前项目 + json 头文件）
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party
)

# JSON库 - 使用nlohmann/json (header-only)
# 可以通过git submodule或vcpkg安装
# 这里假设使用单文件版本

# 源文件
set(SOURCES
    src/main.cpp
    src/simulator.cpp
    src/json_parser.cpp
    src/file_writer.cpp
    src/nav_grid.cpp
)

add_executable(rvo_simulator ${SOURCES})

# 编译选项
if(MSVC)
    target_compile_options(rvo_simulator PRIVATE /W4 /EHsc)
else()
    target_compile_options(rvo_simulator PRIVATE -Wall -Wextra -pedantic)
endif()

# 安装
install(TARGETS rvo_simulator DESTINATION bin)