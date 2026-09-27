package ai.mangal.assistant.ui.custom

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ai.mangal.assistant.ui.models.ModelManagerViewModel
import ai.mangal.assistant.ui.theme.MangalAmberLight
import ai.mangal.assistant.ui.theme.MangalAmberPrimary
import ai.mangal.assistant.ui.theme.MangalCardBorder
import ai.mangal.assistant.ui.theme.MangalCardSurface
import ai.mangal.assistant.ui.theme.MangalEmeraldAccent
import ai.mangal.assistant.ui.theme.MangalObsidianBg
import ai.mangal.assistant.ui.theme.MangalRoseDanger
import ai.mangal.assistant.ui.theme.MangalTextPrimary
import ai.mangal.assistant.ui.theme.MangalTextSecondary
import ai.mangal.data.models.DownloadStatus

/**
 * Dedicated Custom Model Section:
 * 1. Select any local .gguf / .bin model file from Phone Storage / Downloads via Android SAF File Picker
 * 2. Or paste any custom direct .gguf / Hugging Face URL to download with a live progress bar
 */
@Composable
fun CustomModelScreen(
    viewModel: ModelManagerViewModel = hiltViewModel()
) {
    val models by viewModel.models.collectAsState()
    val progressMap by viewModel.progressMap.collectAsState()
    val statusBanner by viewModel.statusBanner.collectAsState()

    var customDisplayName by remember { mutableStateOf("") }
    var customDirectUrl by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("LLM_GGUF") }

    val customModels = models.filter {
        it.modelId.startsWith("custom_") || it.quantization == "CUSTOM"
    }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) {
            viewModel.importCustomFileFromDevice(
                uri = uri,
                customName = customDisplayName.takeIf { it.isNotBlank() },
                category = selectedCategory
            )
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
            // Top Status & Title Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                    border = BorderStroke(1.dp, MangalAmberPrimary)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Custom Model Selector (.gguf / .bin)",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MangalTextPrimary
                        )
                        Text(
                            text = "Bring your own GGUF LLM (DeepSeek, Llama 3.2, Qwen, Gemma, Mistral) or Whisper .bin file from phone storage or a custom URL.",
                            fontSize = 12.sp,
                            color = MangalTextSecondary,
                            lineHeight = 17.sp
                        )

                        statusBanner?.let { banner ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFF23190B))
                                    .padding(10.dp)
                            ) {
                                Text(
                                    text = banner,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = MangalAmberLight
                                )
                            }
                        }
                    }
                }
            }

            // Category Selector & Optional Custom Label
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                    border = BorderStroke(1.dp, MangalCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "1. Select Custom Model Type & Optional Name",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MangalAmberPrimary
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                "LLM_GGUF" to "LLM (.gguf)",
                                "STT_WHISPER" to "Whisper STT (.bin)"
                            ).forEach { (catKey, label) ->
                                val active = selectedCategory == catKey
                                Button(
                                    onClick = { selectedCategory = catKey },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (active) MangalAmberPrimary else Color(0xFF080B11),
                                        contentColor = if (active) Color(0xFF090D14) else MangalTextSecondary
                                    )
                                ) {
                                    Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        OutlinedTextField(
                            value = customDisplayName,
                            onValueChange = { customDisplayName = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = {
                                Text(
                                    "Optional Display Name (e.g. DeepSeek R1 1.5B Q4_K_M)",
                                    fontSize = 12.sp,
                                    color = MangalTextSecondary
                                )
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MangalAmberPrimary,
                                unfocusedBorderColor = MangalCardBorder,
                                focusedTextColor = MangalTextPrimary,
                                unfocusedTextColor = MangalTextPrimary
                            )
                        )
                    }
                }
            }

            // Option A: Pick Local .gguf / .bin File from Phone Storage
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                    border = BorderStroke(1.dp, MangalCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "2. Import Local .gguf / .bin File from Phone Storage",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MangalTextPrimary
                        )
                        Text(
                            text = "Pick any .gguf or .bin file from your phone's Downloads folder. MANGAL copies it into encrypted app storage, verifies SHA-256, and activates it immediately.",
                            fontSize = 11.sp,
                            color = MangalTextSecondary
                        )

                        Button(
                            onClick = {
                                filePickerLauncher.launch(arrayOf("*/*"))
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MangalAmberPrimary,
                                contentColor = Color(0xFF090D14)
                            )
                        ) {
                            Text(
                                "Browse Phone Storage for .gguf / .bin File",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            // Option B: Download from Custom Direct URL
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                    border = BorderStroke(1.dp, MangalCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "3. Or Download from Custom Direct HTTPS URL",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MangalTextPrimary
                        )
                        OutlinedTextField(
                            value = customDirectUrl,
                            onValueChange = { customDirectUrl = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = {
                                Text(
                                    "https://huggingface.co/.../resolve/main/model.gguf",
                                    fontSize = 11.sp,
                                    color = MangalTextSecondary
                                )
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MangalAmberPrimary,
                                unfocusedBorderColor = MangalCardBorder,
                                focusedTextColor = MangalTextPrimary,
                                unfocusedTextColor = MangalTextPrimary
                            )
                        )
                        Button(
                            onClick = {
                                if (customDirectUrl.isNotBlank()) {
                                    val label = customDisplayName.ifBlank {
                                        customDirectUrl.substringAfterLast('/').substringBefore('?')
                                    }.ifBlank { "Custom GGUF Model" }
                                    viewModel.downloadCustomModelFromUrl(
                                        displayName = label,
                                        url = customDirectUrl,
                                        category = selectedCategory,
                                        requireWifiOnly = false
                                    )
                                }
                            },
                            enabled = customDirectUrl.startsWith("https://"),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MangalEmeraldAccent,
                                contentColor = Color(0xFF051B11)
                            )
                        ) {
                            Text(
                                "Download & Register Custom URL Model",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            // List of User's Custom Models
            if (customModels.isNotEmpty()) {
                item {
                    Text(
                        text = "Your Imported & Custom Models (${customModels.size})",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MangalAmberLight
                    )
                }

                items(customModels, key = { it.modelId }) { model ->
                    val prog = progressMap[model.modelId]
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                        border = BorderStroke(
                            1.dp,
                            if (model.isActive) MangalEmeraldAccent else MangalCardBorder
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = model.displayName,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MangalTextPrimary
                                )
                                Text(
                                    text = if (model.isActive) "ACTIVE" else "CUSTOM",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = if (model.isActive) MangalEmeraldAccent else MangalAmberPrimary
                                )
                            }
                            Text(
                                text = "${model.fileSizeBytes / (1024 * 1024)} MB · SHA-256: ${model.sha256Checksum.take(12)}…",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = MangalTextSecondary
                            )

                            if (prog != null && prog.status == DownloadStatus.DOWNLOADING) {
                                LinearProgressIndicator(
                                    progress = { prog.progressFraction },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(8.dp)
                                        .clip(RoundedCornerShape(4.dp)),
                                    color = MangalAmberPrimary
                                )
                                Text(
                                    text = "${prog.bytesDownloaded / (1024 * 1024)} MB / ${prog.totalBytes / (1024 * 1024)} MB (${prog.percentInt}%)",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = MangalAmberLight
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { viewModel.downloadOrActivate(model, false) },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (model.isActive) MangalEmeraldAccent else MangalAmberPrimary,
                                        contentColor = Color(0xFF090D14)
                                    ),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(
                                        if (model.isActive) "Active Custom Model" else "Activate Custom Model",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                OutlinedButton(
                                    onClick = { viewModel.deleteModel(model) },
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, MangalCardBorder)
                                ) {
                                    Text("Delete", fontSize = 12.sp, color = MangalRoseDanger)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
