import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Flashlight,
  BatteryCharging,
  ShieldCheck,
  Terminal,
  Home,
  CornerUpLeft,
  Square,
  Power,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bell,
  Clock,
  Calendar,
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cpu,
  Play,
  Sliders,
  Download
} from 'lucide-react';

export interface LogcatEntry {
  id: string;
  timestamp: string;
  pid: string;
  tag: string;
  level: 'D' | 'I' | 'W' | 'E';
  message: string;
}

type EmulatorOsView =
  | 'LOCK_SCREEN'
  | 'PIXEL_LAUNCHER'
  | 'MANGAL_APP'
  | 'PLAY_PROTECT_SCANNER'
  | 'SYSTEM_SMS_INTENT'
  | 'SYSTEM_DIALER_INTENT'
  | 'SYSTEM_ALARM_INTENT'
  | 'SYSTEM_CALENDAR_INTENT';

type MangalAppTab = 'voice_chat' | 'model_manager' | 'settings';

interface SimulatedModel {
  modelId: string;
  displayName: string;
  category: 'LLM_GGUF' | 'STT_WHISPER' | 'WAKE_WORD';
  quantization: string;
  sizeMb: number;
  requiredRamMb: number;
  license: string;
  sha256: string;
  downloaded: boolean;
  isActive: boolean;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  triggeredByWakeWord?: boolean;
  sttLatencyMs?: number;
  llmTokensPerSec?: number;
  toolCallJson?: string;
  toolExecutionResult?: {
    toolName: string;
    success: boolean;
    summary: string;
    launchedIntentLabel?: string;
    onOpenIntentSheet?: () => void;
  };
  timestamp: string;
}

/**
 * Exact MANGAL Brand Icon SVG (matching user's uploaded image & ic_launcher_foreground.xml)
 */
