#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>

#define LOG_TAG "WhisperJniBridge"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#if defined(MANGAL_HAS_UPSTREAM_WHISPER_CPP)
#include "whisper.h"
#endif

struct MangalWhisperSession {
    std::string model_path;
#if defined(MANGAL_HAS_UPSTREAM_WHISPER_CPP)
    whisper_context *ctx = nullptr;
#endif
};

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

    auto *session = new MangalWhisperSession();
    session->model_path = path_str;

#if defined(MANGAL_HAS_UPSTREAM_WHISPER_CPP)
    whisper_context_params cparams = whisper_context_default_params();
    session->ctx = whisper_init_from_file_with_params(path_str.c_str(), cparams);
    if (!session->ctx) {
        LOGE("Failed to initialize whisper_context from %s", path_str.c_str());
        delete session;
        return 0L;
    }
    LOGI("Loaded Whisper GGML model: %s", path_str.c_str());
#else
    LOGI("Initialized Whisper JNI session (submodule not yet cloned): %s", path_str.c_str());
#endif

    return reinterpret_cast<jlong>(session);
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

    auto *session = reinterpret_cast<MangalWhisperSession *>(context_ptr);
    jfloat *pcm_ptr = env->GetFloatArrayElements(pcm_float_16khz, nullptr);
    if (!pcm_ptr) {
        return env->NewStringUTF("");
    }

    std::string transcript;

#if defined(MANGAL_HAS_UPSTREAM_WHISPER_CPP)
    if (session->ctx) {
        whisper_full_params wparams = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
        wparams.print_realtime = false;
        wparams.print_progress = false;
        wparams.print_timestamps = false;
        wparams.print_special = false;
        wparams.translate = false;
        wparams.language = "en";
        wparams.n_threads = static_cast<int>(num_threads);
        wparams.no_context = true;
        wparams.single_segment = true;

        if (whisper_full(session->ctx, wparams, pcm_ptr, static_cast<int>(n_samples)) == 0) {
            const int n_segments = whisper_full_n_segments(session->ctx);
            for (int i = 0; i < n_segments; ++i) {
                const char *text = whisper_full_get_segment_text(session->ctx, i);
                if (text) {
                    transcript += text;
                }
            }
        }
    }
#endif

    env->ReleaseFloatArrayElements(pcm_float_16khz, pcm_ptr, JNI_ABORT);
    return env->NewStringUTF(transcript.c_str());
}

JNIEXPORT void JNICALL
Java_ai_mangal_core_stt_WhisperJniBridge_freeContext(
        JNIEnv * /* env */,
        jobject /* thiz */,
        jlong context_ptr) {
    if (context_ptr != 0L) {
        auto *session = reinterpret_cast<MangalWhisperSession *>(context_ptr);
#if defined(MANGAL_HAS_UPSTREAM_WHISPER_CPP)
        if (session->ctx) {
            whisper_free(session->ctx);
        }
#endif
        delete session;
    }
}

} // extern "C"
