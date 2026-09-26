package ai.mangal.core.stt

import androidx.annotation.Keep
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
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

interface WhisperTranscriber {
    val isModelLoaded: StateFlow<Boolean>
    suspend fun loadWhisperModel(binPath: String): Result<Unit>
    fun transcribePcm16kStream(pcmSamples: FloatArray): Flow<String>
    suspend fun release()
}

@Keep
object WhisperJniBridge {
    private var nativeLibLoaded = false

    fun ensureLoaded(): Boolean {
        if (nativeLibLoaded) return true
        return try {
            System.loadLibrary("mangal_whisper_jni")
            nativeLibLoaded = true
            true
        } catch (_: UnsatisfiedLinkError) {
            false
        }
    }

    @Keep
    external fun initContext(modelPath: String): Long

    @Keep
    external fun transcribePcm(contextPtr: Long, pcmFloat16kHz: FloatArray, numThreads: Int): String

    @Keep
    external fun freeContext(contextPtr: Long)
}

@Singleton
class WhisperCppTranscriberImpl @Inject constructor() : WhisperTranscriber {
    private val _isModelLoaded = MutableStateFlow(false)
    override val isModelLoaded: StateFlow<Boolean> = _isModelLoaded.asStateFlow()

    private var whisperContextPtr: Long = 0L

    override suspend fun loadWhisperModel(binPath: String): Result<Unit> = withContext(Dispatchers.IO) {
        val file = File(binPath)
        if (!file.exists()) {
            return@withContext Result.failure(IllegalArgumentException("Whisper model file missing: $binPath"))
        }
        release()
        if (WhisperJniBridge.ensureLoaded()) {
            val ptr = WhisperJniBridge.initContext(binPath)
            if (ptr == 0L) {
                return@withContext Result.failure(IllegalStateException("whisper_init_from_file_with_params returned NULL"))
            }
            whisperContextPtr = ptr
        }
        _isModelLoaded.value = true
        Result.success(Unit)
    }

    override fun transcribePcm16kStream(pcmSamples: FloatArray): Flow<String> = flow {
        if (!_isModelLoaded.value || pcmSamples.isEmpty()) {
            emit("")
            return@flow
        }
        if (whisperContextPtr != 0L && WhisperJniBridge.ensureLoaded()) {
            val transcript = WhisperJniBridge.transcribePcm(
                whisperContextPtr,
                pcmSamples,
                Runtime.getRuntime().availableProcessors().coerceIn(2, 6)
            )
            emit(transcript.trim())
        } else {
            emit("")
        }
    }.flowOn(Dispatchers.Default)

    override suspend fun release() = withContext(Dispatchers.IO) {
        if (whisperContextPtr != 0L && WhisperJniBridge.ensureLoaded()) {
            WhisperJniBridge.freeContext(whisperContextPtr)
            whisperContextPtr = 0L
        }
        _isModelLoaded.value = false
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class SttModule {
    @Binds
    @Singleton
    abstract fun bindWhisperTranscriber(impl: WhisperCppTranscriberImpl): WhisperTranscriber
}