export function MangalAppIconSvg({
  size = 56,
  pulsing = false,
  showWordmark = false
}: {
  size?: number;
  pulsing?: boolean;
  showWordmark?: boolean;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-[22%] bg-[#120E0A] border border-[#3B2614] flex items-center justify-center overflow-hidden shrink-0 select-none transition-transform ${
        pulsing ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/30 scale-105' : ''
      }`}
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="emulatorIconGlow" cx="50%" cy="45%" r="42%">
            <stop
              offset="0%"
              stopColor={pulsing ? '#F59E0B' : '#9A5B22'}
              stopOpacity={pulsing ? '0.98' : '0.92'}
            />
            <stop offset="55%" stopColor="#4B290C" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#120E0A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="96" fill="#120E0A" />
        <circle cx="256" cy="230" r="205" fill="url(#emulatorIconGlow)" />
        {/* Outer Wave Arcs */}
        <path
          d="M123 108 C62 164 62 278 123 334"
          stroke="#9A9183"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M389 108 C450 164 450 278 389 334"
          stroke="#9A9183"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Middle Wave Arcs */}
        <path
          d="M156 138 C108 181 108 261 156 304"
          stroke="#CFC5B4"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M356 138 C404 181 404 261 356 304"
          stroke="#CFC5B4"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Inner Wave Arcs */}
        <path
          d="M192 171 C166 196 166 246 192 271"
          stroke="#EFE6D5"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M320 171 C346 196 346 246 320 271"
          stroke="#EFE6D5"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Capsule Microphone */}
        <rect x="216" y="136" width="80" height="148" rx="40" fill="#EFE6D5" />
        {/* Stand & Base */}
        <path
          d="M201 290 C214 320 234 332 256 332 C278 332 298 320 311 290"
          stroke="#EFE6D5"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <line x1="256" y1="306" x2="256" y2="338" stroke="#EFE6D5" strokeWidth="13" />
        <line x1="216" y1="338" x2="296" y2="338" stroke="#EFE6D5" strokeWidth="13" />
        {showWordmark && (
          <text
            x="256"
            y="454"
            textAnchor="middle"
            fill="#CFC5B4"
            fontFamily="Georgia, serif"
            fontSize="36"
            fontWeight="bold"
            letterSpacing="14"
          >
            MANGAL
          </text>
        )}
      </svg>
    </div>
  );
}

const INITIAL_MODELS: SimulatedModel[] = [
  {
    modelId: 'qwen2.5-1.5b-instruct-q4_k_m',
    displayName: 'Qwen 2.5 1.5B Instruct (Q4_K_M)',
    category: 'LLM_GGUF',
    quantization: 'Q4_K_M',
    sizeMb: 1120,
    requiredRamMb: 3072,
    license: 'Apache-2.0',
    sha256: '6b7e92e40a99',
    downloaded: true,
    isActive: true
  },
  {
    modelId: 'qwen2.5-3b-instruct-q4_k_m',
    displayName: 'Qwen 2.5 3B Instruct (Q4_K_M)',
    category: 'LLM_GGUF',
    quantization: 'Q4_K_M',
    sizeMb: 2105,
    requiredRamMb: 5632,
    license: 'Apache-2.0',
    sha256: '9f1a48b2d307',
    downloaded: false,
    isActive: false
  },
  {
    modelId: 'gemma-3-4b-it-q4_k_m',
    displayName: 'Gemma 3 4B Instruct (Q4_K_M)',
    category: 'LLM_GGUF',
    quantization: 'Q4_K_M',
    sizeMb: 2650,
    requiredRamMb: 6144,
    license: 'Gemma ToU',
    sha256: '3c8d71a4b9e0',
    downloaded: false,
    isActive: false
  },
  {
    modelId: 'whisper-tiny-en-q8_0',
    displayName: 'Whisper Tiny.en (INT8 / Q8_0)',
    category: 'STT_WHISPER',
    quantization: 'Q8_0',
    sizeMb: 42,
    requiredRamMb: 1024,
    license: 'MIT',
    sha256: 'c4e8a912b7d0',
    downloaded: true,
    isActive: true
  },
  {
    modelId: 'openwakeword-hey-mangal-v1',
    displayName: 'openWakeWord "Mangal" Detector (ONNX)',
    category: 'WAKE_WORD',
    quantization: 'INT8',
    sizeMb: 2.4,
    requiredRamMb: 512,
    license: 'Apache-2.0',
    sha256: 'f0e1d2c3b4a5',
    downloaded: true,
    isActive: true
  }
];

export default function AndroidEmulatorWorkspace({
  onInspectSourceFile
}: {
  onInspectSourceFile: (path: string) => void;
}) {
  // Emulator OS State
  const [osView, setOsView] = useState<EmulatorOsView>('MANGAL_APP');
  const [mangalTab, setMangalTab] = useState<MangalAppTab>('voice_chat');
  const [shadeOpen, setShadeOpen] = useState<boolean>(false);
  const [showIconShortcuts, setShowIconShortcuts] = useState<boolean>(false);

  // Hardware & System Toggles inside Emulator
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [mediaVolume, setMediaVolume] = useState<number>(80);
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(false); // 100% offline by default!
  const [deviceRamMb, setDeviceRamMb] = useState<number>(8192);
  const [thermalStatus, setThermalStatus] = useState<'NOMINAL' | 'MODERATE'>('NOMINAL');

  // Hands-Free "Mangal" Wake Word & Real Browser Mic State
  const [wakeServiceRunning, setWakeServiceRunning] = useState<boolean>(true);
  const [continuousRealMicActive, setContinuousRealMicActive] = useState<boolean>(false);
  const [wakeTriggeredListening, setWakeTriggeredListening] = useState<boolean>(false);
  const [liveHeardTranscript, setLiveHeardTranscript] = useState<string>('');
  const [rmsEnergy, setRmsEnergy] = useState<number>(0.04);

  // Native TTS & Model State
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [ttsMuted, setTtsMuted] = useState<boolean>(false);
  const [models, setModels] = useState<SimulatedModel[]>(INITIAL_MODELS);
  const [modelErrorBanner, setModelErrorBanner] = useState<string | null>(null);
  const [inputDraft, setInputDraft] = useState<string>('');

  // Intent Sheet State (for SMS, Dialer, Alarm, Calendar)
  const [lastIntentPayload, setLastIntentPayload] = useState<{
    recipient?: string;
    body?: string;
    alarmTime?: string;
    alarmLabel?: string;
    eventTitle?: string;
    eventDuration?: number;
  }>({
    recipient: '+1-555-0192',
    body: 'Running 10 minutes late',
    alarmTime: '06:30',
    alarmLabel: 'Morning Workout',
    eventTitle: 'Design Review',
    eventDuration: 45
  });

  // Live Logcat Stream
  const [logcat, setLogcat] = useState<LogcatEntry[]>([
    {
      id: 'log-1',
      timestamp: '09:41:00.104',
      pid: '4812-4812',
      tag: 'MangalApplication',
      level: 'I',
      message: 'Hilt DI initialized. SQLCipher AES-256 database opened (mangal_encrypted.db).'
    },
    {
      id: 'log-2',
      timestamp: '09:41:00.218',
      pid: '4812-4849',
      tag: 'LlamaJniBridge',
      level: 'I',
      message:
        'Loaded qwen2.5-1.5b-instruct-q4_k_m.gguf (mmap=true, n_ctx=4096, threads=4, 16KB ELF aligned).'
    },
    {
      id: 'log-3',
      timestamp: '09:41:00.340',
      pid: '4812-4862',
      tag: 'MangalWakeWordSvc',
      level: 'I',
      message:
        'startForeground(1001, FOREGROUND_SERVICE_TYPE_MICROPHONE) — Listening for wake phrase "Mangal".'
    },
    {
      id: 'log-4',
      timestamp: '09:41:00.412',
      pid: '1920-2104',
      tag: 'PlayProtectVerifier',
      level: 'I',
      message:
        'Package ai.mangal.assistant verified: APK Signature Scheme v3 OK, 0 restricted SMS/Call permissions.'
    }
  ]);

  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'MANGAL v1.1 running inside Android 15 (API 35) Emulator. Hands-free wake word is active: say "Mangal" (like "Hey Google") or tap any voice command to watch the live native pipeline and Logcat.',
      timestamp: '09:41:00'
    }
  ]);

  const appendLog = useCallback(
    (tag: string, level: LogcatEntry['level'], message: string) => {
      const now = new Date();
      const ts = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setLogcat((prev) => [
        ...prev.slice(-35),
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: ts,
          pid: '4812-4862',
          tag,
          level,
          message
        }
      ]);
    },
    []
  );

  // Acoustic wake earcon (matches ToneGenerator.TONE_PROP_BEEP in MangalWakeWordForegroundService.kt)
  const playWakeEarcon = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.13);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {
      // ignore if audio context blocked
    }
  }, []);

  const speakViaAndroidTts = useCallback(
    (text: string) => {
      if (ttsMuted || mediaVolume === 0) {
        appendLog('AndroidNativeTts', 'D', 'Skipped TTS playback (muted or STREAM_MUSIC volume=0).');
        return;
      }
      appendLog(
        'AndroidNativeTts',
        'I',
        `speakOffline(rate=${speechRate.toFixed(2)}, pitch=${speechPitch.toFixed(2)}, KEY_FEATURE_NETWORK_SYNTHESIS=false)`
      );
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechRate;
        utterance.pitch = speechPitch;
        utterance.volume = mediaVolume / 100;
        window.speechSynthesis.speak(utterance);
      }
    },
    [ttsMuted, mediaVolume, speechRate, speechPitch, appendLog]
  );

  // Execute a full offline voice turn through OpenWakeWordDetector -> WhisperJniBridge -> LlamaJniBridge -> AndroidToolExecutor
  const executeFullVoiceLoop = useCallback(
    (rawUtterance: string, isWakeTriggered = false) => {
      const trimmed = rawUtterance.trim();
      if (!trimmed) return;

      // Check wake word prefix ("Mangal" / "Hey Mangal")
      const wakeRegex = /^(?:hey\s+)?mangal\b[\s,.:;-]*(.*)$/i;
      const match = trimmed.match(wakeRegex);
      const wokeByPhrase = isWakeTriggered || Boolean(match);
      const commandBody = match && match[1].trim().length > 0 ? match[1].trim() : trimmed;

      // Ensure MANGAL_APP is foregrounded if woken from Home Screen
      setOsView('MANGAL_APP');
      setMangalTab('voice_chat');

      if (wokeByPhrase) {
        playWakeEarcon();
        setWakeTriggeredListening(true);
        appendLog(
          'OpenWakeWordDetector',
          'I',
          `Wake phrase "Mangal" detected (confidence=0.91 >= threshold=0.52). Transitioning to COMMAND_CAPTURE.`
        );
        setTimeout(() => setWakeTriggeredListening(false), 1600);
      }

      appendLog(
        'WhisperJniBridge',
        'D',
        `transcribePcm(samples=24320, threads=4) -> "${trimmed}" (136ms)`
      );

      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const userTurn: ChatTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        triggeredByWakeWord: wokeByPhrase,
        sttLatencyMs: 136,
        timestamp: nowTime
      };

      // If user only said "Mangal" with no command yet
      if (/^(?:hey\s+)?mangal$/i.test(trimmed)) {
        const promptReply = "I'm listening. Go ahead with your command.";
        setChatHistory((prev) => [
          ...prev,
          userTurn,
          {
            id: `a-${Date.now() + 1}`,
            role: 'assistant',
            text: promptReply,
            triggeredByWakeWord: true,
            llmTokensPerSec: 32.0,
            timestamp: nowTime
          }
        ]);
        speakViaAndroidTts(promptReply);
        return;
      }

      const lower = commandBody.toLowerCase();
      let toolCallJson: string | undefined;
      let toolResult: ChatTurn['toolExecutionResult'];
      let replyText = '';

      // 1. Alarm or Timer
      if (lower.includes('alarm') || lower.includes('timer') || lower.includes('wake me')) {
        const payload = {
          type: 'tool_call',
          toolName: 'set_alarm_or_timer',
          arguments: { mode: 'alarm', hour: 6, minute: 30, message: 'Morning Workout' }
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        setLastIntentPayload((p) => ({
          ...p,
          alarmTime: '06:30',
          alarmLabel: 'Morning Workout'
        }));
        appendLog(
          'AndroidToolExecutor',
          'I',
          'startActivity(Intent(AlarmClock.ACTION_SET_ALARM) { hour=6, min=30, skipUi=true })'
        );
        toolResult = {
          toolName: 'set_alarm_or_timer',
          success: true,
          summary: 'Scheduled 06:30 alarm ("Morning Workout") via AlarmClock.ACTION_SET_ALARM.',
          launchedIntentLabel: 'Open Clock Alarm View',
          onOpenIntentSheet: () => setOsView('SYSTEM_ALARM_INTENT')
        };
        replyText = "Done. I've set your alarm for 6:30 AM labeled Morning Workout.";
      }
      // 2. Flashlight / Torch
      else if (lower.includes('flashlight') || lower.includes('torch')) {
        const turnOn = !lower.includes('off');
        setTorchOn(turnOn);
        const payload = {
          type: 'tool_call',
          toolName: 'adjust_device_setting',
          arguments: { target: 'flashlight', state: turnOn ? 'on' : 'off' }
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        appendLog(
          'AndroidToolExecutor',
          'I',
          `CameraManager.setTorchMode(cameraId="0", enabled=${turnOn})`
        );
        toolResult = {
          toolName: 'adjust_device_setting',
          success: true,
          summary: `Hardware Torch ${turnOn ? 'ENABLED' : 'DISABLED'} via CameraManager.setTorchMode("0", ${turnOn}).`
        };
        replyText = `I've turned the flashlight ${turnOn ? 'on' : 'off'}.`;
      }
      // 3. Volume
      else if (lower.includes('volume')) {
        const isDown = lower.includes('down') || lower.includes('lower');
        const nextVol = isDown ? Math.max(0, mediaVolume - 20) : Math.min(100, mediaVolume + 20);
        setMediaVolume(nextVol);
        const payload = {
          type: 'tool_call',
          toolName: 'adjust_device_setting',
          arguments: { target: 'volume', state: isDown ? 'down' : 'up' }
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        appendLog(
          'AndroidToolExecutor',
          'I',
          `AudioManager.adjustStreamVolume(STREAM_MUSIC) -> ${nextVol}%`
        );
        toolResult = {
          toolName: 'adjust_device_setting',
          success: true,
          summary: `Adjusted STREAM_MUSIC media volume to ${nextVol}%.`
        };
        replyText = `Media volume set to ${nextVol} percent.`;
      }
      // 4. Calendar Event
      else if (
        lower.includes('calendar') ||
        lower.includes('schedule') ||
        lower.includes('meeting') ||
        lower.includes('event')
      ) {
        const payload = {
          type: 'tool_call',
          toolName: 'create_calendar_event',
          arguments: {
            title: 'Design Review',
            startEpochMs: 1790460000000,
            durationMinutes: 45
          }
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        setLastIntentPayload((p) => ({
          ...p,
          eventTitle: 'Design Review',
          eventDuration: 45
        }));
        appendLog(
          'AndroidToolExecutor',
          'I',
          'contentResolver.insert(CalendarContract.Events.CONTENT_URI, title="Design Review")'
        );
        toolResult = {
          toolName: 'create_calendar_event',
          success: true,
          summary: 'Inserted "Design Review" (45 min) into local CalendarContract.Events.',
          launchedIntentLabel: 'View Calendar Event',
          onOpenIntentSheet: () => setOsView('SYSTEM_CALENDAR_INTENT')
        };
        replyText = "I've scheduled 'Design Review' for 45 minutes in your local calendar.";
      }
      // 5. Play-Protect-Safe SMS or Call
      else if (lower.includes('sms') || lower.includes('text') || lower.includes('call ')) {
        const isCall = lower.includes('call ');
        const payload = isCall
          ? {
              type: 'tool_call',
              toolName: 'send_sms_or_place_call',
              arguments: { action: 'call', recipient: '+1-555-0192' }
            }
          : {
              type: 'tool_call',
              toolName: 'send_sms_or_place_call',
              arguments: {
                action: 'sms',
                recipient: '+1-555-0192',
                body: 'Running 10 minutes late'
              }
            };
        toolCallJson = JSON.stringify(payload, null, 2);
        setLastIntentPayload((p) => ({
          ...p,
          recipient: '+1-555-0192',
          body: 'Running 10 minutes late'
        }));
        appendLog(
          'AndroidToolExecutor',
          'I',
          isCall
            ? 'startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:+1-555-0192"))) [Play Protect Safe]'
            : 'startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:+1-555-0192"))) [Play Protect Safe]'
        );
        toolResult = {
          toolName: 'send_sms_or_place_call',
          success: true,
          summary: isCall
            ? 'Launched system Dialer via ACTION_DIAL (0 restricted permissions).'
            : 'Launched system Messages composer via ACTION_SENDTO (Play Protect safe).',
          launchedIntentLabel: isCall ? 'Open System Dialer' : 'Open Messages Sheet',
          onOpenIntentSheet: () =>
            setOsView(isCall ? 'SYSTEM_DIALER_INTENT' : 'SYSTEM_SMS_INTENT')
        };
        replyText = isCall
          ? 'Opening your phone dialer for +1-555-0192.'
          : 'Prepared your SMS to +1-555-0192 in Android Messages.';
      }
      // 6. Open Installed App
      else if (lower.includes('open ') || lower.includes('launch ')) {
        const appName =
          commandBody
            .replace(/^(open|launch)\s+/i, '')
            .replace(/on my phone/i, '')
            .trim() || 'Spotify';
        const payload = {
          type: 'tool_call',
          toolName: 'open_installed_app',
          arguments: { appName }
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        appendLog(
          'AndroidToolExecutor',
          'I',
          `PackageManager.getLaunchIntentForPackage(query="${appName}") -> Launched`
        );
        toolResult = {
          toolName: 'open_installed_app',
          success: true,
          summary: `Resolved "${appName}" via PackageManager.queryIntentActivities and started activity.`
        };
        replyText = `Opening ${appName}.`;
      }
      // 7. General Offline Q&A
      else {
        const payload = {
          type: 'reply',
          replyText:
            'Lithium-ion batteries store energy by moving lithium ions between a graphite anode and a metal-oxide cathode. Note: Because I run 100% offline on-device, I have no internet connection for live weather or breaking news.'
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        appendLog(
          'LlamaJniBridge',
          'I',
          'completionWithGrammar() -> generated 44 tokens at 29.4 tok/s (offline).'
        );
        replyText = payload.replyText;
      }

      const assistantTurn: ChatTurn = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        triggeredByWakeWord: wokeByPhrase,
        llmTokensPerSec: thermalStatus === 'MODERATE' ? 14.8 : 29.4,
        toolCallJson,
        toolExecutionResult: toolResult,
        timestamp: nowTime
      };

      setChatHistory((prev) => [...prev, userTurn, assistantTurn]);
      speakViaAndroidTts(replyText);
    },
    [playWakeEarcon, appendLog, mediaVolume, thermalStatus, speakViaAndroidTts]
  );

  // Continuous Real Browser Microphone Wake-Word Listener ("Mangal")
  const recognitionRef = useRef<unknown>(null);

  const toggleRealMicWakeLoop = () => {
    if (continuousRealMicActive) {
      setContinuousRealMicActive(false);
      setLiveHeardTranscript('');
      if (recognitionRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (recognitionRef.current as any).stop();
        } catch {
          // ignore
        }
      }
      appendLog('AudioRecordPcmCapture', 'I', 'Stopped live browser microphone stream.');
      return;
    }

    const SpeechRec =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (typeof SpeechRec === 'function') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = new (SpeechRec as any)();
        recognitionRef.current = rec;
        rec.lang = 'en-US';
        rec.continuous = true;
        rec.interimResults = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
          const lastIdx = event.results.length - 1;
          const transcript = String(event.results[lastIdx][0].transcript || '').trim();
          const isFinal = Boolean(event.results[lastIdx].isFinal);
          setLiveHeardTranscript(transcript);
          setRmsEnergy(0.28 + Math.random() * 0.45);

          if (isFinal && transcript.length > 0) {
            setLiveHeardTranscript('');
            setRmsEnergy(0.04);
            executeFullVoiceLoop(transcript, true);
          }
        };

        rec.onerror = () => {
          setContinuousRealMicActive(false);
          appendLog(
            'AudioRecordPcmCapture',
            'W',
            'Browser mic permission declined or unavailable in iframe; use instant voice buttons.'
          );
        };

        rec.onend = () => {
          setContinuousRealMicActive(false);
          setRmsEnergy(0.04);
        };

        rec.start();
        setContinuousRealMicActive(true);
        appendLog(
          'AudioRecordPcmCapture',
          'I',
          'Live 16kHz microphone capture started — Say "Mangal, <your command>" out loud!'
        );
        return;
      } catch {
        setContinuousRealMicActive(false);
      }
    }

    // Fallback simulated wake capture if browser SpeechRecognition is blocked
    setContinuousRealMicActive(true);
    setLiveHeardTranscript('Mangal, turn on the flashlight...');
    setTimeout(() => {
      setContinuousRealMicActive(false);
      setLiveHeardTranscript('');
      executeFullVoiceLoop('Mangal, turn on the flashlight', true);
    }, 1100);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (recognitionRef.current as any).stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleModelAction = (model: SimulatedModel) => {
    setModelErrorBanner(null);
    const safeLimit = Math.floor(deviceRamMb * 0.78);
    if (model.requiredRamMb > safeLimit) {
      const errMsg = `OOM Refusal: ${model.displayName} needs ${model.requiredRamMb} MB RAM (>78% of ${deviceRamMb} MB device).`;
      setModelErrorBanner(errMsg);
      appendLog('DeviceHealthAndRamGuard', 'E', errMsg);
      return;
    }
    setModels((prev) =>
      prev.map((m) =>
        m.category === model.category
          ? { ...m, isActive: m.modelId === model.modelId, downloaded: m.modelId === model.modelId ? true : m.downloaded }
          : m
      )
    );
    appendLog(
      'LlamaJniBridge',
      'I',
      `Switched active ${model.category} model -> ${model.modelId} (setExecutable=false, setWritable=false)`
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
      {/* LEFT / CENTER: REALISTIC PIXEL 9 PRO ANDROID 15 EMULATOR + QEMU SIDEBAR (6 cols) */}
      <div className="lg:col-span-6 flex flex-col items-center">
        {/* Emulator Window Title Bar */}
        <div className="w-full max-w-[468px] flex items-center justify-between px-3.5 py-2 rounded-t-2xl bg-slate-900 border border-b-0 border-slate-800 text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-semibold text-white">
              Android Emulator — Pixel_9_Pro_API_35:5554
            </span>
          </div>
          <span className="text-slate-400 tabular-nums">arm64-v8a · Android 15</span>
        </div>

        <div className="flex items-stretch justify-center w-full max-w-[468px]">
          {/* PIXEL 9 PRO HARDWARE CHASSIS */}
          <div
            className={`relative flex-1 bg-[#080A0F] border-4 rounded-b-[40px] rounded-tl-[4px] p-2.5 shadow-2xl transition-shadow ${
              torchOn
                ? 'border-amber-300/90 shadow-[0_0_55px_rgba(251,191,36,0.35)]'
                : 'border-slate-800'
            }`}
          >
            {/* Flashlight Hardware Beam Banner when Torch is ON */}
            {torchOn && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-mono font-bold shadow-md z-30 flex items-center gap-1">
                <Flashlight className="w-3 h-3" />
                <span>CAMERA TORCH ON</span>
              </div>
            )}

            {/* INNER AMOLED VIEWPORT (1080x2424 Aspect Ratio) */}
            <div className="relative h-[700px] w-full bg-[#0D1118] rounded-[30px] overflow-hidden flex flex-col justify-between border border-slate-800/80 select-none">
              {/* ANDROID 15 STATUS BAR (Clickable to toggle Notification Shade) */}
              <div
                onClick={() => setShadeOpen((v) => !v)}
                className="px-5 pt-2.5 pb-2 flex items-center justify-between text-[11px] font-mono text-slate-200 bg-black/40 backdrop-blur-xs z-30 cursor-pointer hover:bg-black/60 transition-colors"
                title="Click to pull down Android 15 Notification & Quick Settings Shade"
              >
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-semibold">09:41</span>
                  {wakeServiceRunning && (
                    <span title="MangalWakeWordForegroundService">
                      <Radio className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>

                {/* Pixel 9 Pro Punch-Hole Front Camera */}
                <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800" />

                {/* Right Status Icons + Android 15 Green Microphone Privacy Chip */}
                <div className="flex items-center gap-1.5">
                  {wifiEnabled ? (
                    <Wifi className="w-3 h-3 text-slate-300" />
                  ) : (
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-300">
                      OFFLINE
                    </span>
                  )}
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  {wakeServiceRunning && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-sans font-bold flex items-center gap-1 ${
                        wakeTriggeredListening || continuousRealMicActive
                          ? 'bg-amber-400 text-slate-950 animate-pulse'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                      title="Android 15 Privacy Indicator: Microphone in use by MANGAL"
                    >
                      <Mic className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* ANDROID 15 PULL-DOWN NOTIFICATION & QUICK SETTINGS SHADE OVERLAY */}
              {shadeOpen && (
                <div className="absolute inset-x-0 top-9 bottom-11 bg-[#0B0E14]/95 backdrop-blur-md z-30 p-4 flex flex-col justify-between border-b border-slate-800">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold">Sat, Sep 26 · Android 15</span>
                      <button
                        onClick={() => setShadeOpen(false)}
                        className="text-xs text-amber-400 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <span>Close</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Settings Tiles */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => setWifiEnabled((v) => !v)}
                        className={`p-3 rounded-2xl flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                          wifiEnabled
                            ? 'bg-amber-400 text-slate-950 font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                      >
                        {wifiEnabled ? (
                          <Wifi className="w-4 h-4 shrink-0" />
                        ) : (
                          <WifiOff className="w-4 h-4 shrink-0" />
                        )}
                        <div>
                          <div className="text-[11px] leading-tight">Internet / Wi-Fi</div>
                          <div className="text-[10px] opacity-75">
                            {wifiEnabled ? 'Connected' : '100% Offline'}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setTorchOn((v) => !v)}
                        className={`p-3 rounded-2xl flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                          torchOn
                            ? 'bg-amber-400 text-slate-950 font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                      >
                        <Flashlight className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="text-[11px] leading-tight">Flashlight</div>
                          <div className="text-[10px] opacity-75">{torchOn ? 'On' : 'Off'}</div>
                        </div>
                      </button>
                    </div>

                    {/* Persistent ForegroundService Notification (MangalWakeWordForegroundService) */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Active Foreground Service (FOREGROUND_SERVICE_TYPE_MICROPHONE)
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MangalAppIconSvg size={24} pulsing={wakeServiceRunning} />
                            <span className="text-xs font-semibold text-white">
                              MANGAL Offline Assistant
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400">Ongoing</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {wakeServiceRunning
                            ? 'Hands-free active — Say "Mangal" to start speaking (0 bytes network traffic).'
                            : 'Hands-free wake word paused.'}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setWakeServiceRunning((v) => !v);
                              appendLog(
                                'MangalWakeWordSvc',
                                'I',
                                !wakeServiceRunning
                                  ? 'Resumed FOREGROUND_SERVICE_TYPE_MICROPHONE wake listener.'
                                  : 'Stopped foreground wake listener.'
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 cursor-pointer"
                          >
                            {wakeServiceRunning ? 'Pause Wake Word' : 'Resume Wake Word'}
                          </button>
                          <button
                            onClick={() => {
                              setShadeOpen(false);
                              setOsView('PLAY_PROTECT_SCANNER');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] cursor-pointer"
                          >
                            Play Protect Status
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShadeOpen(false)}
                    className="w-12 h-1 rounded-full bg-slate-700 mx-auto cursor-pointer"
                  />
                </div>
              )}

              {/* ==================== OS VIEW 1: PIXEL LAUNCHER HOME SCREEN ==================== */}
              {osView === 'PIXEL_LAUNCHER' && (
                <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-b from-[#15110E] via-[#0F131C] to-[#0A0D14]">
                  {/* Pixel At-a-Glance Widget */}
                  <div className="pt-4 space-y-1">
                    <div className="text-xl font-semibold text-white font-display">
                      Saturday, Sep 26
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Play Protect Verified · Offline AI Ready</span>
                    </div>
                  </div>

                  {/* Center App Grid featuring the Custom MANGAL Adaptive Icon */}
                  <div className="my-auto flex flex-col items-center gap-4">
                    <div className="relative flex flex-col items-center">
                      {showIconShortcuts && (
                        <div className="mb-3 w-56 bg-slate-900/95 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 z-20">
                          <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800">
                            MANGAL App Shortcuts
                          </div>
                          <button
                            onClick={() => {
                              setShowIconShortcuts(false);
                              setOsView('MANGAL_APP');
                              executeFullVoiceLoop('Mangal', true);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-amber-300 flex items-center gap-2 cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>Say &ldquo;Mangal&rdquo; Now</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowIconShortcuts(false);
                              setOsView('MANGAL_APP');
                              setMangalTab('model_manager');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Offline Model Manager</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowIconShortcuts(false);
                              setOsView('PLAY_PROTECT_SCANNER');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-emerald-300 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Play Protect Scan</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setOsView('MANGAL_APP')}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowIconShortcuts((v) => !v);
                        }}
                        className="group flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <MangalAppIconSvg size={84} pulsing={wakeServiceRunning} showWordmark />
                        <span className="text-xs font-semibold text-white group-hover:text-amber-300">
                          MANGAL
                        </span>
                      </button>

                      <button
                        onClick={() => setShowIconShortcuts((v) => !v)}
                        className="mt-2 text-[11px] font-mono text-slate-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        {showIconShortcuts ? 'Hide App Shortcuts' : 'Inspect Adaptive Icon / Shortcuts'}
                      </button>
                    </div>
                  </div>

                  {/* Pixel Dock */}
                  <div className="p-3 rounded-3xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-around">
                    <button
                      onClick={() => setOsView('SYSTEM_DIALER_INTENT')}
                      className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
                      title="System Phone Dialer"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setOsView('SYSTEM_SMS_INTENT')}
                      className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-400 cursor-pointer"
                      title="System Messages"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setOsView('MANGAL_APP')}
                      className="cursor-pointer"
                      title="Launch MANGAL"
                    >
                      <MangalAppIconSvg size={44} pulsing={wakeServiceRunning} />
                    </button>
                    <button
                      onClick={() => setOsView('SYSTEM_ALARM_INTENT')}
                      className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
                      title="System Clock / Alarms"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setOsView('PLAY_PROTECT_SCANNER')}
                      className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
                      title="Google Play Protect"
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== OS VIEW 2: GOOGLE PLAY PROTECT SCANNER SHEET ==================== */}
              {osView === 'PLAY_PROTECT_SCANNER' && (
                <div className="flex-1 p-5 flex flex-col justify-between bg-[#0F141D] overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        <div>
                          <h2 className="text-sm font-semibold text-white">Google Play Protect</h2>
                          <p className="text-[11px] text-slate-400">
                            On-Device APK Verify Apps Scanner
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                        VERIFIED SAFE
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
                      <MangalAppIconSvg size={52} showWordmark />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          MANGAL (ai.mangal.assistant)
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400">
                          No harmful behavior found · v1.1.0-playprotect-safe
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          APK Signature v1 + v2 + v3 + v4 Verified
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="text-[11px] font-mono text-slate-400">
                        Play Protect Heuristic Checks Passed:
                      </div>
                      {[
                        {
                          title: 'Zero Restricted SMS / Call Fraud Permissions',
                          detail:
                            'SEND_SMS and CALL_PHONE omitted from AndroidManifest.xml. Uses ACTION_SENDTO and ACTION_DIAL intents.'
                        },
                        {
                          title: 'Dynamic Code Loading (DCL) Lock',
                          detail:
                            'Model files in Context.filesDir/models/ enforced setExecutable(false) and setWritable(false).'
                        },
                        {
                          title: '16 KB ELF Page Alignment & Uncompressed JNI',
                          detail:
                            'libmangal_llama_jni.so & libmangal_whisper_jni.so linked with -Wl,-z,max-page-size=16384.'
                        },
                        {
                          title: 'Transparent Microphone Foreground Service',
                          detail:
                            'MangalWakeWordForegroundService declares FOREGROUND_SERVICE_TYPE_MICROPHONE with user notification.'
                        }
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/90 flex items-start gap-2.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-200 text-[11px]">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-relaxed">
                              {item.detail}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setOsView('MANGAL_APP')}
                    className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs hover:bg-amber-300 cursor-pointer"
                  >
                    Return to MANGAL Assistant
                  </button>
                </div>
              )}

              {/* ==================== OS VIEW 3: SYSTEM SMS / DIALER / ALARM / CALENDAR INTENTS ==================== */}
              {(osView === 'SYSTEM_SMS_INTENT' ||
                osView === 'SYSTEM_DIALER_INTENT' ||
                osView === 'SYSTEM_ALARM_INTENT' ||
                osView === 'SYSTEM_CALENDAR_INTENT') && (
                <div className="flex-1 p-5 flex flex-col justify-between bg-[#0F141D]">
                  <div className="space-y-4">
                    <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                      Android System Intent Target (Launched by AndroidToolExecutor.kt)
                    </div>

                    {osView === 'SYSTEM_SMS_INTENT' && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                          <MessageSquare className="w-4 h-4" />
                          <span>Android Messages · Intent.ACTION_SENDTO</span>
                        </div>
                        <div className="text-xs font-mono text-slate-300">
                          URI: <code>smsto:{lastIntentPayload.recipient}</code>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100">
                          {lastIntentPayload.body}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Pre-filled by MANGAL without needing <code>SEND_SMS</code> permission, so
                          Google Play Protect never interferes.
                        </p>
                      </div>
                    )}

                    {osView === 'SYSTEM_DIALER_INTENT' && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                          <Phone className="w-4 h-4" />
                          <span>Android Phone Dialer · Intent.ACTION_DIAL</span>
                        </div>
                        <div className="text-lg font-mono text-white">
                          {lastIntentPayload.recipient}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Launched via Play-Protect-safe <code>ACTION_DIAL</code>.
                        </p>
                      </div>
                    )}

                    {osView === 'SYSTEM_ALARM_INTENT' && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Android Clock · AlarmClock.ACTION_SET_ALARM</span>
                        </div>
                        <div className="text-2xl font-mono font-bold text-white">
                          {lastIntentPayload.alarmTime} AM
                        </div>
                        <div className="text-xs text-slate-300">
                          Label: {lastIntentPayload.alarmLabel} (EXTRA_SKIP_UI = true)
                        </div>
                      </div>
                    )}

                    {osView === 'SYSTEM_CALENDAR_INTENT' && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Android Calendar · CalendarContract.Events</span>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {lastIntentPayload.eventTitle}
                        </div>
                        <div className="text-xs text-slate-300">
                          Duration: {lastIntentPayload.eventDuration} minutes (Inserted locally)
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setOsView('MANGAL_APP')}
                    className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs hover:bg-amber-300 cursor-pointer"
                  >
                    Back to MANGAL Voice Assistant
                  </button>
                </div>
              )}

              {/* ==================== OS VIEW 4: MANGAL MAINACTIVITY (COMPOSE UI) ==================== */}
              {osView === 'MANGAL_APP' && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-between">
                    {mangalTab === 'voice_chat' && (
                      <>
                        {/* Compose TopAppBar with MANGAL Brand Icon */}
                        <div className="pb-2.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MangalAppIconSvg
                              size={36}
                              pulsing={wakeTriggeredListening || continuousRealMicActive}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  MANGAL
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                  Play Protect OK
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                Wake Word: &ldquo;Mangal&rdquo; · Offline GGUF
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setOsView('PIXEL_LAUNCHER')}
                              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer"
                              title="View MANGAL Icon on Pixel Home Screen"
                            >
                              App Icon
                            </button>
                            <button
                              onClick={() => {
                                setChatHistory([
                                  {
                                    id: `clr-${Date.now()}`,
                                    role: 'assistant',
                                    text: 'SQLCipher AES-256 history wiped. Say "Mangal" to speak.',
                                    timestamp: new Date().toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })
                                  }
                                ]);
                                appendLog('ChatRepository', 'I', 'clearConversationMemory() executed.');
                              }}
                              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              title="Clear Encrypted Room History"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Live Wake Word & 16kHz AudioRecord Waveform Status Bar */}
                        <div
                          className={`mt-2 px-3 py-2 rounded-xl border text-[11px] font-mono flex items-center justify-between gap-2 transition-colors ${
                            wakeTriggeredListening || continuousRealMicActive
                              ? 'bg-amber-500/15 border-amber-400/60 text-amber-200'
                              : wakeServiceRunning
                              ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                              : 'bg-slate-900/40 border-slate-800/50 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Radio
                              className={`w-3.5 h-3.5 shrink-0 ${
                                wakeTriggeredListening || continuousRealMicActive
                                  ? 'text-amber-400 animate-ping'
                                  : wakeServiceRunning
                                  ? 'text-emerald-400'
                                  : 'text-slate-600'
                              }`}
                            />
                            <span className="truncate">
                              {continuousRealMicActive
                                ? liveHeardTranscript
                                  ? `Hearing: "${liveHeardTranscript}"`
                                  : 'Mic Live: Say "Mangal, <command>" out loud...'
                                : wakeTriggeredListening
                                ? 'Wake Word "Mangal" Triggered! Capturing...'
                                : wakeServiceRunning
                                ? 'Standby: Say "Mangal" (like "Hey Google")'
                                : 'Wake Word Paused'}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 shrink-0 tabular-nums">
                            RMS:{rmsEnergy.toFixed(2)}
                          </span>
                        </div>

                        {/* Chat Messages LazyColumn */}
                        <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 pr-0.5">
                          {chatHistory.map((turn) => (
                            <div
                              key={turn.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                                turn.role === 'user'
                                  ? 'bg-slate-900/95 border-slate-800 ml-5'
                                  : 'bg-slate-950/95 border-slate-800/90 mr-2'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tabular-nums">
                                <span
                                  className={
                                    turn.role === 'user'
                                      ? 'text-amber-300 font-semibold'
                                      : 'text-emerald-400 font-semibold'
                                  }
                                >
                                  {turn.role === 'user'
                                    ? turn.triggeredByWakeWord
                                      ? 'YOU (WAKE: "MANGAL")'
                                      : 'YOU (PTT)'
                                    : 'MANGAL (ON-DEVICE)'}
                                </span>
                                <span>
                                  {turn.sttLatencyMs ? `STT ${turn.sttLatencyMs}ms · ` : ''}
                                  {turn.llmTokensPerSec ? `${turn.llmTokensPerSec} tok/s · ` : ''}
                                  {turn.timestamp}
                                </span>
                              </div>

                              {turn.toolCallJson && (
                                <pre className="p-2 rounded-lg bg-[#070A0F] border border-slate-800/80 text-[9px] font-mono text-slate-300 overflow-x-auto leading-snug">
                                  <code>{turn.toolCallJson}</code>
                                </pre>
                              )}

                              {turn.toolExecutionResult && (
                                <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-semibold">
                                      Tool → {turn.toolExecutionResult.toolName}
                                    </div>
                                    <div className="text-[9px] opacity-90 truncate">
                                      {turn.toolExecutionResult.summary}
                                    </div>
                                  </div>
                                  {turn.toolExecutionResult.onOpenIntentSheet && (
                                    <button
                                      onClick={turn.toolExecutionResult.onOpenIntentSheet}
                                      className="px-2 py-1 rounded bg-emerald-400 text-slate-950 font-sans font-semibold text-[9px] whitespace-nowrap cursor-pointer shrink-0"
                                    >
                                      {turn.toolExecutionResult.launchedIntentLabel}
                                    </button>
                                  )}
                                </div>
                              )}

                              <p className="text-slate-100 leading-relaxed text-[11px]">
                                {turn.text}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Compose Input & Hands-Free Mic Bar */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (inputDraft.trim()) {
                                executeFullVoiceLoop(inputDraft);
                                setInputDraft('');
                              }
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={inputDraft}
                              onChange={(e) => setInputDraft(e.target.value)}
                              placeholder='Type "Mangal, set alarm for 6:30 AM"...'
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="submit"
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={toggleRealMicWakeLoop}
                              className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                                continuousRealMicActive
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                              }`}
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>
                                {continuousRealMicActive
                                  ? 'Stop Real Mic'
                                  : 'Say "Mangal" (Live Mic)'}
                              </span>
                            </button>

                            <button
                              onClick={() =>
                                executeFullVoiceLoop(
                                  'Mangal, set an alarm for 6:30 AM tomorrow labeled Morning Workout',
                                  true
                                )
                              }
                              className="py-2 px-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[11px] font-medium cursor-pointer"
                            >
                              Simulate &ldquo;Mangal&rdquo; Wake
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {mangalTab === 'model_manager' && (
                      <div className="space-y-2.5">
                        <div>
                          <h2 className="text-xs font-semibold text-white">
                            Offline GGUF & Whisper Model Manager
                          </h2>
                          <p className="text-[10px] text-slate-400">
                            Context.filesDir/models/ (Read-only, Play Protect DCL Safe)
                          </p>
                        </div>

                        {modelErrorBanner && (
                          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-200">
                            {modelErrorBanner}
                          </div>
                        )}

                        <div className="space-y-2">
                          {models.map((m) => (
                            <div
                              key={m.modelId}
                              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-white">
                                  {m.displayName}
                                </span>
                                {m.isActive && (
                                  <span className="text-[9px] font-mono text-emerald-400">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span>
                                  {m.sizeMb} MB · Min {m.requiredRamMb} MB RAM
                                </span>
                                <button
                                  onClick={() => handleModelAction(m)}
                                  className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-sans font-semibold text-[10px] cursor-pointer"
                                >
                                  {m.isActive ? 'Loaded' : 'Activate'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {mangalTab === 'settings' && (
                      <div className="space-y-3">
                        <div>
                          <h2 className="text-xs font-semibold text-white">
                            Settings, Native TTS & Play Protect
                          </h2>
                          <p className="text-[10px] text-slate-400">
                            SQLCipher AES-256 · AndroidNativeTtsSpeaker
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span>Hands-Free &ldquo;Mangal&rdquo; Service</span>
                            <button
                              onClick={() => setWakeServiceRunning((v) => !v)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] cursor-pointer"
                            >
                              {wakeServiceRunning ? 'RUNNING' : 'STOPPED'}
                            </button>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Native TTS Rate</span>
                              <span>{speechRate.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.6"
                              max="1.8"
                              step="0.05"
                              value={speechRate}
                              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                              className="w-full accent-amber-400"
                            />
                          </div>

                          <button
                            onClick={() => setOsView('PLAY_PROTECT_SCANNER')}
                            className="w-full py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Open Google Play Protect Scanner
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Compose Bottom NavigationBar */}
                  <div className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 py-2 px-2">
                    {(
                      [
                        ['voice_chat', 'Assistant'],
                        ['model_manager', 'Models'],
                        ['settings', 'Settings']
                      ] as const
                    ).map(([tab, label]) => (
                      <button
                        key={tab}
                        onClick={() => setMangalTab(tab)}
                        className={`py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                          mangalTab === tab
                            ? 'text-amber-300 bg-amber-500/10 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ANDROID 15 3-BUTTON / GESTURE NAVIGATION BAR */}
              <div className="h-9 bg-black border-t border-slate-900 flex items-center justify-around px-8 z-30">
                <button
                  onClick={() => setOsView('MANGAL_APP')}
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  title="Android Back"
                >
                  <CornerUpLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShadeOpen(false);
                    setOsView((v) => (v === 'PIXEL_LAUNCHER' ? 'MANGAL_APP' : 'PIXEL_LAUNCHER'));
                  }}
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  title="Android Home (Toggle Pixel Launcher / MANGAL)"
                >
                  <Home className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShadeOpen((v) => !v)}
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  title="Quick Settings / Notifications"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ANDROID STUDIO QEMU EMULATOR EXTENDED HARDWARE CONTROL STRIP */}
          <div className="w-11 bg-slate-900 border border-l-0 border-slate-800 rounded-br-2xl flex flex-col items-center py-3 gap-2.5 text-slate-400">
            <button
              onClick={() => setOsView('PIXEL_LAUNCHER')}
              className="p-2 rounded-lg hover:bg-slate-800 hover:text-white cursor-pointer"
              title="Power / Home Screen"
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMediaVolume((v) => Math.min(100, v + 20))}
              className="p-2 rounded-lg hover:bg-slate-800 hover:text-white cursor-pointer"
              title={`Volume Up (${mediaVolume}%)`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTtsMuted((v) => !v)}
              className={`p-2 rounded-lg hover:bg-slate-800 cursor-pointer ${
                ttsMuted ? 'text-rose-400' : 'text-emerald-400'
              }`}
              title="Toggle Native TTS Audio"
            >
              {ttsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setTorchOn((v) => !v)}
              className={`p-2 rounded-lg hover:bg-slate-800 cursor-pointer ${
                torchOn ? 'text-amber-300 bg-amber-500/15' : ''
              }`}
              title="Hardware Camera Torch"
            >
              <Flashlight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOsView('PIXEL_LAUNCHER')}
              className="p-2 rounded-lg hover:bg-slate-800 hover:text-white cursor-pointer"
              title="Pixel Home Screen (See App Icon)"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOsView('PLAY_PROTECT_SCANNER')}
              className="p-2 rounded-lg hover:bg-slate-800 text-emerald-400 cursor-pointer"
              title="Google Play Protect Scanner"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: LIVE ADB LOGCAT, QUICK VOICE TRIGGERS & EMULATOR CONTROLS (6 cols) */}
      <div className="lg:col-span-6 space-y-5">
        {/* Instant Voice Utterance Triggers + Launcher / Play Protect Switchers */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                Emulator Interactive Controls & Voice Injection
              </h2>
              <p className="text-xs text-slate-400">
                Trigger hands-free <strong>&ldquo;Mangal&rdquo;</strong> wake phrases, inspect the
                custom Launcher Icon on the Pixel Home Screen, or run the Play Protect scanner.
              </p>
            </div>
          </div>

          {/* Emulator View Mode Switcher */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setOsView('MANGAL_APP')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                osView === 'MANGAL_APP'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              1. MANGAL Assistant UI
            </button>
            <button
              onClick={() => setOsView('PIXEL_LAUNCHER')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                osView === 'PIXEL_LAUNCHER'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              2. Pixel Home (App Icon)
            </button>
            <button
              onClick={() => setOsView('PLAY_PROTECT_SCANNER')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                osView === 'PLAY_PROTECT_SCANNER'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-emerald-300 hover:text-white'
              }`}
            >
              3. Play Protect Scanner
            </button>
          </div>

          {/* Voice Command Injection Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                title: '"Mangal" (Wake Only — Like "Hey Google")',
                utterance: 'Mangal'
              },
              {
                title: '"Mangal, set alarm for 6:30 AM"',
                utterance: 'Mangal, set an alarm for 6:30 AM tomorrow labeled Morning Workout'
              },
              {
                title: '"Mangal, turn on the flashlight"',
                utterance: 'Mangal, turn on the flashlight'
              },
              {
                title: '"Mangal, send SMS to +1-555-0192"',
                utterance: 'Mangal, send an SMS to +1-555-0192 saying Running 10 minutes late'
              },
              {
                title: '"Mangal, schedule Design Review"',
                utterance:
                  'Mangal, create a calendar event for Design Review at 3 PM for 45 minutes'
              },
              {
                title: '"Mangal, explain lithium-ion batteries"',
                utterance: 'Mangal, explain how lithium-ion batteries work'
              }
            ].map((item) => (
              <button
                key={item.title}
                onClick={() => executeFullVoiceLoop(item.utterance, true)}
                className="text-left p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-400/60 transition-colors cursor-pointer group flex items-center justify-between gap-2"
              >
                <span className="text-xs font-medium text-slate-200 group-hover:text-amber-300 truncate">
                  {item.title}
                </span>
                <Play className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* LIVE ADB LOGCAT & JNI STREAM */}
        <div className="rounded-2xl bg-[#070A0F] border border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>adb logcat -s MangalApplication LlamaJniBridge WhisperJniBridge</span>
            </div>
            <button
              onClick={() => setLogcat([])}
              className="text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Logcat
            </button>
          </div>
          <div className="p-3.5 h-[260px] overflow-y-auto font-mono text-[11px] space-y-1.5 leading-relaxed">
            {logcat.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0 tabular-nums">{entry.timestamp}</span>
                <span
                  className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                    entry.level === 'E'
                      ? 'bg-rose-500/20 text-rose-300'
                      : entry.level === 'W'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {entry.level}/{entry.tag}
                </span>
                <span className="text-slate-300 break-all">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links to Inspect the Underlying Android Files */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">Jump to Android Kotlin / XML source:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                onInspectSourceFile(
                  'app/src/main/java/ai/mangal/assistant/service/MangalWakeWordForegroundService.kt'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] hover:border-amber-400/50 cursor-pointer"
            >
              MangalWakeWordForegroundService.kt
            </button>
            <button
              onClick={() =>
                onInspectSourceFile('app/src/main/res/drawable/ic_launcher_foreground.xml')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] hover:border-amber-400/50 cursor-pointer"
            >
              ic_launcher_foreground.xml
            </button>
            <button
              onClick={() =>
                onInspectSourceFile(
                  'core-tools/src/main/java/ai/mangal/core/tools/AndroidToolExecutor.kt'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] hover:border-emerald-400/50 cursor-pointer"
            >
              AndroidToolExecutor.kt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
