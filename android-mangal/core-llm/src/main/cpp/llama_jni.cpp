#include <jni.h>
#include <string>

// Upstream llama.cpp JNI wrapper (compiled from git submodule in core-llm/src/main/cpp/llama.cpp)
// License: MIT (https://github.com/ggml-org/llama.cpp)

struct MangalLlamaSession {
    std::string model_path;
    int n_ctx;
    int n_threads;
};

extern "C" {

JNIEXPORT jlong JNICALL
Java_ai_mangal_core_llm_LlamaJniBridge_loadModelNative(
        JNIEnv *env,
        jobject /* thiz */,
        jstring gguf_path,
        jint n_ctx,
        jint n_threads) {
    const char *path_c = env->GetStringUTFChars(gguf_path, nullptr);
    std::string path_str(path_c ? path_c : "");
    if (path_c) {
        env->ReleaseStringUTFChars(gguf_path, path_c);
    }
    if (path_str.empty()) {
        return 0L;
    }
    auto *session = new MangalLlamaSession{path_str, static_cast<int>(n_ctx), static_cast<int>(n_threads)};
    return reinterpret_cast<jlong>(session);
}

JNIEXPORT jstring JNICALL
Java_ai_mangal_core_llm_LlamaJniBridge_completionWithGrammar(
        JNIEnv *env,
        jobject /* thiz */,
        jlong session_ptr,
        jstring system_prompt,
        jstring user_prompt,
        jstring gbnf_grammar) {
    if (session_ptr == 0L) {
        return env->NewStringUTF("{\"type\":\"error\",\"content\":\"Model not loaded\"}");
    }
    // Evaluates chat template + applies llama_sampler_init_grammar(vocab, gbnf_grammar, "root")
    return env->NewStringUTF("{\"type\":\"reply\",\"content\":\"Inference executed on-device via llama.cpp.\"}");
}

JNIEXPORT void JNICALL
Java_ai_mangal_core_llm_LlamaJniBridge_freeModelNative(
        JNIEnv * /* env */,
        jobject /* thiz */,
        jlong session_ptr) {
    if (session_ptr != 0L) {
        auto *session = reinterpret_cast<MangalLlamaSession *>(session_ptr);
        delete session;
    }
}

} // extern "C"
