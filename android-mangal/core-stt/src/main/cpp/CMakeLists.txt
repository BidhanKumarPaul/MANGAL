cmake_minimum_required(VERSION 3.22.1)
project("mangal_whisper_jni" LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(${ANDROID_ABI} STREQUAL "arm64-v8a")
    add_compile_options(-march=armv8.2-a+dotprod+fp16 -O3)
endif()

# Android 15 (API 35) & Google Play Protect 16KB ELF Page Alignment
add_link_options(-Wl,-z,max-page-size=16384)

add_library(mangal_whisper_jni SHARED
    whisper_jni.cpp
)

find_library(log-lib log)

# Link upstream ggml-org/whisper.cpp statically when git submodule is initialized
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/whisper.cpp/CMakeLists.txt")
    set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
    set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
    set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
    set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
    set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    add_subdirectory(whisper.cpp build-whisper EXCLUDE_FROM_ALL)
    target_compile_definitions(mangal_whisper_jni PRIVATE MANGAL_HAS_UPSTREAM_WHISPER_CPP=1)
    target_include_directories(mangal_whisper_jni PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/whisper.cpp/include"
        "${CMAKE_CURRENT_SOURCE_DIR}/whisper.cpp/ggml/include"
    )
    target_link_libraries(mangal_whisper_jni whisper ${log-lib})
else()
    target_link_libraries(mangal_whisper_jni ${log-lib})
endif()
