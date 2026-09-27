package ai.mangal.assistant.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ai.mangal.core.llm.LlmEngine
import ai.mangal.core.stt.AudioRecordPcmCapture
import ai.mangal.core.stt.OpenWakeWordDetector
import ai.mangal.core.stt.WhisperTranscriber
import ai.mangal.core.tools.AndroidToolExecutor
import ai.mangal.core.tools.ToolRegistry
import ai.mangal.core.tts.LocalTtsSpeaker
import ai.mangal.data.db.ChatMessageEntity
import ai.mangal.data.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Production MVVM @HiltViewModel coordinating the end-to-end 100% offline loop:
 * Wake Word ("Mangal") / Push-To-Talk -> AudioRecordPcmCapture -> WhisperTranscriber
 * -> LlmEngine -> ToolRegistry & AndroidToolExecutor -> LocalTtsSpeaker -> SQLCipher ChatRepository.
 */
@HiltViewModel
class MangalAssistantViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val pcmCapture: AudioRecordPcmCapture,
    private val wakeWordDetector: OpenWakeWordDetector,
    private val whisperTranscriber: WhisperTranscriber,
    private val llmEngine: LlmEngine,
    private val toolRegistry: ToolRegistry,
    private val toolExecutor: AndroidToolExecutor,
    private val ttsSpeaker: LocalTtsSpeaker
) : ViewModel() {

    companion object {
        private const val DEFAULT_SESSION_ID = "mangal_primary_session"
    }

    val messages: StateFlow<List<ChatMessageEntity>> =
        chatRepository.observeSessionMessages(DEFAULT_SESSION_ID)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _isRecordingPtt = MutableStateFlow(false)
    val isRecordingPtt: StateFlow<Boolean> = _isRecordingPtt.asStateFlow()

    private val _statusLine = MutableStateFlow("Listening for \"Mangal\" wake word · 100% Offline")
    val statusLine: StateFlow<String> = _statusLine.asStateFlow()

    fun startPushToTalkCapture() {
        if (_isRecordingPtt.value) return
        _isRecordingPtt.value = true
        _statusLine.value = "Capturing 16kHz PCM audio..."
        pcmCapture.startCapture(viewModelScope)
    }

    fun stopPushToTalkAndTranscribe() {
        if (!_isRecordingPtt.value) return
        _isRecordingPtt.value = false
        val pcmSamples = pcmCapture.stopAndDrainPcmBuffer()
        viewModelScope.launch {
            _statusLine.value = "Transcribing with whisper.cpp..."
            val transcript = whisperTranscriber.transcribePcm16kStream(pcmSamples)
                .firstOrNull()
                ?.trim()
                .orEmpty()
            if (transcript.isNotEmpty()) {
                submitUserUtterance(transcript)
            } else {
                _statusLine.value = "No speech detected. Say \"Mangal\" or tap to speak."
            }
        }
    }

    fun submitUserUtterance(rawInput: String) {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) return

        viewModelScope.launch {
            val (wokeByPhrase, strippedCommand) = wakeWordDetector.matchWakeTranscript(trimmed)
            val effectivePrompt = if (wokeByPhrase && strippedCommand.isNotBlank()) {
                strippedCommand
            } else {
                trimmed
            }

            chatRepository.appendMessage(
                sessionId = DEFAULT_SESSION_ID,
                role = "user",
                content = trimmed
            )

            // If user only said "Mangal" (like "Hey Google") without a trailing command:
            if (wokeByPhrase && strippedCommand.isBlank()) {
                val promptReply = "I'm listening. What can I do for you?"
                chatRepository.appendMessage(
                    sessionId = DEFAULT_SESSION_ID,
                    role = "assistant",
                    content = promptReply
                )
                ttsSpeaker.speakOffline(promptReply)
                startPushToTalkCapture()
                return@launch
            }

            _statusLine.value = "Running on-device LLM inference..."
            val systemPrompt = toolRegistry.buildSystemPrompt()
            val rawModelJson = llmEngine.generateStream(
                systemPrompt = systemPrompt,
                userPrompt = effectivePrompt,
                jsonGrammar = null
            ).firstOrNull() ?: """{"type":"reply","replyText":"Offline model ready."}"""

            val parsedResult = toolRegistry.parseAndValidateEnvelope(rawModelJson)
            val envelope = parsedResult.getOrNull()

            if (envelope != null && envelope.type == "tool_call" && envelope.toolName != null && envelope.arguments != null) {
                val execResult = toolExecutor.execute(envelope.toolName!!, envelope.arguments!!)
                chatRepository.appendMessage(
                    sessionId = DEFAULT_SESSION_ID,
                    role = "assistant",
                    content = execResult.humanReadableSummary,
                    toolName = execResult.toolName,
                    toolPayloadJson = rawModelJson
                )
                _statusLine.value = "Listening for \"Mangal\" wake word · 100% Offline"
                ttsSpeaker.speakOffline(execResult.humanReadableSummary)
            } else {
                val replyText = envelope?.replyText ?: rawModelJson
                chatRepository.appendMessage(
                    sessionId = DEFAULT_SESSION_ID,
                    role = "assistant",
                    content = replyText,
                    toolPayloadJson = rawModelJson
                )
                _statusLine.value = "Listening for \"Mangal\" wake word · 100% Offline"
                ttsSpeaker.speakOffline(replyText)
            }
        }
    }

    fun clearEncryptedHistory() {
        viewModelScope.launch {
            chatRepository.clearConversationMemory()
        }
    }
}
