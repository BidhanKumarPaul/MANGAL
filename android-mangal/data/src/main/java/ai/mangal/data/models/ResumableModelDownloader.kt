package ai.mangal.data.models

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.provider.OpenableColumns
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
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

data class DownloadProgress(
    val modelId: String,
    val bytesDownloaded: Long,
    val totalBytes: Long,
    val speedBytesPerSec: Long = 0L,
    val status: DownloadStatus,
    val errorMessage: String? = null
) {
    val progressFraction: Float
        get() = if (totalBytes > 0L) {
            (bytesDownloaded.toDouble() / totalBytes.toDouble()).toFloat().coerceIn(0f, 1f)
        } else {
            0f
        }

    val percentInt: Int
        get() = (progressFraction * 100f).toInt().coerceIn(0, 100)
}

enum class DownloadStatus {
    IDLE,
    CONNECTING,
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

    private val cancelledModelIds = ConcurrentHashMap.newKeySet<String>()

    fun observeCatalog(): Flow<List<LocalModelEntity>> = modelDao.observeAllModels()

    suspend fun seedCatalogIfEmpty(existingCount: Int) {
        val currentCount = if (existingCount > 0) existingCount else modelDao.countModels()
        if (currentCount == 0) {
            RecommendedModelCatalog.ALL_MODELS.forEach { model ->
                modelDao.upsertModel(model)
            }
        }
    }

    fun cancelOrPauseDownload(modelId: String) {
        cancelledModelIds.add(modelId)
    }

