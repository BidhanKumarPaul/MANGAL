package ai.mangal.assistant.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import ai.mangal.assistant.MainActivity
import ai.mangal.core.stt.AudioRecordPcmCapture
import ai.mangal.core.stt.OpenWakeWordDetector
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import javax.inject.Inject

/**
 * Play-Protect-Compliant Hands-Free Foreground Service for "Mangal" Wake Word Detection.
 * Declares explicit FOREGROUND_SERVICE_TYPE_MICROPHONE with a transparent user-visible
 * notification so Android 14/15 and Google Play Protect verify user-initiated mic capture.
 */
@AndroidEntryPoint
class MangalWakeWordForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "mangal_wake_word_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_WAKE_LISTENING = "ai.mangal.assistant.START_WAKE_LISTENING"
        const val ACTION_STOP_WAKE_LISTENING = "ai.mangal.assistant.STOP_WAKE_LISTENING"
        const val ACTION_WAKE_WORD_DETECTED = "ai.mangal.assistant.WAKE_WORD_DETECTED"
    }

    @Inject
    lateinit var pcmCapture: AudioRecordPcmCapture

    @Inject
    lateinit var wakeWordDetector: OpenWakeWordDetector

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_WAKE_LISTENING) {
            pcmCapture.stopAndDrainPcmBuffer()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        createNotificationChannelIfNeeded()
        val notification = buildForegroundNotification(
            statusText = "Hands-free active — Say \"Mangal\" to start speaking"
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        startWakeWordLoop()
        return START_STICKY
    }

    private fun startWakeWordLoop() {
        pcmCapture.startCapture(serviceScope) { frame ->
            val triggered = wakeWordDetector.processFrame80ms(frame.pcmFloat16kHz)
            if (triggered) {
                playWakeEarcon()
                val broadcast = Intent(ACTION_WAKE_WORD_DETECTED).apply {
                    setPackage(packageName)
                }
                sendBroadcast(broadcast)
            }
        }
    }

    private fun playWakeEarcon() {
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 75)
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 140)
        } catch (_: Exception) {
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("MANGAL Offline Assistant")
            .setContentText(statusText)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MANGAL Hands-Free Wake Word",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Displays when MANGAL is listening offline for the 'Mangal' wake word."
            }
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        pcmCapture.stopAndDrainPcmBuffer()
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
