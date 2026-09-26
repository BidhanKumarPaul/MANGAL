package ai.mangal.core.llm

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class DeviceResourceProfile(
    val totalRamMb: Int,
    val availableRamMb: Int,
    val isLowRamDevice: Boolean,
    val thermalStatusLabel: String,
    val recommendedContextLength: Int,
    val recommendedThreads: Int
)

@Singleton
class DeviceHealthAndRamGuard @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val _thermalThrottled = MutableStateFlow(false)
    val thermalThrottled: StateFlow<Boolean> = _thermalThrottled.asStateFlow()

    fun inspectDeviceResources(): DeviceResourceProfile {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am.getMemoryInfo(memInfo)

        val totalMb = (memInfo.totalMem / (1024 * 1024)).toInt()
        val availMb = (memInfo.availMem / (1024 * 1024)).toInt()
        val isLowRam = am.isLowRamDevice || totalMb < 3800

        var thermalLabel = "THERMAL_STATUS_NONE"
        var isThrottling = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val status = pm?.currentThermalStatus ?: PowerManager.THERMAL_STATUS_NONE
            isThrottling = status >= PowerManager.THERMAL_STATUS_MODERATE
            thermalLabel = when (status) {
                PowerManager.THERMAL_STATUS_NONE -> "NOMINAL"
                PowerManager.THERMAL_STATUS_LIGHT -> "LIGHT"
                PowerManager.THERMAL_STATUS_MODERATE -> "MODERATE (Throttling Context)"
                PowerManager.THERMAL_STATUS_SEVERE -> "SEVERE (Throttling Threads + Context)"
                else -> "CRITICAL (Unload Recommended)"
            }
        }
        _thermalThrottled.value = isThrottling

        val cpuCores = Runtime.getRuntime().availableProcessors()
        val threads = if (isThrottling) 2 else (cpuCores / 2).coerceIn(2, 6)
        val ctxLen = when {
            isThrottling -> 1024
            isLowRam -> 1536
            totalMb >= 7500 -> 4096
            else -> 2048
        }

        return DeviceResourceProfile(
            totalRamMb = totalMb,
            availableRamMb = availMb,
            isLowRamDevice = isLowRam,
            thermalStatusLabel = thermalLabel,
            recommendedContextLength = ctxLen,
            recommendedThreads = threads
        )
    }

    /**
     * Prevents native SIGABRT / OOM kills on low-RAM Android devices by verifying both
     * total physical RAM and currently available memory before calling llama_model_load_from_file.
     */
    fun canSafelyLoadModel(requiredRamMb: Int, modelSizeBytes: Long): Result<DeviceResourceProfile> {
        val profile = inspectDeviceResources()
        if (requiredRamMb > profile.totalRamMb * 0.78) {
            return Result.failure(
                OutOfMemoryError(
                    "Model requires ${requiredRamMb} MB RAM, which exceeds safe threshold (78%) of device total RAM (${profile.totalRamMb} MB)."
                )
            )
        }
        val modelSizeMb = (modelSizeBytes / (1024 * 1024)).toInt()
        if (profile.availableRamMb < (modelSizeMb + 350)) {
            return Result.failure(
                OutOfMemoryError(
                    "Insufficient free RAM (${profile.availableRamMb} MB available; need at least ${modelSizeMb + 350} MB free to mmap weights + KV cache)."
                )
            )
        }
        return Result.success(profile)
    }
}
