package ai.mangal.assistant.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

enum class MangalPermissionGroup(
    val title: String,
    val rationale: String,
    val androidPermissions: List<String>,
    val requiredForCoreLoop: Boolean
) {
    MICROPHONE(
        title = "Microphone Capture",
        rationale = "Required for on-device whisper.cpp speech-to-text transcription. Audio never leaves the device.",
        androidPermissions = listOf(Manifest.permission.RECORD_AUDIO),
        requiredForCoreLoop = true
    ),
    CALENDAR(
        title = "Local Calendar Access",
        rationale = "Required only when you ask MANGAL to schedule or inspect events via CalendarContract.",
        androidPermissions = listOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR),
        requiredForCoreLoop = false
    ),
    CONTACTS_AND_SMS(
        title = "SMS & Contacts",
        rationale = "Requested on-demand when executing send_sms tool calls. Flagged as restricted by Play Console.",
        androidPermissions = listOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_CONTACTS),
        requiredForCoreLoop = false
    ),
    PHONE_CALLS(
        title = "Direct Phone Calls",
        rationale = "Requested on-demand when placing direct voice calls via CALL_PHONE.",
        androidPermissions = listOf(Manifest.permission.CALL_PHONE),
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
