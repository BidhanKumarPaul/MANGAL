package ai.mangal.assistant.ui.chat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import ai.mangal.assistant.permissions.MangalPermissionGroup
import ai.mangal.assistant.permissions.PermissionGatekeeper
import ai.mangal.assistant.service.MangalWakeWordForegroundService
import ai.mangal.assistant.ui.components.MangalBrandLogo

@Composable
fun VoiceChatScreen(
    viewModel: MangalAssistantViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val messages by viewModel.messages.collectAsState()
    val isRecordingPtt by viewModel.isRecordingPtt.collectAsState()
    val statusLine by viewModel.statusLine.collectAsState()

    var micGranted by remember {
        mutableStateOf(PermissionGatekeeper.isGroupGranted(context, MangalPermissionGroup.MICROPHONE))
    }
    var wakeWordActive by remember { mutableStateOf(true) }
    var textDraft by remember { mutableStateOf("") }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        micGranted = result.values.all { it }
    }

    // Listen for ACTION_WAKE_WORD_DETECTED broadcast from MangalWakeWordForegroundService
    DisposableEffect(context, micGranted) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                if (intent?.action == MangalWakeWordForegroundService.ACTION_WAKE_WORD_DETECTED) {
                    viewModel.startPushToTalkCapture()
                }
            }
        }
        val filter = IntentFilter(MangalWakeWordForegroundService.ACTION_WAKE_WORD_DETECTED)
        ContextCompat.registerReceiver(
            context,
            receiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        onDispose {
            context.unregisterReceiver(receiver)
        }
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
                    MangalBrandLogo(
                        size = 44.dp,
                        isPulsingWake = (wakeWordActive && micGranted) || isRecordingPtt
                    )
                    Column {
                        Text(
                            text = "MANGAL · Hands-Free Voice AI",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = statusLine,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
                OutlinedButton(onClick = { viewModel.clearEncryptedHistory() }) {
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
                items(messages, key = { it.id }) { msg ->
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = if (msg.role == "user") "YOU" else "MANGAL",
                            style = MaterialTheme.typography.labelSmall
                        )
                        if (!msg.toolPayloadJson.isNullOrBlank()) {
                            Text(
                                text = "Tool Schema JSON: ${msg.toolPayloadJson}",
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
                                viewModel.submitUserUtterance(input)
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
                        onClick = {
                            if (isRecordingPtt) {
                                viewModel.stopPushToTalkAndTranscribe()
                            } else {
                                viewModel.startPushToTalkCapture()
                            }
                        },
                        enabled = micGranted,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            if (isRecordingPtt) {
                                "Stop & Transcribe (whisper.cpp)"
                            } else {
                                "Tap to Speak (Whisper STT)"
                            }
                        )
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
                            if (wakeWordActive) {
                                ContextCompat.startForegroundService(context, serviceIntent)
                            } else {
                                context.startService(serviceIntent)
                            }
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
