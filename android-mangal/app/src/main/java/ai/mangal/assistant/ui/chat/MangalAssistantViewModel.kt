package ai.mangal.assistant.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ai.mangal.assistant.speech.MangalSpeechListener
import ai.mangal.assistant.speech.VoiceListenPhase
import ai.mangal.core.llm.LlmEngine
import ai.mangal.core.stt.OpenWakeWordDetector
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

@HiltViewModel
class MangalAssistantViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val speechListener: MangalSpeechListener,
    private val wakeWordDetector: OpenWakeWordDetector,
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

    val listenPhase: StateFlow<VoiceListenPhase> = speechListener.phase
    val livePartialText: StateFlow<String> = speechListener.livePartialText
    val rmsLevel: StateFlow<Float> = speechListener.rmsLevel
    val handsFreeEnabled: StateFlow<Boolean> = speechListener.handsFreeEnabled
    val activeModelName: StateFlow<String> = llmEngine.activeModelDisplayName

    private val _statusLine = MutableStateFlow("Hands-Free Active · Say \"Mangal\" or Tap Mic")
    val statusLine: StateFlow<String> = _statusLine.asStateFlow()

    init {
        speechListener.attachCommandCallback { spokenUtterance, wokeByMangal ->
            submitUserUtterance(spokenUtterance, triggeredByWakeWord = wokeByMangal)
        }
    }

    fun onMicPermissionReady() {
        speechListener.ensureListeningIfAllowed()
    }

    fun toggleHandsFreeWakeWord(enabled: Boolean) {
        speechListener.setHandsFreeWakeEnabled(enabled)
        _statusLine.value = if (enabled) {
            "Hands-Free Active · Say \"Mangal\" anytime"
        } else {
            "Hands-Free Paused · Tap Mic to Speak"
        }
    }

    fun triggerTapToSpeak() {
        _statusLine.value = "Listening now... Speak your command"
        speechListener.startDirectCommandListening(fromWakeWord = false)
    }

    fun submitUserUtterance(rawInput: String, triggeredByWakeWord: Boolean = false) {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) return

        viewModelScope.launch {
            val (matchedPrefix, strippedCommand) = wakeWordDetector.matchWakeTranscript(trimmed)
            val wokeByPhrase = triggeredByWakeWord || matchedPrefix
            val effectivePrompt = if (matchedPrefix && strippedCommand.isNotBlank()) {
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
            if (matchedPrefix && strippedCommand.isBlank() || trimmed.equals("mangal", ignoreCase = true)) {
                val promptReply = "Yes? I'm listening. Tell me what to do."
                chatRepository.appendMessage(
                    sessionId = DEFAULT_SESSION_ID,
                    role = "assistant",
                    content = promptReply
                )
                _statusLine.value = "Wake Word \"Mangal\" Triggered · Speak your command now"
                ttsSpeaker.speakOffline(promptReply)
                speechListener.startDirectCommandListening(fromWakeWord = true)
                return@launch
            }

            _statusLine.value = "Executing offline action..."
            val systemPrompt = toolRegistry.buildSystemPrompt()
            val rawModelJson = llmEngine.generateStream(
                systemPrompt = systemPrompt,
                userPrompt = effectivePrompt,
                jsonGrammar = null
            ).firstOrNull() ?: """{"type":"reply","replyText":"Offline model ready."}"""

            val parsedResult = toolRegistry.parseAndValidateEnvelope(rawModelJson)
            val envelope = parsedResult.getOrNull()
            val toolName = envelope?.toolName
            val toolArgs = envelope?.arguments

            if (envelope != null && envelope.type == "tool_call" && toolName != null && toolArgs != null) {
                val execResult = toolExecutor.execute(toolName, toolArgs)
                chatRepository.appendMessage(
                    sessionId = DEFAULT_SESSION_ID,
                    role = "assistant",
                    content = execResult.humanReadableSummary,
                    toolName = execResult.toolName,
                    toolPayloadJson = rawModelJson
                )
                _statusLine.value = if (wokeByPhrase) {
                    "Executed via \"Mangal\" Wake · Listening again"
                } else {
                    "Action Complete · Say \"Mangal\" or Tap Mic"
                }
                ttsSpeaker.speakOffline(execResult.humanReadableSummary)
            } else {
                val replyText = envelope?.replyText ?: rawModelJson
                chatRepository.appendMessage(
                    sessionId = DEFAULT_SESSION_ID,
                    role = "assistant",
                    content = replyText,
                    toolPayloadJson = null
                )
                _statusLine.value = "Hands-Free Active · Say \"Mangal\" or Tap Mic"
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
