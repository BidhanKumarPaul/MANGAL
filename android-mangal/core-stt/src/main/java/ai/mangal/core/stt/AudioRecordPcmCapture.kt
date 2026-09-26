package ai.mangal.core.stt

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.sqrt

data class VadAudioFrame(
    val pcmFloat16kHz: FloatArray,
    val rmsEnergy: Float,
    val isSpeechActive: Boolean
)

@Singleton
class AudioRecordPcmCapture @Inject constructor() {

    companion object {
        const val SAMPLE_RATE_HZ = 16_000
        private const val FRAME_SAMPLES = 1280 // 80ms frame (matches openWakeWord & Whisper chunking)
        private const val SPEECH_RMS_THRESHOLD = 0.018f
    }

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _currentRms = MutableStateFlow(0f)
    val currentRms: StateFlow<Float> = _currentRms.asStateFlow()

    private var captureJob: Job? = null
    private val accumulatedSpeechSamples = ArrayList<Float>(SAMPLE_RATE_HZ * 15)

    @SuppressLint("MissingPermission")
    fun startCapture(
        scope: CoroutineScope,
        onFrameCallback: (VadAudioFrame) -> Unit = {}
    ) {
        if (_isRecording.value) return
        val minBufSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE_HZ,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(FRAME_SAMPLES * 2)

        val audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE_HZ,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            minBufSize * 2
        )

        if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
            audioRecord.release()
            return
        }

        accumulatedSpeechSamples.clear()
        audioRecord.startRecording()
        _isRecording.value = true

        captureJob = scope.launch(Dispatchers.Default) {
            val shortBuffer = ShortArray(FRAME_SAMPLES)
            try {
                while (isActive && _isRecording.value) {
                    val readCount = audioRecord.read(shortBuffer, 0, FRAME_SAMPLES)
                    if (readCount > 0) {
                        val floatFrame = FloatArray(readCount)
                        var sumSquares = 0.0
                        for (i in 0 until readCount) {
                            val normalized = (shortBuffer[i] / 32768.0f).coerceIn(-1.0f, 1.0f)
                            floatFrame[i] = normalized
                            sumSquares += normalized * normalized
                        }
                        val rms = sqrt(sumSquares / readCount).toFloat()
                        _currentRms.value = rms
                        val isSpeech = rms >= SPEECH_RMS_THRESHOLD

                        synchronized(accumulatedSpeechSamples) {
                            for (sample in floatFrame) {
                                accumulatedSpeechSamples.add(sample)
                            }
                        }

                        onFrameCallback(VadAudioFrame(floatFrame, rms, isSpeech))
                    }
                }
            } finally {
                try {
                    audioRecord.stop()
                } catch (_: Exception) {
                }
                audioRecord.release()
                _isRecording.value = false
                _currentRms.value = 0f
            }
        }
    }

    fun stopAndDrainPcmBuffer(): FloatArray {
        _isRecording.value = false
        captureJob?.cancel()
        captureJob = null
        synchronized(accumulatedSpeechSamples) {
            val result = FloatArray(accumulatedSpeechSamples.size)
            for (i in accumulatedSpeechSamples.indices) {
                result[i] = accumulatedSpeechSamples[i]
            }
            accumulatedSpeechSamples.clear()
            return result
        }
    }
}
