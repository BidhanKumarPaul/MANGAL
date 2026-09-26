package ai.mangal.assistant.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ai.mangal.assistant.permissions.MangalPermissionGroup
import ai.mangal.assistant.permissions.PermissionGatekeeper

@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    var speechRate by remember { mutableFloatStateOf(1.0f) }
    var pitch by remember { mutableFloatStateOf(1.0f) }
    var unloadWhenBackgrounded by remember { mutableStateOf(true) }

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

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "Settings, TTS & Privacy Policy",
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = "100% Offline Guarantee · SQLCipher AES-256 · Zero Telemetry",
                style = MaterialTheme.typography.bodySmall
            )

            Column {
                Text(
                    text = "Native TTS Speech Rate: ${"%.2f".format(speechRate)}x",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = speechRate,
                    onValueChange = { speechRate = it },
                    valueRange = 0.5f..2.0f
                )
            }

            Column {
                Text(
                    text = "Native TTS Pitch: ${"%.2f".format(pitch)}x",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = pitch,
                    onValueChange = { pitch = it },
                    valueRange = 0.5f..1.5f
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Unload GGUF Model When Backgrounded (Thermal/Battery Guard)",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.weight(1f)
                )
                Switch(
                    checked = unloadWhenBackgrounded,
                    onCheckedChange = { unloadWhenBackgrounded = it }
                )
            }

            MangalPermissionGroup.entries.forEach { group ->
                val isGranted = grantStates[group] == true
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = group.title, style = MaterialTheme.typography.titleSmall)
                        Text(text = group.rationale, style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedButton(
                        onClick = {
                            activeGroupPending = group
                            launcher.launch(group.androidPermissions.toTypedArray())
                        },
                        enabled = !isGranted
                    ) {
                        Text(if (isGranted) "Granted" else "Request")
                    }
                }
            }
        }
    }
}
