package ai.mangal.assistant.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Renders the MANGAL brand logo: warm amber-bronze radial glow behind an ivory capsule
 * microphone with 3 concentric acoustic wave arcs on each side.
 */
@Composable
fun MangalBrandLogo(
    size: Dp = 44.dp,
    isPulsingWake: Boolean = false
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.24f))
            .background(Color(0xFF120E0A)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(size)) {
            val w = this.size.width
            val h = this.size.height
            val center = Offset(w * 0.5f, h * 0.48f)

            // Warm Amber-Bronze Halo Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        if (isPulsingWake) Color(0xFFD97706) else Color(0xFF9A5B22),
                        Color(0xFF4B290C),
                        Color(0x00120E0A)
                    ),
                    center = center,
                    radius = w * 0.44f
                ),
                radius = w * 0.44f,
                center = center
            )

            val ivory = Color(0xFFEFE6D5)
            val strokeW = w * 0.045f

            // Central Capsule Microphone
            val capW = w * 0.18f
            val capH = h * 0.34f
            drawRoundRect(
                color = ivory,
                topLeft = Offset(center.x - capW / 2f, center.y - capH / 2f),
                size = Size(capW, capH),
                cornerRadius = CornerRadius(capW / 2f, capW / 2f)
            )

            // Stand Stem & Base
            drawLine(
                color = ivory,
                start = Offset(center.x, center.y + capH * 0.55f),
                end = Offset(center.x, center.y + capH * 0.78f),
                strokeWidth = strokeW,
                cap = StrokeCap.Round
            )
            drawLine(
                color = ivory,
                start = Offset(center.x - capW * 0.55f, center.y + capH * 0.78f),
                end = Offset(center.x + capW * 0.55f, center.y + capH * 0.78f),
                strokeWidth = strokeW,
                cap = StrokeCap.Round
            )

            // 3 Concentric Acoustic Wave Arcs (Left & Right)
            val radii = listOf(w * 0.18f, w * 0.27f, w * 0.36f)
            radii.forEach { r ->
                drawArc(
                    color = ivory,
                    startAngle = 140f,
                    sweepAngle = 80f,
                    useCenter = false,
                    topLeft = Offset(center.x - r, center.y - r),
                    size = Size(r * 2f, r * 2f),
                    style = Stroke(width = strokeW * 0.85f, cap = StrokeCap.Round)
                )
                drawArc(
                    color = ivory,
                    startAngle = -40f,
                    sweepAngle = 80f,
                    useCenter = false,
                    topLeft = Offset(center.x - r, center.y - r),
                    size = Size(r * 2f, r * 2f),
                    style = Stroke(width = strokeW * 0.85f, cap = StrokeCap.Round)
                )
            }
        }
    }
}
