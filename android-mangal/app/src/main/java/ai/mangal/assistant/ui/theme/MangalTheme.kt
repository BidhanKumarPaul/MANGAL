package ai.mangal.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val MangalObsidianBg = Color(0xFF0B0F17)
val MangalCardSurface = Color(0xFF111827)
val MangalCardBorder = Color(0xFF1E293B)
val MangalAmberPrimary = Color(0xFFF59E0B)
val MangalAmberLight = Color(0xFFFCD34D)
val MangalEmeraldAccent = Color(0xFF10B981)
val MangalRoseDanger = Color(0xFFF43F5E)
val MangalTextPrimary = Color(0xFFF8FAFC)
val MangalTextSecondary = Color(0xFF94A3B8)

private val MangalDarkColors = darkColorScheme(
    primary = MangalAmberPrimary,
    onPrimary = Color(0xFF090D14),
    primaryContainer = Color(0xFF291D0A),
    onPrimaryContainer = MangalAmberLight,
    secondary = MangalEmeraldAccent,
    onSecondary = Color(0xFF051B11),
    secondaryContainer = Color(0xFF062E22),
    onSecondaryContainer = Color(0xFF6EE7B7),
    background = MangalObsidianBg,
    onBackground = MangalTextPrimary,
    surface = MangalObsidianBg,
    onSurface = MangalTextPrimary,
    surfaceVariant = MangalCardSurface,
    onSurfaceVariant = MangalTextSecondary,
    error = MangalRoseDanger,
    onError = Color.White
)

@Composable
fun MangalTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MangalDarkColors,
        content = content
    )
}
