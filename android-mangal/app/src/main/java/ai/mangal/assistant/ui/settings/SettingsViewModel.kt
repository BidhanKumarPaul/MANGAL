package ai.mangal.assistant.ui.settings

import androidx.lifecycle.ViewModel
import ai.mangal.assistant.lifecycle.ModelMemoryLifecycleObserver
import ai.mangal.core.tts.LocalTtsSpeaker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val ttsSpeaker: LocalTtsSpeaker,
    private val lifecycleObserver: ModelMemoryLifecycleObserver
) : ViewModel() {

    private val _speechRate = MutableStateFlow(1.0f)
    val speechRate: StateFlow<Float> = _speechRate.asStateFlow()

    private val _pitch = MutableStateFlow(1.0f)
    val pitch: StateFlow<Float> = _pitch.asStateFlow()

    private val _unloadWhenBackgrounded = MutableStateFlow(true)
    val unloadWhenBackgrounded: StateFlow<Boolean> = _unloadWhenBackgrounded.asStateFlow()

    fun updateSpeechRate(rate: Float) {
        _speechRate.value = rate.coerceIn(0.5f, 2.0f)
    }

    fun updatePitch(newPitch: Float) {
        _pitch.value = newPitch.coerceIn(0.5f, 1.5f)
    }

    fun previewTtsVoice() {
        ttsSpeaker.speakOffline(
            text = "MANGAL offline voice synthesis configured.",
            speechRate = _speechRate.value,
            pitch = _pitch.value
        )
    }

    fun setUnloadWhenBackgrounded(enabled: Boolean) {
        _unloadWhenBackgrounded.value = enabled
        lifecycleObserver.unloadOnBackgroundEnabled = enabled
    }
}
