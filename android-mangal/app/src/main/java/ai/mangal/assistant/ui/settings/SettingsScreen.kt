package ai.mangal.assistant.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ai.mangal.assistant.permissions.MangalPermissionGroup
import ai.mangal.assistant.permissions.PermissionGatekeeper
import ai.mangal.assistant.ui.theme.MangalAmberPrimary
import ai.mangal.assistant.ui.theme.MangalCardBorder
import ai.mangal.assistant.ui.theme.MangalCardSurface
import ai.mangal.assistant.ui.theme.MangalEmeraldAccent
import ai.mangal.assistant.ui.theme.MangalObsidianBg
import ai.mangal.assistant.ui.theme.MangalTextPrimary
import ai.mangal.assistant.ui.theme.MangalTextSecondary

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val speechRate by viewModel.speechRate.collectAsState()
    val pitch by viewModel.pitch.collectAsState()
    val unloadWhenBackgrounded by viewModel.unloadWhenBackgrounded.collectAsState()

    val grantStates = remember {
        mutableStateMapOf<MangalPermissionGroup, Boolean>().apply {
            MangalPermissionGroup.entries.forEach { group ->
                put(group, PermissionGatekeeper.isGroupGranted(context, group))
            }
        }
    }

    var activeGroupPending: MangalPermissionGroup? = remember { null }
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        activeGroupPending?.let { group ->
            grantStates[group] = result.values.all { it }
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MangalObsidianBg
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                    border = BorderStroke(1.dp, MangalCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Native TTS Voice & Thermal Guard",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MangalTextPrimary
                        )
                        Text(
                            text = "100% Offline Guarantee · SQLCipher AES-256 · Zero Telemetry",
                            fontSize = 11.sp,
                            color = MangalEmeraldAccent
                        )

                        Column {
                            Text(
                                text = "Speech Rate: ${"%.2f".format(speechRate)}x",
                                fontSize = 13.sp,
                                color = MangalTextPrimary
                            )
                            Slider(
                                value = speechRate,
                                onValueChange = { viewModel.updateSpeechRate(it) },
                                valueRange = 0.5f..2.0f
                            )
                        }

                        Column {
                            Text(
                                text = "Voice Pitch: ${"%.2f".format(pitch)}x",
                                fontSize = 13.sp,
                                color = MangalTextPrimary
                            )
                            Slider(
                                value = pitch,
                                onValueChange = { viewModel.updatePitch(it) },
                                valueRange = 0.5f..1.5f
                            )
                        }

                        Button(
                            onClick = { viewModel.previewTtsVoice() },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MangalAmberPrimary,
                                contentColor = Color(0xFF090D14)
                            )
                        ) {
                            Text("Test Offline TTS Voice Now", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Unload GGUF Model When Backgrounded (Thermal & Battery Saver)",
                                fontSize = 12.sp,
                                color = MangalTextSecondary,
                                modifier = Modifier.weight(1f)
                            )
                            Switch(
                                checked = unloadWhenBackgrounded,
                                onCheckedChange = { viewModel.setUnloadWhenBackgrounded(it) }
                            )
                        }
                    }
                }
            }

            items(MangalPermissionGroup.entries.toList()) { group ->
                val isGranted = grantStates[group] == true
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                    border = BorderStroke(
                        1.dp,
                        if (isGranted) MangalEmeraldAccent else MangalCardBorder
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .padding(end = 10.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = group.title,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MangalTextPrimary
                            )
                            Text(
                                text = group.rationale,
                                fontSize = 11.sp,
                                color = MangalTextSecondary
                            )
                        }
                        OutlinedButton(
                            onClick = {
                                activeGroupPending = group
                                launcher.launch(group.androidPermissions.toTypedArray())
                            },
                            enabled = !isGranted,
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(
                                1.dp,
                                if (isGranted) MangalEmeraldAccent else MangalAmberPrimary
                            )
                        ) {
                            Text(
                                text = if (isGranted) "Granted" else "Grant",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isGranted) MangalEmeraldAccent else MangalAmberPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
