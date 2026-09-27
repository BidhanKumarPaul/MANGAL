package ai.mangal.assistant.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import kotlin.math.PI
import kotlin.math.sin

/**
 * Renders the MANGAL brand logo with a smooth, reactive acoustic wave animation
 * when the assistant is in WAKE_TRIGGERED_LISTENING mode.
 */
@Composable
fun MangalBrandLogo(
    size: Dp = 44.dp,
    isPulsingWake: Boolean = false,
    isWakeTriggeredListening: Boolean = false,
    rmsLevel: Float = 0.08f
) {
    val infiniteTransition = rememberInfiniteTransition(label = "MangalWaveTransition")

    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = if (isWakeTriggeredListening) 950 else 2200,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "wavePhase"
    )

    val haloPulse by infiniteTransition.animateFloat(
        initialValue = 0.88f,
        targetValue = 1.14f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = if (isWakeTriggeredListening) 520 else 1400,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "haloPulse"
    )

    val smoothedRms by animateFloatAsState(
        targetValue = rmsLevel.coerceIn(0.04f, 1.0f),
        animationSpec = tween(durationMillis = 120),
        label = "smoothedRms"
    )

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

            val activeBoost = if (isWakeTriggeredListening) (0.15f + smoothedRms * 0.28f) else 0f
            val glowRadius = (w * 0.44f * (if (isPulsingWake || isWakeTriggeredListening) haloPulse else 1f) * (1f + activeBoost))
                .coerceAtMost(w * 0.58f)

            // Warm Amber-Bronze Halo Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        when {
                            isWakeTriggeredListening -> Color(0xFFF59E0B)
                            isPulsingWake -> Color(0xFFD97706)
                            else -> Color(0xFF9A5B22)
                        },
                        Color(0xFF4B290C),
                        Color(0x00120E0A)
                    ),
                    center = center,
                    radius = glowRadius
                ),
                radius = glowRadius,
                center = center
            )

            // Expanding Acoustic Ring Ripple in WAKE_TRIGGERED_LISTENING mode
            if (isWakeTriggeredListening) {
                val rippleProgress = (wavePhase / (2f * PI.toFloat())).coerceIn(0f, 1f)
                val rippleRadius = w * (0.18f + rippleProgress * 0.32f)
                drawCircle(
                    color = Color(0xFFFBBF24).copy(alpha = (1f - rippleProgress) * 0.55f),
                    radius = rippleRadius,
                    center = center,
                    style = Stroke(width = w * 0.022f)
                )
            }

            val ivory = Color(0xFFEFE6D5)
            val amberWave = Color(0xFFFBBF24)
            val strokeW = w * 0.045f

            // Central Capsule Microphone
            val capScale = if (isWakeTriggeredListening) (1f + smoothedRms * 0.08f) else 1f
            val capW = w * 0.18f * capScale
            val capH = h * 0.34f * capScale
            drawRoundRect(
                color = if (isWakeTriggeredListening) Color(0xFFFFFBEB) else ivory,
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

            // 3 Concentric Reactive Acoustic Wave Arcs (Left & Right)
            val baseRadii = listOf(w * 0.18f, w * 0.27f, w * 0.36f)
            baseRadii.forEachIndexed { index, baseR ->
                val phaseOffset = index * 0.95f
                val waveOsc = sin(wavePhase - phaseOffset)
                val dynamicRadius = if (isWakeTriggeredListening) {
                    baseR * (1f + waveOsc * (0.06f + smoothedRms * 0.09f))
                } else if (isPulsingWake) {
                    baseR * (1f + waveOsc * 0.025f)
                } else {
                    baseR
                }

                val dynamicSweep = if (isWakeTriggeredListening) {
                    80f + waveOsc * (12f + smoothedRms * 18f)
                } else {
                    80f
                }

                val arcAlpha = if (isWakeTriggeredListening) {
                    (0.68f + 0.32f * ((waveOsc + 1f) * 0.5f)).coerceIn(0.35f, 1f)
                } else {
                    1f - index * 0.15f
                }

                val arcColor = if (isWakeTriggeredListening && index == 0) {
                    amberWave.copy(alpha = arcAlpha)
                } else if (isWakeTriggeredListening) {
                    ivory.copy(alpha = arcAlpha)
                } else {
                    ivory.copy(alpha = arcAlpha)
                }

                val startLeft = 180f - dynamicSweep / 2f
                val startRight = -dynamicSweep / 2f

                drawArc(
                    color = arcColor,
                    startAngle = startLeft,
                    sweepAngle = dynamicSweep,
                    useCenter = false,
                    topLeft = Offset(center.x - dynamicRadius, center.y - dynamicRadius),
                    size = Size(dynamicRadius * 2f, dynamicRadius * 2f),
                    style = Stroke(
                        width = strokeW * (if (isWakeTriggeredListening) 0.95f else 0.85f),
                        cap = StrokeCap.Round
                    )
                )
                drawArc(
                    color = arcColor,
                    startAngle = startRight,
                    sweepAngle = dynamicSweep,
                    useCenter = false,
                    topLeft = Offset(center.x - dynamicRadius, center.y - dynamicRadius),
                    size = Size(dynamicRadius * 2f, dynamicRadius * 2f),
                    style = Stroke(
                        width = strokeW * (if (isWakeTriggeredListening) 0.95f else 0.85f),
                        cap = StrokeCap.Round
                    )
                )
            }
        }
    }
}
