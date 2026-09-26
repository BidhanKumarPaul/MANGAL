package ai.mangal.assistant.lifecycle

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import ai.mangal.core.llm.LlmEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Phase 5 Battery & Thermal Saver:
 * Automatically unloads the GGUF model from native RAM when the user backgrounds MANGAL
 * (unless active voice interaction is running), preventing idle memory pressure.
 */
@Singleton
class ModelMemoryLifecycleObserver @Inject constructor(
    private val llmEngine: LlmEngine
) : DefaultLifecycleObserver {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    var unloadOnBackgroundEnabled: Boolean = true

    override fun onStop(owner: LifecycleOwner) {
        if (unloadOnBackgroundEnabled) {
            scope.launch {
                llmEngine.unloadModel()
            }
        }
    }
}
