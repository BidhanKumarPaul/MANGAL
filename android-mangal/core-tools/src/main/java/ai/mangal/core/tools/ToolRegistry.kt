package ai.mangal.core.tools

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class ToolDefinition(
    val name: String,
    val description: String,
    val requiredPermissions: List<String>,
    val parametersSchemaJson: String
)

@Serializable
data class LlmStructuredEnvelope(
    val type: String, // "tool_call" | "reply"
    val toolName: String? = null,
    val arguments: JsonObject? = null,
    val replyText: String? = null
)

@Serializable
data class ToolExecutionResult(
    val toolName: String,
    val success: Boolean,
    val humanReadableSummary: String,
    val requiresPermissionPrompt: String? = null
)

@Singleton
class ToolRegistry @Inject constructor() {

    private val jsonParser = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val registeredTools = listOf(
        ToolDefinition(
            name = "set_alarm_or_timer",
            description = "Schedules an alarm or countdown timer via Android AlarmClock / AlarmManager.",
            requiredPermissions = listOf("com.android.alarm.permission.SET_ALARM"),
            parametersSchemaJson = """{"type":"object","properties":{"mode":{"type":"string","enum":["alarm","timer"]},"hour":{"type":"integer"},"minute":{"type":"integer"},"durationSeconds":{"type":"integer"},"message":{"type":"string"}},"required":["mode"]}"""
        ),
        ToolDefinition(
            name = "create_calendar_event",
            description = "Inserts a local calendar event via Android CalendarContract.",
            requiredPermissions = listOf("android.permission.READ_CALENDAR", "android.permission.WRITE_CALENDAR"),
            parametersSchemaJson = """{"type":"object","properties":{"title":{"type":"string"},"startEpochMs":{"type":"integer"},"durationMinutes":{"type":"integer"},"location":{"type":"string"}},"required":["title","startEpochMs"]}"""
        ),
        ToolDefinition(
            name = "send_sms_or_place_call",
            description = "Sends an SMS or initiates a phone call after runtime permission check.",
            requiredPermissions = listOf("android.permission.SEND_SMS", "android.permission.CALL_PHONE", "android.permission.READ_CONTACTS"),
            parametersSchemaJson = """{"type":"object","properties":{"action":{"type":"string","enum":["sms","call"]},"recipient":{"type":"string"},"body":{"type":"string"}},"required":["action","recipient"]}"""
        ),
        ToolDefinition(
            name = "open_installed_app",
            description = "Resolves and launches an installed package via Android PackageManager.",
            requiredPermissions = emptyList(),
            parametersSchemaJson = """{"type":"object","properties":{"appName":{"type":"string"}},"required":["appName"]}"""
        ),
        ToolDefinition(
            name = "adjust_device_setting",
            description = "Adjusts volume, flashlight (CameraManager), or opens Settings Panel intent for Wi-Fi/Bluetooth/Brightness.",
            requiredPermissions = emptyList(),
            parametersSchemaJson = """{"type":"object","properties":{"target":{"type":"string","enum":["volume","flashlight","wifi","bluetooth","brightness"]},"state":{"type":"string"}},"required":["target"]}"""
        ),
        ToolDefinition(
            name = "offline_app_or_web_search",
            description = "Launches an offline-triggered search intent to an installed browser or app.",
            requiredPermissions = emptyList(),
            parametersSchemaJson = """{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}"""
        )
    )

    fun listRegisteredTools(): List<ToolDefinition> = registeredTools

    fun findTool(name: String): ToolDefinition? = registeredTools.firstOrNull { it.name == name }

    /**
     * Builds the deterministic system prompt instructing the on-device GGUF model to emit
     * strict JSON conforming to LlmStructuredEnvelope, plus a clear caveat that MANGAL has
     * no internet access for live facts.
     */
    fun buildSystemPrompt(): String {
        val toolsCatalog = registeredTools.joinToString("\n") { tool ->
            "- ${tool.name}: ${tool.description} | Schema: ${tool.parametersSchemaJson}"
        }
        return """
            You are MANGAL, a 100% offline on-device Android voice assistant.
            CRITICAL RULES:
            1. You have NO internet connection at runtime. For general conversation/Q&A, answer from your internal weights and explicitly caveat that you cannot fetch live internet facts (weather, live stock prices, breaking news).
            2. You MUST respond ONLY with a single valid JSON object matching this schema:
               {"type":"tool_call","toolName":"<name>","arguments":{...}}
               OR
               {"type":"reply","replyText":"<concise spoken response>"}
            AVAILABLE TOOLS:
            $toolsCatalog
        """.trimIndent()
    }

    /**
     * Validates and parses the LLM's raw JSON output against registered tools and required keys.
     */
    fun parseAndValidateEnvelope(rawJsonOutput: String): Result<LlmStructuredEnvelope> {
        return try {
            val trimmed = rawJsonOutput.trim()
                .removePrefix("```json")
                .removePrefix("```")
                .removeSuffix("```")
                .trim()
            val envelope = jsonParser.decodeFromString<LlmStructuredEnvelope>(trimmed)
            if (envelope.type == "tool_call") {
                val toolName = envelope.toolName
                    ?: return Result.failure(IllegalArgumentException("Missing toolName in tool_call"))
                val toolDef = findTool(toolName)
                    ?: return Result.failure(IllegalArgumentException("Unregistered tool: $toolName"))
                val args = envelope.arguments
                    ?: return Result.failure(IllegalArgumentException("Missing arguments object for $toolName"))

                // Validate required parameters per tool
                when (toolDef.name) {
                    "set_alarm_or_timer" -> {
                        if (!args.containsKey("mode")) {
                            return Result.failure(IllegalArgumentException("set_alarm_or_timer requires 'mode'"))
                        }
                    }
                    "create_calendar_event" -> {
                        if (!args.containsKey("title")) {
                            return Result.failure(IllegalArgumentException("create_calendar_event requires 'title'"))
                        }
                    }
                    "send_sms_or_place_call" -> {
                        if (!args.containsKey("action") || !args.containsKey("recipient")) {
                            return Result.failure(IllegalArgumentException("send_sms_or_place_call requires 'action' and 'recipient'"))
                        }
                    }
                    "open_installed_app" -> {
                        if (args["appName"]?.jsonPrimitive?.content.isNullOrBlank()) {
                            return Result.failure(IllegalArgumentException("open_installed_app requires non-empty 'appName'"))
                        }
                    }
                    "adjust_device_setting" -> {
                        if (!args.containsKey("target")) {
                            return Result.failure(IllegalArgumentException("adjust_device_setting requires 'target'"))
                        }
                    }
                }
            }
            Result.success(envelope)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
