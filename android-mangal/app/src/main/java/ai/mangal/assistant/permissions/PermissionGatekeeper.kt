package ai.mangal.assistant.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

enum class MangalPermissionGroup(
    val title: String,
    val rationale: String,
    val androidPermissions: List<String>,
    val requiredForCoreLoop: Boolean
) {
    MICROPHONE(
        title = "Microphone Capture & 'Mangal' Wake Word",
        rationale = "Required for hands-free 'Mangal' wake word detection and whisper.cpp offline speech-to-text. Audio never leaves the device.",
        androidPermissions = listOf(Manifest.permission.RECORD_AUDIO),
        requiredForCoreLoop = true
    ),
    FOREGROUND_NOTIFICATION(
        title = "Hands-Free Service Notification",
        rationale = "Displays a persistent status indicator when MANGAL is listening for the 'Mangal' wake word, ensuring full Play Protect compliance.",
        androidPermissions = if (Build.VERSION.SDK_INT >= 33) {
            listOf(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            emptyList()
        },
        requiredForCoreLoop = true
    ),
    CALENDAR(
        title = "Local Calendar Access",
        rationale = "Required only when you ask MANGAL to schedule or inspect events via CalendarContract.",
        androidPermissions = listOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR),
        requiredForCoreLoop = false
    ),
    CONTACTS(
        title = "Local Contacts Lookup",
        rationale = "Used to resolve contact names locally when preparing Play-Protect-safe SMS or Dialer intents.",
        androidPermissions = listOf(Manifest.permission.READ_CONTACTS),
        requiredForCoreLoop = false
    )
}

object PermissionGatekeeper {
    fun isGroupGranted(context: Context, group: MangalPermissionGroup): Boolean {
        return group.androidPermissions.all { perm ->
            ContextCompat.checkSelfPermission(context, perm) == PackageManager.PERMISSION_GRANTED
        }
    }
}
