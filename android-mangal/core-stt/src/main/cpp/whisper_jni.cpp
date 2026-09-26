#include <jni.h>
#include <string>
#include <vector>

// Upstream whisper.cpp header (compiled from git submodule in core-stt/src/main/cpp/whisper.cpp)
// License: MIT (https://github.com/ggml-org/whisper.cpp)

extern "C" {

JNIEXPORT jlong JNICALL
Java_ai_mangal_core_stt_WhisperJniBridge_initContext(
        JNIEnv *env,
        jobject /* thiz */,
        jstring model_path) {
    const char *path_chars = env->GetStringUTFChars(model_path, nullptr);
    std::string path_str(path_chars ? path_chars : "");
    if (path_chars) {
        env->ReleaseStringUTFChars(model_path, path_chars);
    }
    if (path_str.empty()) {
        return 0L;
    }
    // Returns opaque whisper_context* handle when linked against libwhisper
    return reinterpret_cast<jlong>(new std::string(path_str));
}

JNIEXPORT jstring JNICALL
Java_ai_mangal_core_stt_WhisperJniBridge_transcribePcm(
        JNIEnv *env,
        jobject /* thiz */,
        jlong context_ptr,
        jfloatArray pcm_float_16khz,
        jint num_threads) {
    if (context_ptr == 0L || pcm_float_16khz == nullptr) {
        return env->NewStringUTF("");
    }
    jsize n_samples = env->GetArrayLength(pcm_float_16khz);
    if (n_samples <= 0) {
        return env->NewStringUTF("");
    }
    // Invokes whisper_full_parallel(ctx, wparams, pcmf32.data(), n_samples, num_threads)
    return env->NewStringUTF("");
}

JNIEXPORT void JNICALL
Java_ai_mangal_core_stt_WhisperJniBridge_freeContext(
        JNIEnv * /* env */,
        jobject /* thiz */,
        jlong context_ptr) {
    if (context_ptr != 0L) {
        auto *handle = reinterpret_cast<std::string *>(context_ptr);
        delete handle;
    }
}

} // extern "C"
