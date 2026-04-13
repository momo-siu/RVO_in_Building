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
    target_compile_options(rvo_simulator PRIVATE /W4 /EHsc /utf-8 $<$<CONFIG:Release>:/O2 /GL> $<$<CONFIG:RelWithDebInfo>:/O2 /GL>)
    target_link_options(rvo_simulator PRIVATE $<$<CONFIG:Release>:/LTCG> $<$<CONFIG:RelWithDebInfo>:/LTCG>)
else()
    target_compile_options(rvo_simulator PRIVATE -Wall -Wextra -pedantic $<$<CONFIG:Release>:-O3 -DNDEBUG -march=native> $<$<CONFIG:RelWithDebInfo>:-O3 -DNDEBUG -march=native>)

    include(CheckIPOSupported)
    check_ipo_supported(RESULT ipo_supported OUTPUT ipo_message)
    if(ipo_supported)
        set_property(TARGET rvo_simulator PROPERTY INTERPROCEDURAL_OPTIMIZATION_RELEASE TRUE)
        set_property(TARGET rvo_simulator PROPERTY INTERPROCEDURAL_OPTIMIZATION_RELWITHDEBINFO TRUE)
    endif()
endif()

# 安装
install(TARGETS rvo_simulator DESTINATION bin)