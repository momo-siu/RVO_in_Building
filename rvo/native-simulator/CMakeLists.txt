cmake_minimum_required(VERSION 3.20)
project(native_rvo_simulator LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(SIMULATOR_ROOT ${CMAKE_CURRENT_SOURCE_DIR}/../cpp-rvo-simulator)

find_package(JNI REQUIRED)

add_library(native_rvo_simulator SHARED
    src/native_interface.cpp
    ${SIMULATOR_ROOT}/src/simulator.cpp
    ${SIMULATOR_ROOT}/src/nav_grid.cpp
    ${SIMULATOR_ROOT}/src/json_parser.cpp
    ${SIMULATOR_ROOT}/src/file_writer.cpp
    ${SIMULATOR_ROOT}/src/main.cpp
)

target_include_directories(native_rvo_simulator
    PRIVATE
        ${SIMULATOR_ROOT}/include
        ${SIMULATOR_ROOT}/third_party
        ${JNI_INCLUDE_DIRS}
)

target_compile_definitions(native_rvo_simulator PRIVATE RVO_NATIVE_BUILD)

if (MSVC)
    target_compile_options(native_rvo_simulator PRIVATE /W4 /EHsc /bigobj /utf-8)
else()
    target_compile_options(native_rvo_simulator PRIVATE -Wall -Wextra -pedantic)
endif()

add_library(rvo_sim_core STATIC
    ${SIMULATOR_ROOT}/src/simulator.cpp
    ${SIMULATOR_ROOT}/src/nav_grid.cpp
    ${SIMULATOR_ROOT}/src/json_parser.cpp
    ${SIMULATOR_ROOT}/src/file_writer.cpp
)

target_include_directories(rvo_sim_core PUBLIC ${SIMULATOR_ROOT}/include ${SIMULATOR_ROOT}/third_party)

if (MSVC)
    target_compile_options(rvo_sim_core PRIVATE /utf-8)
endif()

add_library(native_rvo_interface SHARED src/native_interface.cpp)

target_include_directories(native_rvo_interface
    PRIVATE
        ${SIMULATOR_ROOT}/include
        ${SIMULATOR_ROOT}/third_party
        ${JNI_INCLUDE_DIRS}
)

if (MSVC)
    target_compile_options(native_rvo_interface PRIVATE /utf-8)
endif()

target_link_libraries(native_rvo_interface PRIVATE rvo_sim_core ${JNI_LIBRARIES})

install(TARGETS native_rvo_interface DESTINATION lib)
