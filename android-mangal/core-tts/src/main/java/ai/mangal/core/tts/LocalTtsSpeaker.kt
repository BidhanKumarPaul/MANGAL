package ai.mangal.core.tts

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

data class OfflineVoiceInfo(
    val name: String,
    val localeTag: String,
    val quality: Int
)

interface LocalTtsSpeaker {
    val isReady: StateFlow<Boolean>
    val isSpeaking: StateFlow<Boolean>
    val availableOfflineVoices: StateFlow<List<OfflineVoiceInfo>>
    fun speakOffline(text: String, speechRate: Float = 1.0f, pitch: Float = 1.0f, voiceName: String? = null)
    fun stop()
    fun shutdown()
}

@Singleton
class AndroidNativeTtsSpeaker @Inject constructor(
    @ApplicationContext private val context: Context
) : LocalTtsSpeaker, TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null

    private val _isReady = MutableStateFlow(false)
    override val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _isSpeaking = MutableStateFlow(false)
    override val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    private val _availableOfflineVoices = MutableStateFlow<List<OfflineVoiceInfo>>(emptyList())
    override val availableOfflineVoices: StateFlow<List<OfflineVoiceInfo>> = _availableOfflineVoices.asStateFlow()

    init {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val engine = tts ?: return
            engine.language = Locale.US
            engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    _isSpeaking.value = true
                }

                override fun onDone(utteranceId: String?) {
                    _isSpeaking.value = false
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    _isSpeaking.value = false
                }
            })

            // Filter strictly for local on-device voices that do not require network synthesis
            val offlineList = engine.voices
                ?.filter { voice -> !voice.isNetworkConnectionRequired }
                ?.map { voice ->
                    OfflineVoiceInfo(
                        name = voice.name,
                        localeTag = voice.locale.toLanguageTag(),
                        quality = voice.quality
                    )
                }
                ?.sortedByDescending { it.quality }
                ?: emptyList()

            _availableOfflineVoices.value = offlineList
            _isReady.value = true
        }
    }

    override fun speakOffline(text: String, speechRate: Float, pitch: Float, voiceName: String?) {
        val engine = tts ?: return
        if (!_isReady.value || text.isBlank()) return

        engine.setSpeechRate(speechRate.coerceIn(0.5f, 2.0f))
        engine.setPitch(pitch.coerceIn(0.5f, 1.5f))

        if (voiceName != null) {
            val matchedVoice: Voice? = engine.voices?.firstOrNull {
                it.name == voiceName && !it.isNetworkConnectionRequired
            }
            if (matchedVoice != null) {
                engine.voice = matchedVoice
            }
        }

        val params = Bundle().apply {
            putString(TextToSpeech.Engine.KEY_FEATURE_NETWORK_SYNTHESIS, "false")
        }
        engine.speak(
            text,
            TextToSpeech.QUEUE_FLUSH,
            params,
            "mangal_utterance_${System.currentTimeMillis()}"
        )
    }

    override fun stop() {
        tts?.stop()
        _isSpeaking.value = false
    }

    override fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        _isSpeaking.value = false
        _isReady.value = false
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class TtsModule {
    @Binds
    @Singleton
    abstract fun bindLocalTtsSpeaker(impl: AndroidNativeTtsSpeaker): LocalTtsSpeaker
}
