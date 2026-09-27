package ai.mangal.assistant.ui.models

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ai.mangal.core.llm.DeviceHealthAndRamGuard
import ai.mangal.core.llm.LlmEngine
import ai.mangal.core.stt.WhisperTranscriber
import ai.mangal.data.db.LocalModelEntity
import ai.mangal.data.db.ModelDao
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
                _statusBanner.value = "Downloading ${model.displayName} (resumable HTTP Range)..."
                val result = downloader.downloadModelWithResume(model, requireUnmeteredWifi)
                result.fold(
                    onSuccess = { downloadedFile ->
                        _statusBanner.value = "Verified SHA-256 & locked read-only: ${downloadedFile.name}"
                        activateModelFile(model.copy(localFilePath = downloadedFile.absolutePath))
                    },
                    onFailure = { err ->
                        _statusBanner.value = err.message ?: "Download failed"
                    }
                )
            } else {
                activateModelFile(model)
            }
        }
    }

    private suspend fun activateModelFile(model: LocalModelEntity) {
        val path = model.localFilePath ?: return
        modelDao.upsertModel(model.copy(isActive = true))
        if (model.category == "LLM_GGUF") {
            llmEngine.loadModel(
                ggufFilePath = path,
                requiredRamMb = model.requiredRamMb
            )
        } else if (model.category == "STT_WHISPER") {
            whisperTranscriber.loadWhisperModel(path)
        }
        _statusBanner.value = "Activated ${model.displayName}"
    }

    fun deleteModel(model: LocalModelEntity) {
        viewModelScope.launch {
            downloader.deleteModelFile(model)
            _statusBanner.value = "Deleted ${model.displayName} from local storage."
        }
    }
}
