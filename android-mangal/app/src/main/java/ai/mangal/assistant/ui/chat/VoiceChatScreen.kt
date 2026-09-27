package ai.mangal.assistant.ui.chat

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import ai.mangal.assistant.permissions.MangalPermissionGroup
import ai.mangal.assistant.permissions.PermissionGatekeeper
import ai.mangal.assistant.service.MangalWakeWordForegroundService
import ai.mangal.assistant.speech.VoiceListenPhase
import ai.mangal.assistant.ui.components.MangalBrandLogo
import ai.mangal.assistant.ui.theme.MangalAmberLight
import ai.mangal.assistant.ui.theme.MangalAmberPrimary
import ai.mangal.assistant.ui.theme.MangalCardBorder
import ai.mangal.assistant.ui.theme.MangalCardSurface
import ai.mangal.assistant.ui.theme.MangalEmeraldAccent
import ai.mangal.assistant.ui.theme.MangalObsidianBg
import ai.mangal.assistant.ui.theme.MangalRoseDanger
import ai.mangal.assistant.ui.theme.MangalTextPrimary
import ai.mangal.assistant.ui.theme.MangalTextSecondary

@Composable
fun VoiceChatScreen(
    onOpenModelsTab: () -> Unit = {},
    onOpenCustomModelTab: () -> Unit = {},
    viewModel: MangalAssistantViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val messages by viewModel.messages.collectAsState()
    val listenPhase by viewModel.listenPhase.collectAsState()
    val livePartialText by viewModel.livePartialText.collectAsState()
    val rmsLevel by viewModel.rmsLevel.collectAsState()
    val handsFreeEnabled by viewModel.handsFreeEnabled.collectAsState()
    val activeModelName by viewModel.activeModelName.collectAsState()
    val statusLine by viewModel.statusLine.collectAsState()

    var micGranted by remember {
        mutableStateOf(PermissionGatekeeper.isGroupGranted(context, MangalPermissionGroup.MICROPHONE))
    }
    var textDraft by remember { mutableStateOf("") }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        micGranted = result.values.all { it }
        if (micGranted) {
            viewModel.onMicPermissionReady()
            try {
                val serviceIntent = Intent(context, MangalWakeWordForegroundService::class.java).apply {
                    action = MangalWakeWordForegroundService.ACTION_START_WAKE_LISTENING
                }
                ContextCompat.startForegroundService(context, serviceIntent)
            } catch (_: Exception) {
            }
        }
    }

    // Automatically start listening as soon as VoiceChatScreen opens!
    LaunchedEffect(micGranted) {
        if (micGranted) {
            viewModel.onMicPermissionReady()
            try {
                val serviceIntent = Intent(context, MangalWakeWordForegroundService::class.java).apply {
                    action = MangalWakeWordForegroundService.ACTION_START_WAKE_LISTENING
                }
                ContextCompat.startForegroundService(context, serviceIntent)
            } catch (_: Exception) {
            }
        } else {
            micPermissionLauncher.launch(
                MangalPermissionGroup.MICROPHONE.androidPermissions.toTypedArray()
            )
        }
    }

    val isActivelyCapturing = listenPhase == VoiceListenPhase.DIRECT_PTT_LISTENING ||
        listenPhase == VoiceListenPhase.WAKE_TRIGGERED_AWAITING_COMMAND

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MangalObsidianBg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. TOP HEADER CARD (Brand Logo + Active Model + Clear Button)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                border = BorderStroke(
                    1.dp,
                    if (isActivelyCapturing) MangalAmberPrimary else MangalCardBorder
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            MangalBrandLogo(
                                size = 46.dp,
                                isPulsingWake = isActivelyCapturing || (handsFreeEnabled && micGranted),
                                isWakeTriggeredListening = isActivelyCapturing,
                                rmsLevel = rmsLevel
                            )
                            Column {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = "MANGAL",
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = MangalTextPrimary
                                    )
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(Color(0xFF062E22))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "100% OFFLINE",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MangalEmeraldAccent
                                        )
                                    }
                                }
                                Text(
                                    text = statusLine,
                                    fontSize = 11.sp,
                                    color = if (isActivelyCapturing) MangalAmberLight else MangalTextSecondary
                                )
                            }
                        }

                        OutlinedButton(
                            onClick = { viewModel.clearEncryptedHistory() },
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, MangalCardBorder)
                        ) {
                            Text("Clear", fontSize = 11.sp, color = MangalTextSecondary)
                        }
                    }

                    // Active Model Bar + Quick Jump to Models / Custom Model
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF080B11))
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Engine: $activeModelName",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = MangalTextSecondary,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "+ Custom GGUF",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MangalAmberPrimary,
                            modifier = Modifier.clickable { onOpenCustomModelTab() }
                        )
                    }

                    // Live Voice Acoustic Level & Partial Speech Transcript Pill
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isActivelyCapturing) Color(0xFF291D0A) else Color(0xFF0D131F)
                            )
                            .padding(horizontal = 12.dp, vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(9.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when {
                                            !micGranted -> MangalRoseDanger
                                            isActivelyCapturing -> MangalAmberPrimary
                                            handsFreeEnabled -> MangalEmeraldAccent
                                            else -> MangalTextSecondary
                                        }
                                    )
                            )
                            Text(
                                text = when {
                                    !micGranted -> "Microphone permission needed — Tap Grant below"
                                    livePartialText.isNotBlank() -> "Hearing: \"$livePartialText\""
                                    isActivelyCapturing -> "Speak your command now..."
                                    handsFreeEnabled -> "Say \"Mangal, turn on the flashlight\" or Tap Mic"
                                    else -> "Wake word paused — Tap Mic button below to speak"
                                },
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = if (livePartialText.isNotBlank()) MangalAmberLight else MangalTextPrimary
                            )
                        }

                        // Mini Live Audio Bar Indicator
                        Text(
                            text = "LVL ${(rmsLevel * 100).toInt()}%",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = MangalAmberPrimary
                        )
                    }
                }
            }

            // 2. QUICK 1-TAP VOICE COMMAND CHIPS
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    "Flashlight ON" to "Mangal, turn on the flashlight",
                    "Flashlight OFF" to "Mangal, turn off the flashlight",
                    "Alarm 6:30 AM" to "Mangal, set an alarm for 6:30 AM",
                    "5m Timer" to "Mangal, set a timer for 5 minutes",
                    "Volume Up" to "Mangal, turn volume up",
                    "Open YouTube" to "Mangal, open YouTube"
                ).forEach { (label, command) ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(MangalCardSurface)
                            .clickable {
                                viewModel.submitUserUtterance(command, triggeredByWakeWord = true)
                            }
                            .padding(horizontal = 12.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MangalAmberLight
                        )
                    }
                }
            }

            // 3. CONVERSATION & TOOL EXECUTION CARDS
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (messages.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                            border = BorderStroke(1.dp, MangalCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "MANGAL Hands-Free Voice Assistant Ready",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MangalAmberPrimary
                                )
                                Text(
                                    text = "• Say \"Mangal, turn on the flashlight\" or tap the big Amber Mic button below.\n• All 6 hardware tools (Flashlight, Alarms, Timers, Volume, Open Apps, SMS/Calls) work immediately offline.\n• Want to run a custom GGUF model? Tap 'Custom GGUF' on the bottom bar to pick any .gguf file from your phone.",
                                    fontSize = 12.sp,
                                    color = MangalTextSecondary,
                                    lineHeight = 18.sp
                                )
                            }
                        }
                    }
                }

                items(messages, key = { it.id }) { msg ->
                    val isUser = msg.role == "user"
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                start = if (isUser) 28.dp else 0.dp,
                                end = if (isUser) 0.dp else 16.dp
                            ),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isUser) Color(0xFF1E293B) else MangalCardSurface
                        ),
                        border = BorderStroke(
                            1.dp,
                            if (isUser) Color(0xFF334155) else MangalCardBorder
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = if (isUser) "YOU" else "MANGAL (ON-DEVICE)",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isUser) MangalAmberLight else MangalEmeraldAccent
                                )
                                val toolName = msg.toolName
                                if (!toolName.isNullOrBlank()) {
                                    Text(
                                        text = "TOOL: $toolName",
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = MangalAmberPrimary
                                    )
                                }
                            }

                            val toolPayload = msg.toolPayloadJson
                            if (!toolPayload.isNullOrBlank()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFF070A0F))
                                        .padding(8.dp)
                                ) {
                                    Text(
                                        text = toolPayload.orEmpty(),
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = MangalTextSecondary
                                    )
                                }
                            }

                            Text(
                                text = msg.content,
                                fontSize = 13.sp,
                                color = MangalTextPrimary,
                                lineHeight = 19.sp
                            )
                        }
                    }
                }
            }

            // 4. BOTTOM CONTROLS (Permission Prompt, Text Input & Prominent Voice Buttons)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!micGranted) {
                    Button(
                        onClick = {
                            micPermissionLauncher.launch(
                                MangalPermissionGroup.MICROPHONE.androidPermissions.toTypedArray()
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MangalAmberPrimary,
                            contentColor = Color(0xFF090D14)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            "Grant Microphone Permission for 'Mangal' Voice Control",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = textDraft,
                        onValueChange = { textDraft = it },
                        modifier = Modifier.weight(1f),
                        placeholder = {
                            Text(
                                "Type \"turn on flashlight\" or \"set alarm 7 AM\"...",
                                fontSize = 12.sp,
                                color = MangalTextSecondary
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MangalAmberPrimary,
                            unfocusedBorderColor = MangalCardBorder,
                            focusedTextColor = MangalTextPrimary,
                            unfocusedTextColor = MangalTextPrimary
                        )
                    )
                    Button(
                        onClick = {
                            if (textDraft.isNotBlank()) {
                                val input = textDraft
                                textDraft = ""
                                viewModel.submitUserUtterance(input, triggeredByWakeWord = false)
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MangalAmberPrimary,
                            contentColor = Color(0xFF090D14)
                        ),
                        modifier = Modifier.height(52.dp)
                    ) {
                        Text("Send", fontWeight = FontWeight.Bold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.triggerTapToSpeak() },
                        enabled = micGranted,
                        modifier = Modifier
                            .weight(1.3f)
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isActivelyCapturing) MangalRoseDanger else MangalAmberPrimary,
                            contentColor = if (isActivelyCapturing) Color.White else Color(0xFF090D14)
                        )
                    ) {
                        Text(
                            text = if (isActivelyCapturing) "Listening Now... Speak!" else "Tap Mic to Speak",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    OutlinedButton(
                        onClick = {
                            val next = !handsFreeEnabled
                            viewModel.toggleHandsFreeWakeWord(next)
                        },
                        enabled = micGranted,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(
                            1.dp,
                            if (handsFreeEnabled) MangalEmeraldAccent else MangalCardBorder
                        )
                    ) {
                        Text(
                            text = if (handsFreeEnabled) "\"Mangal\" Wake: ON" else "\"Mangal\" Wake: OFF",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (handsFreeEnabled) MangalEmeraldAccent else MangalTextSecondary
                        )
                    }
                }
            }
        }
    }
}