    fun isUnmeteredWifiConnected(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    fun isAnyNetworkConnected(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /**
     * Imports a user-selected custom .gguf / .bin / .onnx model file from Android Storage Access Framework (SAF)
     * into app-private Context.filesDir/models/, computes its SHA-256 checksum, locks it read-only for Play Protect,
     * and registers it in Room DB.
     */
    suspend fun importCustomModelFromUri(
        uri: Uri,
        customDisplayName: String?,
        category: String
    ): Result<LocalModelEntity> = withContext(Dispatchers.IO) {
        try {
            val resolvedName = resolveFileName(uri) ?: "custom_model_${System.currentTimeMillis()}.gguf"
            val sanitizedId = "custom_" + resolvedName.lowercase()
                .replace(Regex("[^a-z0-9._-]"), "_")
                .removeSuffix(".gguf")
                .removeSuffix(".bin")

            val modelsDir = File(context.filesDir, "models").apply { mkdirs() }
            val destExtension = if (resolvedName.endsWith(".bin", ignoreCase = true)) ".bin" else ".gguf"
            val destFile = File(modelsDir, "${sanitizedId}${destExtension}")

            updateState(
                modelId = sanitizedId,
                downloaded = 0L,
                total = 100L,
                speed = 0L,
                status = DownloadStatus.DOWNLOADING
            )

            var totalCopied = 0L
            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(destFile).use { output ->
                    val buffer = ByteArray(128 * 1024)
                    var read: Int
                    while (input.read(buffer).also { read = it } != -1) {
                        output.write(buffer, 0, read)
                        totalCopied += read
                        updateState(
                            modelId = sanitizedId,
                            downloaded = totalCopied,
                            total = totalCopied.coerceAtLeast(1L),
                            speed = 0L,
                            status = DownloadStatus.DOWNLOADING
                        )
                    }
                }
            } ?: return@withContext Result.failure(IllegalStateException("Could not open selected file URI"))

            if (totalCopied <= 0L) {
                destFile.delete()
                return@withContext Result.failure(IllegalStateException("Selected file is empty (0 bytes)"))
            }

            updateState(sanitizedId, totalCopied, totalCopied, 0L, DownloadStatus.VERIFYING_CHECKSUM)
            val sha256 = computeSha256(destFile)

            // Play Protect Dynamic Code Loading (DCL) Hardening:
            destFile.setExecutable(false, false)
            destFile.setWritable(false, false)
            destFile.setReadable(true, true)

            val estimatedRamMb = ((totalCopied / (1024 * 1024)) * 1.45).toInt().coerceAtLeast(512)
            val displayTitle = customDisplayName?.takeIf { it.isNotBlank() } ?: resolvedName

            val entity = LocalModelEntity(
                modelId = sanitizedId,
                displayName = displayTitle,
                category = category,
                quantization = "CUSTOM",
                fileSizeBytes = totalCopied,
                requiredRamMb = estimatedRamMb,
                sha256Checksum = sha256,
                localFilePath = destFile.absolutePath,
                isActive = true
            )

            modelDao.deactivateCategory(category)
            modelDao.upsertModel(entity)
            updateState(sanitizedId, totalCopied, totalCopied, 0L, DownloadStatus.COMPLETED)
            Result.success(entity)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Registers a custom remote model URL (.gguf or .bin) into the catalog and starts downloading it.
     */
    suspend fun registerAndDownloadCustomUrl(
        displayName: String,
        downloadUrl: String,
        category: String,
        requireWifiOnly: Boolean
    ): Result<File> {
        val slug = "custom_url_" + displayName.lowercase().replace(Regex("[^a-z0-9]+"), "_").trim('_')
        RecommendedModelCatalog.DOWNLOAD_URLS[slug] = downloadUrl.trim()
        val entity = LocalModelEntity(
            modelId = slug,
            displayName = "$displayName (Custom URL)",
            category = category,
            quantization = "CUSTOM",
            fileSizeBytes = 500_000_000L, // Updated dynamically from HTTP Content-Length header
            requiredRamMb = 2048,
            sha256Checksum = "AUTO_VERIFY_ON_COMPLETE",
            localFilePath = null,
            isActive = false
        )
        modelDao.upsertModel(entity)
        return downloadModelWithResume(entity, requireWifiOnly, customDirectUrl = downloadUrl.trim())
    }

    suspend fun downloadModelWithResume(
        model: LocalModelEntity,
        requireWifiOnly: Boolean = false,
        customDirectUrl: String? = null
    ): Result<File> = withContext(Dispatchers.IO) {
        cancelledModelIds.remove(model.modelId)

        if (!isAnyNetworkConnected()) {
            val msg = "No internet connection. Connect to Wi-Fi or mobile data to download ${model.displayName}."
            updateState(model.modelId, 0L, model.fileSizeBytes, 0L, DownloadStatus.FAILED, msg)
            return@withContext Result.failure(IllegalStateException(msg))
        }

        if (requireWifiOnly && !isUnmeteredWifiConnected()) {
            val msg = "Wi-Fi-Only Guard is ON. Connect to Wi-Fi or turn off 'Wi-Fi Only Guard' above to download over mobile data."
            updateState(model.modelId, 0L, model.fileSizeBytes, 0L, DownloadStatus.FAILED, msg)
            return@withContext Result.failure(IllegalStateException(msg))
        }

        val downloadUrl = customDirectUrl
            ?: RecommendedModelCatalog.DOWNLOAD_URLS[model.modelId]
            ?: return@withContext Result.failure(IllegalArgumentException("No download URL registered for ${model.modelId}"))

        val modelsDir = File(context.filesDir, "models").apply { mkdirs() }
        val partFile = File(modelsDir, "${model.modelId}.part")
        val finalExt = if (model.category == "STT_WHISPER") ".bin" else ".gguf"
        val finalFile = File(modelsDir, "${model.modelId}${finalExt}")

        var downloadedBytes = if (partFile.exists()) partFile.length() else 0L
        var expectedTotalBytes = model.fileSizeBytes
        updateState(model.modelId, downloadedBytes, expectedTotalBytes, 0L, DownloadStatus.CONNECTING)

        try {
            val connection = openConnectionFollowingRedirects(downloadUrl, downloadedBytes)
            val responseCode = connection.responseCode

            if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_PARTIAL) {
                throw IllegalStateException("Server returned HTTP $responseCode (${connection.responseMessage})")
            }

            val contentLength = connection.contentLengthLong
            if (responseCode == HttpURLConnection.HTTP_PARTIAL && contentLength > 0) {
                expectedTotalBytes = downloadedBytes + contentLength
            } else if (responseCode == HttpURLConnection.HTTP_OK && contentLength > 0) {
                expectedTotalBytes = contentLength
            }

            updateState(model.modelId, downloadedBytes, expectedTotalBytes, 0L, DownloadStatus.DOWNLOADING)

            RandomAccessFile(partFile, "rw").use { raf ->
                if (responseCode == HttpURLConnection.HTTP_PARTIAL && downloadedBytes > 0) {
                    raf.seek(downloadedBytes)
                } else {
                    raf.setLength(0)
                    downloadedBytes = 0L
                }

                connection.inputStream.use { input ->
                    val buffer = ByteArray(64 * 1024)
                    var bytesRead: Int
                    var lastUiUpdateMs = System.currentTimeMillis()
                    var bytesAtLastUiUpdate = downloadedBytes

                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        if (cancelledModelIds.contains(model.modelId)) {
                            updateState(
                                model.modelId,
                                downloadedBytes,
                                expectedTotalBytes,
                                0L,
                                DownloadStatus.PAUSED,
                                "Download paused at ${downloadedBytes / (1024 * 1024)} MB. Tap Resume anytime."
                            )
                            return@withContext Result.failure(IllegalStateException("Download paused by user"))
                        }

                        raf.write(buffer, 0, bytesRead)
                        downloadedBytes += bytesRead

                        val now = System.currentTimeMillis()
                        val elapsedMs = now - lastUiUpdateMs
                        if (elapsedMs >= 220L) {
                            val deltaBytes = downloadedBytes - bytesAtLastUiUpdate
                            val speedBps = if (elapsedMs > 0) (deltaBytes * 1000L) / elapsedMs else 0L
                            updateState(
                                model.modelId,
                                downloadedBytes,
                                expectedTotalBytes,
                                speedBps,
                                DownloadStatus.DOWNLOADING
                            )
                            lastUiUpdateMs = now
                            bytesAtLastUiUpdate = downloadedBytes
                        }
                    }
                }
            }

            if (downloadedBytes <= 0L) {
                partFile.delete()
                throw IllegalStateException("Downloaded 0 bytes from server.")
            }

            updateState(
                model.modelId,
                downloadedBytes,
                expectedTotalBytes,
                0L,
                DownloadStatus.VERIFYING_CHECKSUM
            )

            val actualSha256 = computeSha256(partFile)
            val hasStrictSha = model.sha256Checksum.length == 64 &&
                model.sha256Checksum != "AUTO_VERIFY_ON_COMPLETE"

            if (hasStrictSha && !actualSha256.equals(model.sha256Checksum, ignoreCase = true)) {
                partFile.delete()
                val msg = "SHA-256 mismatch: expected ${model.sha256Checksum.take(12)}, got ${actualSha256.take(12)}"
                updateState(model.modelId, 0L, expectedTotalBytes, 0L, DownloadStatus.FAILED, msg)
                return@withContext Result.failure(SecurityException(msg))
            }

            if (finalFile.exists()) {
                finalFile.setWritable(true, true)
                finalFile.delete()
            }
            partFile.renameTo(finalFile)

            // Play Protect Dynamic Code Loading (DCL) Hardening:
            finalFile.setExecutable(false, false)
            finalFile.setWritable(false, false)
            finalFile.setReadable(true, true)

            val updatedEntity = model.copy(
                fileSizeBytes = downloadedBytes,
                sha256Checksum = actualSha256,
                localFilePath = finalFile.absolutePath
            )
            modelDao.upsertModel(updatedEntity)

            updateState(
                model.modelId,
                downloadedBytes,
                downloadedBytes,
                0L,
                DownloadStatus.COMPLETED
            )
            Result.success(finalFile)
        } catch (e: Exception) {
            updateState(
                model.modelId,
                downloadedBytes,
                expectedTotalBytes,
                0L,
                DownloadStatus.FAILED,
                e.message ?: "Download interrupted (Tap to resume)"
            )
            Result.failure(e)
        }
    }

    /**
     * Follows up to 6 HTTP 301/302/303/307/308 redirects across Hugging Face and CDN hosts
     * while preserving the HTTP Range header for resumable downloads.
     */
    private fun openConnectionFollowingRedirects(urlStr: String, rangeStartBytes: Long): HttpURLConnection {
        var currentUrl = urlStr
        var redirects = 0
        while (redirects < 6) {
            val conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 20_000
                readTimeout = 30_000
                setRequestProperty("User-Agent", "MangalOfflineAssistant/1.2 (Android)")
                setRequestProperty("Accept", "*/*")
                if (rangeStartBytes > 0L) {
                    setRequestProperty("Range", "bytes=$rangeStartBytes-")
                }
            }
            conn.connect()
            val code = conn.responseCode
            if (code in listOf(
                    HttpURLConnection.HTTP_MOVED_PERM,
                    HttpURLConnection.HTTP_MOVED_TEMP,
                    HttpURLConnection.HTTP_SEE_OTHER,
                    307,
                    308
                )
            ) {
                val location = conn.getHeaderField("Location")
                    ?: throw IllegalStateException("Redirect HTTP $code missing Location header")
                currentUrl = URL(URL(currentUrl), location).toString()
                conn.disconnect()
                redirects++
            } else {
                return conn
            }
        }
        throw IllegalStateException("Too many HTTP redirects while connecting to model host")
    }

