package ai.mangal.assistant.ui.models

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ai.mangal.core.llm.DeviceHealthAndRamGuard
import ai.mangal.core.llm.LlmEngine
import ai.mangal.core.stt.WhisperTranscriber
import ai.mangal.data.db.LocalModelEntity
import ai.mangal.data.db.ModelDao
import ai.mangal.data.models.DownloadProgress
import ai.mangal.data.models.RecommendedModelCatalog
import ai.mangal.data.models.ResumableModelDownloader
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ModelManagerViewModel @Inject constructor(
    private val modelDao: ModelDao,
    private val downloader: ResumableModelDownloader,
    private val ramGuard: DeviceHealthAndRamGuard,
    private val llmEngine: LlmEngine,
    private val whisperTranscriber: WhisperTranscriber
) : ViewModel() {

    val models: StateFlow<List<LocalModelEntity>> = downloader.observeCatalog()
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            RecommendedModelCatalog.ALL_MODELS
        )

    val progressMap: StateFlow<Map<String, DownloadProgress>> = downloader.progressMap

    private val _statusBanner = MutableStateFlow<String?>(null)
    val statusBanner: StateFlow<String?> = _statusBanner.asStateFlow()

    init {
        viewModelScope.launch {
            downloader.seedCatalogIfEmpty(0)
        }
    }

    fun downloadOrActivate(model: LocalModelEntity, requireUnmeteredWifi: Boolean) {
        viewModelScope.launch {
            val ramCheck = ramGuard.canSafelyLoadModel(model.requiredRamMb, model.fileSizeBytes)
            if (ramCheck.isFailure) {
                _statusBanner.value = ramCheck.exceptionOrNull()?.message ?: "Insufficient RAM for model."
                return@launch
            }

            if (model.localFilePath.isNullOrBlank()) {
                _statusBanner.value = "Starting download: ${model.displayName}..."
                val result = downloader.downloadModelWithResume(model, requireUnmeteredWifi)
                result.fold(
                    onSuccess = { downloadedFile ->
                        _statusBanner.value = "Download complete & verified: ${downloadedFile.name}"
                        activateModelFile(model.copy(localFilePath = downloadedFile.absolutePath))
                    },
                    onFailure = { err ->
                        _statusBanner.value = err.message ?: "Download paused or failed."
                    }
                )
            } else {
                activateModelFile(model)
            }
        }
    }

    fun pauseDownload(modelId: String) {
        downloader.cancelOrPauseDownload(modelId)
        _statusBanner.value = "Paused download for $modelId. Tap Resume anytime."
    }

    fun importCustomFileFromDevice(uri: Uri, customName: String?, category: String) {
        viewModelScope.launch {
            _statusBanner.value = "Importing custom model file from device storage..."
            val result = downloader.importCustomModelFromUri(uri, customName, category)
            result.fold(
                onSuccess = { importedModel ->
                    activateModelFile(importedModel)
                    _statusBanner.value = "Imported & activated custom model: ${importedModel.displayName}"
                },
                onFailure = { err ->
                    _statusBanner.value = "Import failed: ${err.message}"
                }
            )
        }
    }

    fun downloadCustomModelFromUrl(
        displayName: String,
        url: String,
        category: String,
        requireWifiOnly: Boolean
    ) {
        viewModelScope.launch {
            _statusBanner.value = "Starting custom URL download: $displayName..."
            val result = downloader.registerAndDownloadCustomUrl(displayName, url, category, requireWifiOnly)
            result.fold(
                onSuccess = { file ->
                    _statusBanner.value = "Custom URL model downloaded: ${file.name}"
                },
                onFailure = { err ->
                    _statusBanner.value = "Custom download error: ${err.message}"
                }
            )
        }
    }

    private suspend fun activateModelFile(model: LocalModelEntity) {
        val path = model.localFilePath ?: return
        modelDao.deactivateCategory(model.category)
        modelDao.upsertModel(model.copy(isActive = true))
        if (model.category == "LLM_GGUF" || model.category == "CUSTOM_GGUF") {
            llmEngine.loadModel(
                ggufFilePath = path,
                requiredRamMb = model.requiredRamMb
            )
        } else if (model.category == "STT_WHISPER") {
            whisperTranscriber.loadWhisperModel(path)
        }
        _statusBanner.value = "Active Model: ${model.displayName}"
    }

    fun deleteModel(model: LocalModelEntity) {
        viewModelScope.launch {
            downloader.deleteModelFile(model)
            _statusBanner.value = "Deleted ${model.displayName} from local storage."
        }
    }
}
