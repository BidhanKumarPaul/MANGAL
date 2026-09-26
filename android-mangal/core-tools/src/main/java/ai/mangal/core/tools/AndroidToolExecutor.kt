package ai.mangal.core.tools

import android.Manifest
import android.app.SearchManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.provider.AlarmClock
import android.provider.CalendarContract
import android.provider.Settings
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AndroidToolExecutor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val toolRegistry: ToolRegistry
) {
    /**
     * Executes a validated tool call against Android system APIs without root.
     * Verifies runtime permissions first and returns a graceful fallback when denied.
     */
    fun execute(toolName: String, arguments: JsonObject): ToolExecutionResult {
        return try {
            when (toolName) {
                "set_alarm_or_timer" -> executeAlarmOrTimer(arguments)
                "create_calendar_event" -> executeCalendarEvent(arguments)
                "send_sms_or_place_call" -> executeSmsOrCall(arguments)
                "open_installed_app" -> executeOpenApp(arguments)
                "adjust_device_setting" -> executeDeviceSetting(arguments)
                "offline_app_or_web_search" -> executeSearchIntent(arguments)
                else -> ToolExecutionResult(
                    toolName = toolName,
                    success = false,
                    humanReadableSummary = "I can't do that because tool '$toolName' is not supported."
                )
            }
        } catch (e: Exception) {
            ToolExecutionResult(
                toolName = toolName,
                success = false,
                humanReadableSummary = "I couldn't complete $toolName: ${e.message ?: "unexpected Android system error"}."
            )
        }
    }

    private fun executeAlarmOrTimer(args: JsonObject): ToolExecutionResult {
        val mode = args["mode"]?.jsonPrimitive?.content ?: "alarm"
        val message = args["message"]?.jsonPrimitive?.content ?: "MANGAL Reminder"

        return if (mode == "timer") {
            val seconds = args["durationSeconds"]?.jsonPrimitive?.intOrNull ?: 60
            val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
                putExtra(AlarmClock.EXTRA_LENGTH, seconds)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            ToolExecutionResult(
                toolName = "set_alarm_or_timer",
                success = true,
                humanReadableSummary = "Set a countdown timer for $seconds seconds ($message)."
            )
        } else {
            val hour = args["hour"]?.jsonPrimitive?.intOrNull ?: 7
            val minute = args["minute"]?.jsonPrimitive?.intOrNull ?: 0
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            ToolExecutionResult(
                toolName = "set_alarm_or_timer",
                success = true,
                humanReadableSummary = "Scheduled alarm for %02d:%02d (%s).".format(hour, minute, message)
            )
        }
    }

    private fun executeCalendarEvent(args: JsonObject): ToolExecutionResult {
        val hasWrite = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.WRITE_CALENDAR
        ) == PackageManager.PERMISSION_GRANTED

        val title = args["title"]?.jsonPrimitive?.content ?: "MANGAL Event"
        val startMs = args["startEpochMs"]?.jsonPrimitive?.longOrNull
            ?: (System.currentTimeMillis() + 3_600_000L)
        val durationMin = args["durationMinutes"]?.jsonPrimitive?.intOrNull ?: 30
        val endMs = startMs + durationMin * 60_000L

        if (!hasWrite) {
            return ToolExecutionResult(
                toolName = "create_calendar_event",
                success = false,
                humanReadableSummary = "I can't create the calendar event '$title' yet because Calendar permission is not granted.",
                requiresPermissionPrompt = Manifest.permission.WRITE_CALENDAR
            )
        }

        val values = ContentValues().apply {
            put(CalendarContract.Events.DTSTART, startMs)
            put(CalendarContract.Events.DTEND, endMs)
            put(CalendarContract.Events.TITLE, title)
            put(CalendarContract.Events.CALENDAR_ID, 1L)
            put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
        }
        context.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
        return ToolExecutionResult(
            toolName = "create_calendar_event",
            success = true,
            humanReadableSummary = "Added '$title' ($durationMin min) to your local calendar."
        )
    }

    private fun executeSmsOrCall(args: JsonObject): ToolExecutionResult {
        val action = args["action"]?.jsonPrimitive?.content ?: "sms"
        val recipient = args["recipient"]?.jsonPrimitive?.content ?: ""
        val body = args["body"]?.jsonPrimitive?.content ?: ""

        return if (action == "call") {
            val hasCallPerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CALL_PHONE
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasCallPerm) {
                return ToolExecutionResult(
                    toolName = "send_sms_or_place_call",
                    success = false,
                    humanReadableSummary = "I can't place a direct call to $recipient without CALL_PHONE permission.",
                    requiresPermissionPrompt = Manifest.permission.CALL_PHONE
                )
            }
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$recipient")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(callIntent)
            ToolExecutionResult(
                toolName = "send_sms_or_place_call",
                success = true,
                humanReadableSummary = "Calling $recipient now."
            )
        } else {
            val hasSmsPerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.SEND_SMS
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasSmsPerm) {
                return ToolExecutionResult(
                    toolName = "send_sms_or_place_call",
                    success = false,
                    humanReadableSummary = "I can't send an SMS to $recipient without SEND_SMS permission.",
                    requiresPermissionPrompt = Manifest.permission.SEND_SMS
                )
            }
            val smsManager = context.getSystemService(SmsManager::class.java)
            smsManager.sendTextMessage(recipient, null, body, null, null)
            ToolExecutionResult(
                toolName = "send_sms_or_place_call",
                success = true,
                humanReadableSummary = "Sent SMS to $recipient: \"$body\"."
            )
        }
    }

    private fun executeOpenApp(args: JsonObject): ToolExecutionResult {
        val targetAppName = args["appName"]?.jsonPrimitive?.content?.trim() ?: ""
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
        val matched = resolveInfos.firstOrNull { info ->
            val label = info.loadLabel(pm).toString()
            label.contains(targetAppName, ignoreCase = true) ||
                info.activityInfo.packageName.contains(targetAppName, ignoreCase = true)
        }

        if (matched == null) {
            return ToolExecutionResult(
                toolName = "open_installed_app",
                success = false,
                humanReadableSummary = "I couldn't find an installed app matching '$targetAppName' on this device."
            )
        }

        val launchIntent = pm.getLaunchIntentForPackage(matched.activityInfo.packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        if (launchIntent != null) {
            context.startActivity(launchIntent)
        }
        val label = matched.loadLabel(pm).toString()
        return ToolExecutionResult(
            toolName = "open_installed_app",
            success = true,
            humanReadableSummary = "Opened $label (${matched.activityInfo.packageName})."
        )
    }

    private fun executeDeviceSetting(args: JsonObject): ToolExecutionResult {
        val target = args["target"]?.jsonPrimitive?.content ?: "volume"
        val state = args["state"]?.jsonPrimitive?.content ?: "on"

        return when (target) {
            "flashlight" -> {
                val cm = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                val cameraId = cm.cameraIdList.firstOrNull()
                    ?: return ToolExecutionResult(
                        "adjust_device_setting",
                        false,
                        "No camera flash unit found on this device."
                    )
                val turnOn = !state.equals("off", ignoreCase = true)
                cm.setTorchMode(cameraId, turnOn)
                ToolExecutionResult(
                    "adjust_device_setting",
                    true,
                    "Turned flashlight ${if (turnOn) "ON" else "OFF"}."
                )
            }
            "volume" -> {
                val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                val direction = if (state.equals("down", ignoreCase = true)) {
                    AudioManager.ADJUST_LOWER
                } else {
                    AudioManager.ADJUST_RAISE
                }
                am.adjustStreamVolume(
                    AudioManager.STREAM_MUSIC,
                    direction,
                    AudioManager.FLAG_SHOW_UI
                )
                ToolExecutionResult(
                    "adjust_device_setting",
                    true,
                    "Adjusted media volume ($state)."
                )
            }
            "wifi" -> {
                val panelIntent = Intent(Settings.Panel.ACTION_WIFI).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(panelIntent)
                ToolExecutionResult(
                    "adjust_device_setting",
                    true,
                    "Opened Android Wi-Fi Quick Settings Panel (direct toggle restricted on Android 10+)."
                )
            }
            "bluetooth" -> {
                val btIntent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(btIntent)
                ToolExecutionResult(
                    "adjust_device_setting",
                    true,
                    "Opened Bluetooth settings."
                )
            }
            else -> {
                val displayIntent = Intent(Settings.ACTION_DISPLAY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(displayIntent)
                ToolExecutionResult(
                    "adjust_device_setting",
                    true,
                    "Opened Display & Brightness settings."
                )
            }
        }
    }

    private fun executeSearchIntent(args: JsonObject): ToolExecutionResult {
        val query = args["query"]?.jsonPrimitive?.content ?: ""
        val intent = Intent(Intent.ACTION_WEB_SEARCH).apply {
            putExtra(SearchManager.QUERY, query)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        return ToolExecutionResult(
            toolName = "offline_app_or_web_search",
            success = true,
            humanReadableSummary = "Launched external search intent for '$query' (note: MANGAL itself remains 100% offline)."
        )
    }
}
