package ai.mangal.data.models

import ai.mangal.data.db.LocalModelEntity

object RecommendedModelCatalog {

    val ALL_MODELS: List<LocalModelEntity> = listOf(
        LocalModelEntity(
            modelId = "qwen2.5-1.5b-instruct-q4_k_m",
            displayName = "Qwen 2.5 1.5B Instruct (Q4_K_M)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 1_117_320_736L, // ~1.06 GB
            requiredRamMb = 2560, // Safe on 4GB+ RAM devices
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "qwen2.5-0.5b-instruct-q4_k_m",
            displayName = "Qwen 2.5 0.5B Fast Instruct (Q4_K_M · Ultra-Light)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 397_800_000L, // ~398 MB (Fast download)
            requiredRamMb = 1200,
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "qwen2.5-3b-instruct-q4_k_m",
            displayName = "Qwen 2.5 3B Instruct (Q4_K_M)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 2_105_000_000L, // ~2.10 GB
            requiredRamMb = 5120,
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "gemma-3-4b-it-q4_k_m",
            displayName = "Gemma 3 4B Instruct (Q4_K_M · Gemma ToU)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 2_650_000_000L, // ~2.65 GB
            requiredRamMb = 6144,
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "whisper-tiny-en-q8_0",
            displayName = "Whisper Tiny.en (INT8 / Q8_0 · Fast Download)",
            category = "STT_WHISPER",
            quantization = "Q8_0",
            fileSizeBytes = 43_537_408L, // ~41.5 MB
            requiredRamMb = 768,
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "whisper-base-en-q8_0",
            displayName = "Whisper Base.en (INT8 / Q8_0)",
            category = "STT_WHISPER",
            quantization = "Q8_0",
            fileSizeBytes = 81_788_928L, // ~78.0 MB
            requiredRamMb = 1280,
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        )
    )

    val DOWNLOAD_URLS: MutableMap<String, String> = mutableMapOf(
        "qwen2.5-1.5b-instruct-q4_k_m" to "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true",
        "qwen2.5-0.5b-instruct-q4_k_m" to "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true",
        "qwen2.5-3b-instruct-q4_k_m" to "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true",
        "gemma-3-4b-it-q4_k_m" to "https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf?download=true",
        "whisper-tiny-en-q8_0" to "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q8_0.bin?download=true",
        "whisper-base-en-q8_0" to "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q8_0.bin?download=true"
    )
}