    suspend fun deleteModelFile(model: LocalModelEntity) = withContext(Dispatchers.IO) {
        cancelledModelIds.add(model.modelId)
        model.localFilePath?.let { path ->
            val f = File(path)
            if (f.exists()) {
                f.setWritable(true, true)
                f.delete()
            }
        }
        val modelsDir = File(context.filesDir, "models")
        File(modelsDir, "${model.modelId}.part").delete()
        File(modelsDir, "${model.modelId}.gguf").apply { setWritable(true, true); delete() }
        File(modelsDir, "${model.modelId}.bin").apply { setWritable(true, true); delete() }

        if (model.modelId.startsWith("custom_")) {
            modelDao.deleteModelById(model.modelId)
        } else {
            modelDao.upsertModel(model.copy(localFilePath = null, isActive = false))
        }
        updateState(model.modelId, 0L, model.fileSizeBytes, 0L, DownloadStatus.IDLE)
    }

    private fun resolveFileName(uri: Uri): String? {
        var name: String? = null
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) {
                name = cursor.getString(index)
            }
        }
        return name ?: uri.lastPathSegment?.substringAfterLast('/')
    }

    private fun computeSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { fis ->
            val buffer = ByteArray(128 * 1024)
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
        speed: Long,
        status: DownloadStatus,
        error: String? = null
    ) {
        val next = _progressMap.value.toMutableMap()
        next[modelId] = DownloadProgress(
            modelId = modelId,
            bytesDownloaded = downloaded,
            totalBytes = total,
            speedBytesPerSec = speed,
            status = status,
            errorMessage = error
        )
        _progressMap.value = next
    }
}
