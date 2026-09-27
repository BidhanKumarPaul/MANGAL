package ai.mangal.assistant.ui.models

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
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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

@Composable
fun ModelManagerScreen(
    onOpenCustomModelTab: () -> Unit = {},
    viewModel: ModelManagerViewModel = hiltViewModel()
) {
    // Default Wi-Fi-Only guard to false so mobile data users can download without being silently blocked
    var wifiOnlyGuard by remember { mutableStateOf(false) }
    val models by viewModel.models.collectAsState()
    val progressMap by viewModel.progressMap.collectAsState()
    val statusBanner by viewModel.statusBanner.collectAsState()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MangalObsidianBg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                border = BorderStroke(1.dp, MangalCardBorder)
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
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Offline AI Model Manager",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MangalTextPrimary
                            )
                            Text(
                                text = "Resumable HTTP Range downloads with live progress bar & SHA-256 verification.",
                                fontSize = 11.sp,
                                color = MangalTextSecondary
                            )
                        }
                        Button(
                            onClick = onOpenCustomModelTab,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MangalAmberPrimary,
                                contentColor = Color(0xFF090D14)
                            )
                        ) {
                            Text("+ Custom Model", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Restrict Downloads to Wi-Fi Only",
                            fontSize = 12.sp,
                            color = MangalTextPrimary
                        )
                        Switch(
                            checked = wifiOnlyGuard,
                            onCheckedChange = { wifiOnlyGuard = it }
                        )
                    }

                    statusBanner?.let { msg ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF23190B))
                                .padding(horizontal = 10.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = msg,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = MangalAmberLight
                            )
                        }
                    }
                }
            }

            // Models List with Real-Time Progress Bars
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(models, key = { it.modelId }) { model ->
                    val prog = progressMap[model.modelId]
                    val isDownloading = prog?.status == DownloadStatus.DOWNLOADING ||
                        prog?.status == DownloadStatus.CONNECTING ||
                        prog?.status == DownloadStatus.VERIFYING_CHECKSUM
                    val isDownloaded = !model.localFilePath.isNullOrBlank() ||
                        prog?.status == DownloadStatus.COMPLETED

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MangalCardSurface),
                        border = BorderStroke(
                            1.dp,
                            when {
                                model.isActive -> MangalEmeraldAccent
                                isDownloading -> MangalAmberPrimary
                                else -> MangalCardBorder
                            }
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = model.displayName,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MangalTextPrimary,
                                    modifier = Modifier.weight(1f)
                                )

                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(
                                            when {
                                                model.isActive -> Color(0xFF062E22)
                                                isDownloading -> Color(0xFF291D0A)
                                                isDownloaded -> Color(0xFF1E293B)
                                                else -> Color(0xFF090D14)
                                            }
                                        )
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = when {
                                            model.isActive -> "ACTIVE"
                                            prog?.status == DownloadStatus.CONNECTING -> "CONNECTING..."
                                            prog?.status == DownloadStatus.DOWNLOADING -> "DOWNLOADING ${prog.percentInt}%"
                                            prog?.status == DownloadStatus.VERIFYING_CHECKSUM -> "VERIFYING SHA-256..."
                                            prog?.status == DownloadStatus.PAUSED -> "PAUSED"
                                            prog?.status == DownloadStatus.FAILED -> "FAILED"
                                            isDownloaded -> "DOWNLOADED"
                                            else -> "NOT DOWNLOADED"
                                        },
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold,
                                        color = when {
                                            model.isActive -> MangalEmeraldAccent
                                            isDownloading -> MangalAmberPrimary
                                            prog?.status == DownloadStatus.FAILED -> MangalRoseDanger
                                            else -> MangalTextSecondary
                                        }
                                    )
                                }
                            }

                            Text(
                                text = "${model.category} · ${model.quantization} · ${model.fileSizeBytes / (1024 * 1024)} MB · Min ${model.requiredRamMb} MB RAM",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = MangalTextSecondary
                            )

                            // LIVE PROGRESS BAR & SPEED COUNTER
                            if (prog != null && prog.status != DownloadStatus.IDLE) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    LinearProgressIndicator(
                                        progress = { prog.progressFraction },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(4.dp)),
                                        color = if (prog.status == DownloadStatus.FAILED) MangalRoseDanger else MangalAmberPrimary,
                                        trackColor = Color(0xFF080B11)
                                    )

                                    val dlMb = "%.1f".format(prog.bytesDownloaded / (1024.0 * 1024.0))
                                    val totMb = "%.1f".format(prog.totalBytes / (1024.0 * 1024.0))
                                    val speedMb = "%.2f".format(prog.speedBytesPerSec / (1024.0 * 1024.0))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "$dlMb MB / $totMb MB (${prog.percentInt}%)",
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace,
                                            color = MangalAmberLight
                                        )
                                        Text(
                                            text = if (isDownloading) "$speedMb MB/s" else prog.status.name,
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace,
                                            color = MangalTextSecondary
                                        )
                                    }

                                    prog.errorMessage?.let { errText ->
                                        Text(
                                            text = errText,
                                            fontSize = 11.sp,
                                            color = MangalRoseDanger
                                        )
                                    }
                                }
                            }

                            // Action Buttons
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                if (isDownloading) {
                                    Button(
                                        onClick = { viewModel.pauseDownload(model.modelId) },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MangalRoseDanger,
                                            contentColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Pause / Cancel", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                } else {
                                    Button(
                                        onClick = {
                                            viewModel.downloadOrActivate(model, wifiOnlyGuard)
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (model.isActive) MangalEmeraldAccent else MangalAmberPrimary,
                                            contentColor = Color(0xFF090D14)
                                        ),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = when {
                                                model.isActive -> "Active in Engine"
                                                isDownloaded -> "Activate Model"
                                                prog?.status == DownloadStatus.PAUSED || prog?.status == DownloadStatus.FAILED -> "Resume Download"
                                                else -> "Download (${model.fileSizeBytes / (1024 * 1024)} MB)"
                                            },
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                if (isDownloaded || prog?.status == DownloadStatus.PAUSED || prog?.status == DownloadStatus.FAILED) {
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
}
