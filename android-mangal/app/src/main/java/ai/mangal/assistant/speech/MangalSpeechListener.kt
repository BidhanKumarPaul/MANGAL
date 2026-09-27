package ai.mangal.assistant.speech

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

enum class VoiceListenPhase {
    PAUSED,
    STANDBY_LISTENING_FOR_MANGAL,
    WAKE_TRIGGERED_AWAITING_COMMAND,
    DIRECT_PTT_LISTENING
}

/**
 * Real Android on-device SpeechRecognizer manager that powers:
 * 1. Continuous Hands-Free "Mangal" wake word listening (like "Hey Google")
 * 2. Instant Push-to-Talk (Tap Mic) command recognition
 * 3. Real-time partial speech transcripts and RMS dB audio waveform meter
 */
@Singleton
class MangalSpeechListener @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var speechRecognizer: SpeechRecognizer? = null

    private val _phase = MutableStateFlow(VoiceListenPhase.STANDBY_LISTENING_FOR_MANGAL)
    val phase: StateFlow<VoiceListenPhase> = _phase.asStateFlow()

    private val _livePartialText = MutableStateFlow("")
    val livePartialText: StateFlow<String> = _livePartialText.asStateFlow()

    private val _rmsLevel = MutableStateFlow(0f)
    val rmsLevel: StateFlow<Float> = _rmsLevel.asStateFlow()

    private val _handsFreeEnabled = MutableStateFlow(true)
    val handsFreeEnabled: StateFlow<Boolean> = _handsFreeEnabled.asStateFlow()

    private var onCommandRecognizedCallback: ((String, Boolean) -> Unit)? = null
    private var isRecognizerBusy = false

    fun attachCommandCallback(callback: (utterance: String, wokeByMangal: Boolean) -> Unit) {
        onCommandRecognizedCallback = callback
    }

    fun setHandsFreeWakeEnabled(enabled: Boolean) {
        _handsFreeEnabled.value = enabled
        mainHandler.post {
            if (enabled) {
                _phase.value = VoiceListenPhase.STANDBY_LISTENING_FOR_MANGAL
                startRecognizerSessionInternal()
            } else {
                _phase.value = VoiceListenPhase.PAUSED
                stopInternal()
            }
        }
    }

    /**
     * Triggered when user taps the Microphone button directly (no wake word required)
     * or when "Mangal" was just spoken and MANGAL is awaiting the follow-up command.
     */
    fun startDirectCommandListening(fromWakeWord: Boolean = false) {
        mainHandler.post {
            playWakeEarcon()
            _phase.value = if (fromWakeWord) {
                VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND
            } else {
                VoiceListenPhase.DIRECT_PTT_LISTENING
            }
            _livePartialText.value = "Listening for your command..."
            restartRecognizerImmediately()
        }
    }

    fun ensureListeningIfAllowed() {
        mainHandler.post {
            if (_handsFreeEnabled.value && !isRecognizerBusy) {
                if (_phase.value == VoiceListenPhase.PAUSED) {
                    _phase.value = VoiceListenPhase.STANDBY_LISTENING_FOR_MANGAL
                }
                startRecognizerSessionInternal()
            }
        }
    }

    private fun restartRecognizerImmediately() {
        stopInternal()
        mainHandler.postDelayed({
            startRecognizerSessionInternal()
        }, 120L)
    }

    private fun startRecognizerSessionInternal() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _livePartialText.value = "Speech Recognition service unavailable on this device"
            return
        }

        try {
            if (speechRecognizer == null) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(createRecognitionListener())
                }
            }

            val recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                )
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            }

            isRecognizerBusy = true
            speechRecognizer?.startListening(recognizerIntent)
        } catch (_: Exception) {
            isRecognizerBusy = false
        }
    }

    private fun createRecognitionListener(): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                isRecognizerBusy = true
            }

            override fun onBeginningOfSpeech() {
                isRecognizerBusy = true
            }

            override fun onRmsChanged(rmsdB: Float) {
                val normalized = ((rmsdB + 2f) / 12f).coerceIn(0.03f, 1.0f)
                _rmsLevel.value = normalized
            }

            override fun onBufferReceived(buffer: ByteArray?) = Unit

            override fun onEndOfSpeech() {
                isRecognizerBusy = false
                _rmsLevel.value = 0.03f
            }

            override fun onError(error: Int) {
                isRecognizerBusy = false
                _rmsLevel.value = 0.03f
                if (_phase.value == VoiceListenPhase.DIRECT_PTT_LISTENING ||
                    _phase.value == VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND
                ) {
                    _livePartialText.value = ""
                    _phase.value = if (_handsFreeEnabled.value) {
                        VoiceListenPhase.STANDBY_LISTENING_FOR_MANGAL
                    } else {
                        VoiceListenPhase.PAUSED
                    }
                }
                scheduleContinuousRestartIfHandsFree()
            }

            override fun onResults(results: Bundle?) {
                isRecognizerBusy = false
                _rmsLevel.value = 0.03f
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val topTranscript = matches?.firstOrNull { it.isNotBlank() }?.trim().orEmpty()
                _livePartialText.value = ""

                if (topTranscript.isNotEmpty()) {
                    handleRecognizedUtterance(topTranscript)
                } else {
                    scheduleContinuousRestartIfHandsFree()
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val partial = partialResults
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.trim()
                    .orEmpty()

                if (partial.isNotEmpty()) {
                    _livePartialText.value = partial
                    // If in standby mode and the user says "Mangal" in partial results,
                    // immediately highlight wake state!
                    if (_phase.value == VoiceListenPhase.STANDBY_LISTENING_FOR_MANGAL &&
                        containsWakeWord(partial)
                    ) {
                        playWakeEarcon()
                        _phase.value = VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND
                    }
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        }
    }

    private fun handleRecognizedUtterance(utterance: String) {
        val currentPhase = _phase.value

        // Case 1: User tapped Mic (Direct PTT) or already triggered "Mangal" in previous turn
        if (currentPhase == VoiceListenPhase.DIRECT_PTT_LISTENING ||
            currentPhase == VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND
        ) {
            val stripped = stripWakeWordPrefix(utterance).ifBlank { utterance }
            _phase.value = if (_handsFreeEnabled.value) {
                VoiceListenPhase.STANDBY_LISTENING_FOR_MANGAL
            } else {
                VoiceListenPhase.PAUSED
            }
            onCommandRecognizedCallback?.invoke(stripped, currentPhase == VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND)
            scheduleContinuousRestartIfHandsFree(delayMs = 1400L)
            return
        }

        // Case 2: User is in Hands-Free Standby ("Say Mangal")
        if (containsWakeWord(utterance)) {
            val remainder = stripWakeWordPrefix(utterance)
            playWakeEarcon()
            if (remainder.isNotBlank()) {
                // User said "Mangal, turn on the flashlight" in one breath!
                onCommandRecognizedCallback?.invoke("Mangal, $remainder", true)
                scheduleContinuousRestartIfHandsFree(delayMs = 1500L)
            } else {
                // User only said "Mangal" -> enter active command capture immediately!
                onCommandRecognizedCallback?.invoke("Mangal", true)
                _phase.value = VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND
                scheduleContinuousRestartIfHandsFree(delayMs = 900L)
            }
        } else {
            // Ignored background speech that didn't contain "Mangal"
            scheduleContinuousRestartIfHandsFree(delayMs = 350L)
        }
    }

    private fun containsWakeWord(text: String): Boolean {
        val lower = text.lowercase(Locale.US)
        return lower.contains("mangal") || lower.contains("mongol") || lower.contains("mangala") || lower.contains("mangle")
    }

    private fun stripWakeWordPrefix(text: String): String {
        return text.replace(
            Regex("""^(?:hey\s+|ok\s+|hello\s+)?(?:mangal|mongol|mangala|mangle)\b[\s,.:;-]*""", RegexOption.IGNORE_CASE),
            ""
        ).trim()
    }

    private fun scheduleContinuousRestartIfHandsFree(delayMs: Long = 450L) {
        if (!_handsFreeEnabled.value) return
        mainHandler.postDelayed({
            if (_handsFreeEnabled.value && !isRecognizerBusy) {
                startRecognizerSessionInternal()
            }
        }, delayMs)
    }

    private fun playWakeEarcon() {
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
        } catch (_: Exception) {
        }
    }

    private fun stopInternal() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
        } catch (_: Exception) {
        }
        speechRecognizer = null
        isRecognizerBusy = false
        _rmsLevel.value = 0.03f
    }
}
