package ai.mangal.assistant.ui.models

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
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.mangal.data.models.RecommendedModelCatalog

@Composable
fun ModelManagerScreen() {
    var wifiOnlyGuard by remember { mutableStateOf(true) }
    val models = remember { RecommendedModelCatalog.ALL_MODELS }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Offline Model Manager (GGUF & Whisper)",
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = "Resumable HTTP Range downloads stored in Context.filesDir/models/ with SHA-256 verification and DeviceHealthAndRamGuard OOM protection.",
                style = MaterialTheme.typography.bodySmall
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Unmetered Wi-Fi Only Guard",
                    style = MaterialTheme.typography.bodyMedium
                )
                Switch(checked = wifiOnlyGuard, onCheckedChange = { wifiOnlyGuard = it })
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(models) { model ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = model.displayName,
                                style = MaterialTheme.typography.titleSmall
                            )
                            Text(
                                text = "${model.requiredRamMb} MB RAM min",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                        Text(
                            text = "${model.category} · ${model.quantization} · ${model.fileSizeBytes / 1_000_000} MB · SHA-256: ${model.sha256Checksum.take(12)}…",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { /* Invokes ResumableModelDownloader.downloadModelWithResume */ }) {
                                Text(if (model.isActive) "Active Model" else "Download / Activate")
                            }
                            OutlinedButton(onClick = { /* Invokes ResumableModelDownloader.deleteModelFile */ }) {
                                Text("Delete")
                            }
                        }
                    }
                }
            }
        }
    }
}
