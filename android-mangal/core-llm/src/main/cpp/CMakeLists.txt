cmake_minimum_required(VERSION 3.22.1)
project("mangal_llama_jni" LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(${ANDROID_ABI} STREQUAL "arm64-v8a")
    add_compile_options(-march=armv8.2-a+dotprod+fp16 -O3)
endif()

add_library(mangal_llama_jni SHARED
    llama_jni.cpp
)

find_library(log-lib log)
target_link_libraries(mangal_llama_jni ${log-lib})
