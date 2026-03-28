# Install script for directory: C:/Users/19255/Desktop/dachuang/rvo/cpp-rvo-simulator/RVO2

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "C:/Program Files (x86)/RVOSimulator")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Release")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "FALSE")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  # Include the install script for the subdirectory.
  include("C:/Users/19255/Desktop/dachuang/build/RVO2/src/cmake_install.cmake")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  # Include the install script for the subdirectory.
  include("C:/Users/19255/Desktop/dachuang/build/RVO2/examples/cmake_install.cmake")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  # Include the install script for the subdirectory.
  include("C:/Users/19255/Desktop/dachuang/build/RVO2/doc/cmake_install.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "runtime" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/share/doc/RVO" TYPE FILE FILES "C:/Users/19255/Desktop/dachuang/rvo/cpp-rvo-simulator/RVO2/LICENSE")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "development" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/RVO" TYPE FILE FILES
    "C:/Users/19255/Desktop/dachuang/build/RVO2/RVOConfig.cmake"
    "C:/Users/19255/Desktop/dachuang/build/RVO2/RVOConfigVersion.cmake"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE PROGRAM FILES
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/msvcp140.dll"
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/msvcp140_1.dll"
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/msvcp140_2.dll"
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/msvcp140_atomic_wait.dll"
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/msvcp140_codecvt_ids.dll"
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/vcruntime140.dll"
    "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Redist/MSVC/14.40.33807/x86/Microsoft.VC143.CRT/concrt140.dll"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE DIRECTORY FILES "")
endif()

string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
if(CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "C:/Users/19255/Desktop/dachuang/build/RVO2/install_local_manifest.txt"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
