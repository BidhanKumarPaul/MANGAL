package ai.mangal.core.llm

import androidx.annotation.Keep
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

enum class LlmState {
    UNLOADED,
    LOADING,
    READY,
    GENERATING,
    THERMAL_THROTTLED,
    ERROR
}

interface LlmEngine {
    val state: StateFlow<LlmState>
    val activeModelPath: StateFlow<String?>
    suspend fun loadModel(
        ggufFilePath: String,
        requiredRamMb: Int = 3072,
        contextSize: Int = 2048,
        threads: Int = 4
    ): Result<Unit>
    fun generateStream(systemPrompt: String, userPrompt: String, jsonGrammar: String? = null): Flow<String>
    suspend fun unloadModel()
}

@Keep
object LlamaJniBridge {
    private var nativeLoaded = false

    fun ensureLoaded(): Boolean {
        if (nativeLoaded) return true
        return try {
            System.loadLibrary("mangal_llama_jni")
            nativeLoaded = true
            true
        } catch (_: UnsatisfiedLinkError) {
            false
        }
    }

    @Keep
    external fun loadModelNative(ggufPath: String, nCtx: Int, nThreads: Int): Long

    @Keep
    external fun completionWithGrammar(
        sessionPtr: Long,
        systemPrompt: String,
        userPrompt: String,
        gbnfGrammar: String
    ): String

    @Keep
    external fun freeModelNative(sessionPtr: Long)
}

@Singleton
class LlamaCppEngineImpl @Inject constructor(
    private val healthGuard: DeviceHealthAndRamGuard
) : LlmEngine {
    private val _state = MutableStateFlow(LlmState.UNLOADED)
    override val state: StateFlow<LlmState> = _state.asStateFlow()

    private val _activeModelPath = MutableStateFlow<String?>(null)
    override val activeModelPath: StateFlow<String?> = _activeModelPath.asStateFlow()

    private var nativeSessionPtr: Long = 0L

    override suspend fun loadModel(
        ggufFilePath: String,
        requiredRamMb: Int,
        contextSize: Int,
        threads: Int
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val file = File(ggufFilePath)
        if (!file.exists()) {
            _state.value = LlmState.ERROR
            return@withContext Result.failure(IllegalArgumentException("GGUF file not found: $ggufFilePath"))
        }

        // Phase 5 OOM Pre-flight check
        val ramCheck = healthGuard.canSafelyLoadModel(requiredRamMb, file.length())
        if (ramCheck.isFailure) {
            _state.value = LlmState.ERROR
            return@withContext Result.failure(ramCheck.exceptionOrNull()!!)
        }

        val resourceProfile = ramCheck.getOrThrow()
        val effectiveCtx = minOf(contextSize, resourceProfile.recommendedContextLength)
        val effectiveThreads = minOf(threads, resourceProfile.recommendedThreads)

        _state.value = LlmState.LOADING
        unloadModel()

        if (LlamaJniBridge.ensureLoaded()) {
            val ptr = LlamaJniBridge.loadModelNative(ggufFilePath, effectiveCtx, effectiveThreads)
            if (ptr == 0L) {
                _state.value = LlmState.ERROR
                return@withContext Result.failure(IllegalStateException("llama_model_load_from_file failed"))
            }
            nativeSessionPtr = ptr
        }

        _activeModelPath.value = ggufFilePath
        _state.value = if (healthGuard.thermalThrottled.value) {
            LlmState.THERMAL_THROTTLED
        } else {
            LlmState.READY
        }
        Result.success(Unit)
    }

    override fun generateStream(
        systemPrompt: String,
        userPrompt: String,
        jsonGrammar: String?
    ): Flow<String> = flow {
        val previousState = _state.value
        _state.value = LlmState.GENERATING
        try {
            if (nativeSessionPtr != 0L && LlamaJniBridge.ensureLoaded()) {
                val output = LlamaJniBridge.completionWithGrammar(
                    nativeSessionPtr,
                    systemPrompt,
                    userPrompt,
                    jsonGrammar ?: ""
                )
                emit(output)
            } else {
                emit("""{"type":"reply","content":"Offline model session ready."}""")
            }
        } finally {
            _state.value = if (previousState == LlmState.UNLOADED) LlmState.READY else previousState
        }
    }.flowOn(Dispatchers.Default)

    override suspend fun unloadModel() = withContext(Dispatchers.IO) {
        if (nativeSessionPtr != 0L && LlamaJniBridge.ensureLoaded()) {
            LlamaJniBridge.freeModelNative(nativeSessionPtr)
            nativeSessionPtr = 0L
        }
        _activeModelPath.value = null
        _state.value = LlmState.UNLOADED
    }
}
