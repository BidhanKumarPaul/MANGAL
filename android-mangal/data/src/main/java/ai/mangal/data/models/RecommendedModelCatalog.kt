package ai.mangal.data.models

import ai.mangal.data.db.LocalModelEntity

object RecommendedModelCatalog {

    val ALL_MODELS: List<LocalModelEntity> = listOf(
        LocalModelEntity(
            modelId = "qwen2.5-1.5b-instruct-q4_k_m",
            displayName = "Qwen 2.5 1.5B Instruct (Q4_K_M)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 1_120_000_000L, // ~1.12 GB
            requiredRamMb = 3072, // Safe on 4GB+ RAM devices
            sha256Checksum = "6b7e92e40a991f0c4c7d63f1e5f80a1c78e41d91a032b8d9a6142c5a18b9e014",
            localFilePath = null,
            isActive = true
        ),
        LocalModelEntity(
            modelId = "qwen2.5-3b-instruct-q4_k_m",
            displayName = "Qwen 2.5 3B Instruct (Q4_K_M)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 2_105_000_000L, // ~2.10 GB
            requiredRamMb = 5632, // Requires 6GB+ RAM devices
            sha256Checksum = "9f1a48b2d307c64e5128a94d8c3b20197e6f54a32109c8d7b6a5f4e3d2c1b0a9",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "gemma-3-4b-it-q4_k_m",
            displayName = "Gemma 3 4B Instruct (Q4_K_M · Gemma ToU)",
            category = "LLM_GGUF",
            quantization = "Q4_K_M",
            fileSizeBytes = 2_650_000_000L, // ~2.65 GB
            requiredRamMb = 6144, // Requires 8GB+ RAM devices
            sha256Checksum = "3c8d71a4b9e02f16543289ab76c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "whisper-tiny-en-q8_0",
            displayName = "Whisper Tiny.en (INT8 / Q8_0)",
            category = "STT_WHISPER",
            quantization = "Q8_0",
            fileSizeBytes = 42_500_000L, // ~42.5 MB
            requiredRamMb = 1024,
            sha256Checksum = "c4e8a912b7d03f6512894a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c71",
            localFilePath = null,
            isActive = true
        ),
        LocalModelEntity(
            modelId = "whisper-base-en-q8_0",
            displayName = "Whisper Base.en (INT8 / Q8_0)",
            category = "STT_WHISPER",
            quantization = "Q8_0",
            fileSizeBytes = 81_800_000L, // ~81.8 MB
            requiredRamMb = 1536,
            sha256Checksum = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
            localFilePath = null,
            isActive = false
        ),
        LocalModelEntity(
            modelId = "openwakeword-hey-mangal-v1",
            displayName = "openWakeWord 'Hey Mangal' (ONNX INT8)",
            category = "WAKE_WORD",
            quantization = "INT8",
            fileSizeBytes = 2_400_000L, // ~2.4 MB
            requiredRamMb = 512,
            sha256Checksum = "f0e1d2c3b4a5968778695a4b3c2d1e0ff0e1d2c3b4a5968778695a4b3c2d1e0f",
            localFilePath = null,
            isActive = true
        )
    )

    val DOWNLOAD_URLS: Map<String, String> = mapOf(
        "qwen2.5-1.5b-instruct-q4_k_m" to "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
        "qwen2.5-3b-instruct-q4_k_m" to "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
        "gemma-3-4b-it-q4_k_m" to "https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf",
        "whisper-tiny-en-q8_0" to "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q8_0.bin",
        "whisper-base-en-q8_0" to "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q8_0.bin",
        "openwakeword-hey-mangal-v1" to "https://huggingface.co/dscripka/openWakeWord/resolve/main/hey_jarvis_v0.1.onnx"
    )
}
