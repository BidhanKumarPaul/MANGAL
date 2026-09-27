#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>
#include <cstring>

#define LOG_TAG "LlamaJniBridge"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#if defined(MANGAL_HAS_UPSTREAM_LLAMA_CPP)
#include "llama.h"
#endif

struct MangalLlamaSession {
    std::string model_path;
    int n_ctx;
    int n_threads;
#if defined(MANGAL_HAS_UPSTREAM_LLAMA_CPP)
    llama_model *model = nullptr;
    llama_context *ctx = nullptr;
#endif
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

    auto *session = new MangalLlamaSession();
    session->model_path = path_str;
    session->n_ctx = static_cast<int>(n_ctx);
    session->n_threads = static_cast<int>(n_threads);

#if defined(MANGAL_HAS_UPSTREAM_LLAMA_CPP)
    llama_backend_init();
    llama_model_params model_params = llama_model_default_params();
    model_params.use_mmap = true;
    session->model = llama_model_load_from_file(path_str.c_str(), model_params);
    if (!session->model) {
        LOGE("Failed to load GGUF model from %s", path_str.c_str());
        delete session;
        return 0L;
    }

    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx = static_cast<uint32_t>(n_ctx);
    ctx_params.n_threads = static_cast<int32_t>(n_threads);
    ctx_params.n_threads_batch = static_cast<int32_t>(n_threads);
    session->ctx = llama_init_from_model(session->model, ctx_params);
    if (!session->ctx) {
        LOGE("Failed to create llama_context for %s", path_str.c_str());
        llama_model_free(session->model);
        delete session;
        return 0L;
    }
    LOGI("Loaded GGUF model via llama.cpp: %s (n_ctx=%d, threads=%d)", path_str.c_str(), n_ctx, n_threads);
#else
    LOGI("Initialized JNI session (submodule not yet cloned): %s", path_str.c_str());
#endif

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

    auto *session = reinterpret_cast<MangalLlamaSession *>(session_ptr);

    const char *sys_c = env->GetStringUTFChars(system_prompt, nullptr);
    const char *usr_c = env->GetStringUTFChars(user_prompt, nullptr);
    const char *gbnf_c = env->GetStringUTFChars(gbnf_grammar, nullptr);

    std::string sys_str(sys_c ? sys_c : "");
    std::string usr_str(usr_c ? usr_c : "");
    std::string gbnf_str(gbnf_c ? gbnf_c : "");

    if (sys_c) env->ReleaseStringUTFChars(system_prompt, sys_c);
    if (usr_c) env->ReleaseStringUTFChars(user_prompt, usr_c);
    if (gbnf_c) env->ReleaseStringUTFChars(gbnf_grammar, gbnf_c);

#if defined(MANGAL_HAS_UPSTREAM_LLAMA_CPP)
    if (session->ctx && session->model) {
        const llama_vocab *vocab = llama_model_get_vocab(session->model);
        std::string full_prompt = "<|im_start|>system\n" + sys_str + "<|im_end|>\n<|im_start|>user\n" + usr_str + "<|im_end|>\n<|im_start|>assistant\n";

        int n_prompt_tokens = -llama_tokenize(vocab, full_prompt.c_str(), full_prompt.size(), nullptr, 0, true, true);
        std::vector<llama_token> tokens(n_prompt_tokens);
        llama_tokenize(vocab, full_prompt.c_str(), full_prompt.size(), tokens.data(), tokens.size(), true, true);

        llama_sampler *smpl = llama_sampler_chain_init(llama_sampler_chain_default_params());
        if (!gbnf_str.empty()) {
            llama_sampler_chain_add(smpl, llama_sampler_init_grammar(vocab, gbnf_str.c_str(), "root"));
        }
        llama_sampler_chain_add(smpl, llama_sampler_init_greedy());

        llama_batch batch = llama_batch_get_one(tokens.data(), tokens.size());
        std::string output;

        if (llama_decode(session->ctx, batch) == 0) {
            for (int i = 0; i < 256; ++i) {
                llama_token new_token_id = llama_sampler_sample(smpl, session->ctx, -1);
                if (llama_vocab_is_eog(vocab, new_token_id)) {
                    break;
                }
                char buf[128];
                int n = llama_token_to_piece(vocab, new_token_id, buf, sizeof(buf), 0, true);
                if (n > 0) {
                    output.append(buf, n);
                }
                batch = llama_batch_get_one(&new_token_id, 1);
                if (llama_decode(session->ctx, batch) != 0) {
                    break;
                }
            }
        }
        llama_sampler_free(smpl);
        if (!output.empty()) {
            return env->NewStringUTF(output.c_str());
        }
    }
#endif

    // Deterministic offline tool-call router fallback when built without submodule weights loaded
    return env->NewStringUTF("{\"type\":\"reply\",\"replyText\":\"Offline response from MANGAL JNI bridge. Initialize git submodule llama.cpp and download Qwen 2.5 GGUF in Model Manager for full neural generation.\"}");
}

JNIEXPORT void JNICALL
Java_ai_mangal_core_llm_LlamaJniBridge_freeModelNative(
        JNIEnv * /* env */,
        jobject /* thiz */,
        jlong session_ptr) {
    if (session_ptr != 0L) {
        auto *session = reinterpret_cast<MangalLlamaSession *>(session_ptr);
#if defined(MANGAL_HAS_UPSTREAM_LLAMA_CPP)
        if (session->ctx) {
            llama_free(session->ctx);
        }
        if (session->model) {
            llama_model_free(session->model);
        }
        llama_backend_free();
#endif
        delete session;
    }
}

} // extern "C"
