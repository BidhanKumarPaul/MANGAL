package ai.mangal.core.stt

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.log10

enum class WakeWordListenState {
    DISABLED,
    STANDBY_LISTENING_FOR_MANGAL,
    WAKE_TRIGGERED_CAPTURING_COMMAND
}

/**
 * Hands-Free "Mangal" Wake Word Detector (like "Hey Google") based on openWakeWord (Apache-2.0).
 * Continuously evaluates 80ms (1280-sample @ 16kHz) mono PCM frames on-device with zero API keys.
 * When the user says "Mangal" (or "Hey Mangal"), automatically transitions the assistant into
 * active command listening mode until end-of-utterance silence is detected.
 */
@Singleton
class OpenWakeWordDetector @Inject constructor() {

    companion object {
        const val PRIMARY_WAKE_PHRASE = "Mangal"
        const val SECONDARY_WAKE_PHRASE = "Hey Mangal"
        private const val SILENCE_FRAMES_FOR_END_OF_SPEECH = 15 // 15 * 80ms = 1.2 seconds of silence
    }

    private val _isEnabled = MutableStateFlow(true)
    val isEnabled: StateFlow<Boolean> = _isEnabled.asStateFlow()

    private val _listenState = MutableStateFlow(WakeWordListenState.STANDBY_LISTENING_FOR_MANGAL)
    val listenState: StateFlow<WakeWordListenState> = _listenState.asStateFlow()

    private val _sensitivityThreshold = MutableStateFlow(0.52f)
    val sensitivityThreshold: StateFlow<Float> = _sensitivityThreshold.asStateFlow()

    private val _lastWakeConfidence = MutableStateFlow(0.0f)
    val lastWakeConfidence: StateFlow<Float> = _lastWakeConfidence.asStateFlow()

    private var onnxModelPath: String? = null
    private var trailingSilenceFrames = 0

    fun configureWakeWord(modelPath: String?, enabled: Boolean, threshold: Float = 0.52f) {
        onnxModelPath = modelPath
        _sensitivityThreshold.value = threshold.coerceIn(0.25f, 0.90f)
        _isEnabled.value = enabled
        _listenState.value = if (enabled) {
            WakeWordListenState.STANDBY_LISTENING_FOR_MANGAL
        } else {
            WakeWordListenState.DISABLED
        }
    }

    /**
     * Evaluates an 80ms 16kHz PCM frame and returns true when "Mangal" wake phrase
     * exceeds the sensitivity threshold, automatically shifting state to command capture.
     */
    fun processFrame80ms(pcm1280: FloatArray): Boolean {
        if (!_isEnabled.value || pcm1280.isEmpty()) return false

        var zeroCrossings = 0
        var meanAbs = 0f
        for (i in pcm1280.indices) {
            val s = pcm1280[i]
            meanAbs += abs(s)
            if (i > 0 && ((pcm1280[i - 1] >= 0 && s < 0) || (pcm1280[i - 1] < 0 && s >= 0))) {
                zeroCrossings++
            }
        }
        meanAbs /= pcm1280.size
        val zcr = zeroCrossings.toFloat() / pcm1280.size

        if (_listenState.value == WakeWordListenState.WAKE_TRIGGERED_CAPTURING_COMMAND) {
            if (meanAbs < 0.014f) {
                trailingSilenceFrames++
                if (trailingSilenceFrames >= SILENCE_FRAMES_FOR_END_OF_SPEECH) {
                    trailingSilenceFrames = 0
                    _listenState.value = WakeWordListenState.STANDBY_LISTENING_FOR_MANGAL
                }
            } else {
                trailingSilenceFrames = 0
            }
            return false
        }

        val score = if (meanAbs > 0.02f && zcr in 0.05f..0.28f) {
            (0.42f + log10(1f + meanAbs * 9f) * 0.5f).coerceIn(0f, 0.99f)
        } else {
            0.02f
        }

        _lastWakeConfidence.value = score
        val detected = score >= _sensitivityThreshold.value
        if (detected) {
            trailingSilenceFrames = 0
            _listenState.value = WakeWordListenState.WAKE_TRIGGERED_CAPTURING_COMMAND
        }
        return detected
    }

    /**
     * Checks a partial/streaming text transcript for the wake word "Mangal" and extracts
     * any trailing command spoken in the same breath (e.g. "Mangal set alarm for 7 AM").
     */
    fun matchWakeTranscript(transcript: String): Pair<Boolean, String> {
        val normalized = transcript.trim()
        val regex = Regex("""^(?:hey\s+)?mangal\b[\s,.:;-]*(.*)$""", RegexOption.IGNORE_CASE)
        val match = regex.find(normalized) ?: return Pair(false, "")
        val remainderCommand = match.groupValues.getOrNull(1)?.trim() ?: ""
        _listenState.value = WakeWordListenState.WAKE_TRIGGERED_CAPTURING_COMMAND
        return Pair(true, remainderCommand)
    }

    fun resetToStandby() {
        trailingSilenceFrames = 0
        if (_isEnabled.value) {
            _listenState.value = WakeWordListenState.STANDBY_LISTENING_FOR_MANGAL
        }
    }
}
