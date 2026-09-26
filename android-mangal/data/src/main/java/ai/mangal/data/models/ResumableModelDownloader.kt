package ai.mangal.data.models

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import ai.mangal.data.db.LocalModelEntity
import ai.mangal.data.db.ModelDao
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

data class DownloadProgress(
    val modelId: String,
    val bytesDownloaded: Long,
    val totalBytes: Long,
    val status: DownloadStatus,
    val errorMessage: String? = null
)

enum class DownloadStatus {
    IDLE,
    DOWNLOADING,
    VERIFYING_CHECKSUM,
    COMPLETED,
    PAUSED,
    FAILED
}

@Singleton
class ResumableModelDownloader @Inject constructor(
    @ApplicationContext private val context: Context,
    private val modelDao: ModelDao
) {
    private val _progressMap = MutableStateFlow<Map<String, DownloadProgress>>(emptyMap())
    val progressMap: StateFlow<Map<String, DownloadProgress>> = _progressMap.asStateFlow()

    fun observeCatalog(): Flow<List<LocalModelEntity>> = modelDao.observeAllModels()

    suspend fun seedCatalogIfEmpty(existingCount: Int) {
        if (existingCount == 0) {
            RecommendedModelCatalog.ALL_MODELS.forEach { model ->
                modelDao.upsertModel(model)
            }
        }
    }

    fun isUnmeteredWifiConnected(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    suspend fun downloadModelWithResume(
        model: LocalModelEntity,
        requireWifiOnly: Boolean = true
    ): Result<File> = withContext(Dispatchers.IO) {
        if (requireWifiOnly && !isUnmeteredWifiConnected()) {
            updateState(
                model.modelId,
                0L,
                model.fileSizeBytes,
                DownloadStatus.FAILED,
                "Wi-Fi required for large model downloads. Connect to Wi-Fi or disable Wi-Fi-only guard."
            )
            return@withContext Result.failure(IllegalStateException("Unmetered Wi-Fi not connected"))
        }

        val downloadUrl = RecommendedModelCatalog.DOWNLOAD_URLS[model.modelId]
            ?: return@withContext Result.failure(IllegalArgumentException("Unknown modelId: ${model.modelId}"))

        val modelsDir = File(context.filesDir, "models").apply { mkdirs() }
        val partFile = File(modelsDir, "${model.modelId}.part")
        val finalFile = File(modelsDir, "${model.modelId}.bin")

        var downloadedBytes = if (partFile.exists()) partFile.length() else 0L
        updateState(model.modelId, downloadedBytes, model.fileSizeBytes, DownloadStatus.DOWNLOADING)

        try {
            val connection = (URL(downloadUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 15_000
                readTimeout = 30_000
                if (downloadedBytes > 0) {
                    setRequestProperty("Range", "bytes=$downloadedBytes-")
                }
            }
            connection.connect()

            val responseCode = connection.responseCode
            if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_PARTIAL) {
                throw IllegalStateException("HTTP error $responseCode during model download")
            }

            RandomAccessFile(partFile, "rw").use { raf ->
                if (responseCode == HttpURLConnection.HTTP_PARTIAL) {
                    raf.seek(downloadedBytes)
                } else {
                    raf.setLength(0)
                    downloadedBytes = 0L
                }

                connection.inputStream.use { input ->
                    val buffer = ByteArray(64 * 1024)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        raf.write(buffer, 0, bytesRead)
                        downloadedBytes += bytesRead
                        updateState(
                            model.modelId,
                            downloadedBytes,
                            model.fileSizeBytes,
                            DownloadStatus.DOWNLOADING
                        )
                    }
                }
            }

            updateState(
                model.modelId,
                downloadedBytes,
                model.fileSizeBytes,
                DownloadStatus.VERIFYING_CHECKSUM
            )

            val actualSha256 = computeSha256(partFile)
            if (!actualSha256.equals(model.sha256Checksum, ignoreCase = true)) {
                partFile.delete()
                updateState(
                    model.modelId,
                    0L,
                    model.fileSizeBytes,
                    DownloadStatus.FAILED,
                    "SHA-256 mismatch: expected ${model.sha256Checksum.take(12)}, got ${actualSha256.take(12)}"
                )
                return@withContext Result.failure(SecurityException("SHA-256 checksum verification failed"))
            }

            if (finalFile.exists()) finalFile.delete()
            partFile.renameTo(finalFile)
            // Play Protect Dynamic Code Loading (DCL) Hardening:
            // Mark downloaded model weight files strictly non-executable and read-only.
            finalFile.setExecutable(false, false)
            finalFile.setWritable(false, false)
            finalFile.setReadable(true, true)

            modelDao.upsertModel(model.copy(localFilePath = finalFile.absolutePath))
            updateState(
                model.modelId,
                model.fileSizeBytes,
                model.fileSizeBytes,
                DownloadStatus.COMPLETED
            )
            Result.success(finalFile)
        } catch (e: Exception) {
            updateState(
                model.modelId,
                downloadedBytes,
                model.fileSizeBytes,
                DownloadStatus.PAUSED,
                e.message ?: "Download interrupted (resumable)"
            )
            Result.failure(e)
        }
    }

    suspend fun deleteModelFile(model: LocalModelEntity) = withContext(Dispatchers.IO) {
        model.localFilePath?.let { path ->
            File(path).delete()
        }
        val modelsDir = File(context.filesDir, "models")
        File(modelsDir, "${model.modelId}.part").delete()
        modelDao.upsertModel(model.copy(localFilePath = null, isActive = false))
        updateState(model.modelId, 0L, model.fileSizeBytes, DownloadStatus.IDLE)
    }

    private fun computeSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { fis ->
            val buffer = ByteArray(64 * 1024)
            var read: Int
            while (fis.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun updateState(
        modelId: String,
        downloaded: Long,
        total: Long,
        status: DownloadStatus,
        error: String? = null
    ) {
        val next = _progressMap.value.toMutableMap()
        next[modelId] = DownloadProgress(modelId, downloaded, total, status, error)
        _progressMap.value = next
    }
}
