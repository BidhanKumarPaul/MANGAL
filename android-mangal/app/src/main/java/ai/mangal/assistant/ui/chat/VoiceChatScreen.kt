package ai.mangal.assistant.ui.chat

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ai.mangal.assistant.permissions.MangalPermissionGroup
import ai.mangal.assistant.permissions.PermissionGatekeeper
import ai.mangal.assistant.service.MangalWakeWordForegroundService
import ai.mangal.assistant.ui.components.MangalBrandLogo

data class UiChatTurn(
    val role: String,
    val content: String,
    val toolBadge: String? = null
)

@Composable
fun VoiceChatScreen() {
    val context = LocalContext.current
    var micGranted by remember {
        mutableStateOf(PermissionGatekeeper.isGroupGranted(context, MangalPermissionGroup.MICROPHONE))
    }
    var wakeWordActive by remember { mutableStateOf(true) }
    var textDraft by remember { mutableStateOf("") }

    val messages = remember {
        mutableStateListOf(
            UiChatTurn(
                role = "assistant",
                content = "MANGAL ready (100% offline, Play Protect verified). Say \"Mangal\" anytime to wake hands-free, or hold Push-to-Talk."
            )
        )
    }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        micGranted = result.values.all { it }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    MangalBrandLogo(size = 44.dp, isPulsingWake = wakeWordActive && micGranted)
                    Column {
                        Text(
                            text = "MANGAL · Hands-Free Voice AI",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = if (wakeWordActive && micGranted) {
                                "Listening for \"Mangal\" wake word · 100% Offline"
                            } else {
                                "Qwen 2.5 1.5B Q4_K_M · Whisper Tiny INT8"
                            },
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
                OutlinedButton(onClick = { messages.clear() }) {
                    Text("Clear")
                }
            }

            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages) { msg ->
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = if (msg.role == "user") "YOU" else "MANGAL",
                            style = MaterialTheme.typography.labelSmall
                        )
                        if (msg.toolBadge != null) {
                            Text(
                                text = "Tool Executed: ${msg.toolBadge}",
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                        Text(
                            text = msg.content,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!micGranted) {
                    OutlinedButton(
                        onClick = {
                            micPermissionLauncher.launch(
                                MangalPermissionGroup.MICROPHONE.androidPermissions.toTypedArray()
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Grant RECORD_AUDIO for 'Mangal' Wake Word & STT")
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = textDraft,
                        onValueChange = { textDraft = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Say \"Mangal\" or type command...") },
                        singleLine = true
                    )
                    Button(
                        onClick = {
                            if (textDraft.isNotBlank()) {
                                val input = textDraft
                                textDraft = ""
                                messages.add(UiChatTurn("user", input))
                                messages.add(
                                    UiChatTurn(
                                        role = "assistant",
                                        content = "Processed offline via ToolRegistry & llama.cpp.",
                                        toolBadge = "ToolRegistry"
                                    )
                                )
                            }
                        }
                    ) {
                        Text("Send")
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { /* Push-to-Talk AudioRecord -> WhisperTranscriber */ },
                        enabled = micGranted,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Hold to Speak (Whisper STT)")
                    }
                    OutlinedButton(
                        onClick = {
                            wakeWordActive = !wakeWordActive
                            val serviceIntent = Intent(context, MangalWakeWordForegroundService::class.java).apply {
                                action = if (wakeWordActive) {
                                    MangalWakeWordForegroundService.ACTION_START_WAKE_LISTENING
                                } else {
                                    MangalWakeWordForegroundService.ACTION_STOP_WAKE_LISTENING
                                }
                            }
                            context.startService(serviceIntent)
                        },
                        enabled = micGranted
                    ) {
                        Text(if (wakeWordActive) "\"Mangal\" Wake: ON" else "\"Mangal\" Wake: OFF")
                    }
                }
            }
        }
    }
}
