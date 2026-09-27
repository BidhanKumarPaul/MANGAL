import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
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
  ChevronUp,
  Clock,
  Calendar,
  MessageSquare,
  Phone,
  CheckCircle2,
  Radio,
  Play,
  Download,
  Pause,
  FolderOpen,
  PlusCircle,
  Link2,
  Sparkles
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

type MangalAppTab = 'voice_chat' | 'model_manager' | 'custom_model' | 'settings';

type SimDownloadStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'DOWNLOADING'
  | 'VERIFYING_CHECKSUM'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAILED';

interface SimDownloadProgress {
  modelId: string;
  bytesDownloadedMb: number;
  totalMb: number;
  speedMbPerSec: number;
  status: SimDownloadStatus;
  errorMessage?: string;
}

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
  isCustom?: boolean;
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
    sizeMb: 1117,
    requiredRamMb: 2560,
    license: 'Apache-2.0',
    sha256: '6b7e92e40a99',
    downloaded: true,
    isActive: true
  },
  {
    modelId: 'qwen2.5-0.5b-instruct-q4_k_m',
    displayName: 'Qwen 2.5 0.5B Fast Instruct (Q4_K_M · Ultra-Light)',
    category: 'LLM_GGUF',
    quantization: 'Q4_K_M',
    sizeMb: 398,
    requiredRamMb: 1200,
    license: 'Apache-2.0',
    sha256: '4a9c81e2b310',
    downloaded: false,
    isActive: false
  },
  {
    modelId: 'qwen2.5-3b-instruct-q4_k_m',
    displayName: 'Qwen 2.5 3B Instruct (Q4_K_M)',
    category: 'LLM_GGUF',
    quantization: 'Q4_K_M',
    sizeMb: 2105,
    requiredRamMb: 5120,
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
    requiredRamMb: 768,
    license: 'MIT',
    sha256: 'c4e8a912b7d0',
    downloaded: true,
    isActive: true
  },
  {
    modelId: 'whisper-base-en-q8_0',
    displayName: 'Whisper Base.en (INT8 / Q8_0)',
    category: 'STT_WHISPER',
    quantization: 'Q8_0',
    sizeMb: 78,
    requiredRamMb: 1280,
    license: 'MIT',
    sha256: 'e19b47f0a21c',
    downloaded: false,
    isActive: false
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
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [wifiOnlyGuard, setWifiOnlyGuard] = useState<boolean>(false);
  const [deviceRamMb] = useState<number>(8192);
  const [thermalStatus] = useState<'NOMINAL' | 'MODERATE'>('NOMINAL');

  // Hands-Free "Mangal" Wake Word & Real Browser Mic State
  const [wakeServiceRunning, setWakeServiceRunning] = useState<boolean>(true);
  const [continuousRealMicActive, setContinuousRealMicActive] = useState<boolean>(false);
  const [wakeTriggeredListening, setWakeTriggeredListening] = useState<boolean>(false);
  const [awaitingFollowUpAfterMangal, setAwaitingFollowUpAfterMangal] = useState<boolean>(false);
  const [liveHeardTranscript, setLiveHeardTranscript] = useState<string>('');
  const [rmsEnergy, setRmsEnergy] = useState<number>(0.08);

  // Native TTS & Model State
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [ttsMuted, setTtsMuted] = useState<boolean>(false);
  const [models, setModels] = useState<SimulatedModel[]>(INITIAL_MODELS);
  const [downloadProgressMap, setDownloadProgressMap] = useState<
    Record<string, SimDownloadProgress>
  >({});
  const [modelStatusBanner, setModelStatusBanner] = useState<string | null>(
    'HTTP Range Resume & SHA-256 Verifier Ready. Tap Download on any model to watch the live progress bar.'
  );
  const [inputDraft, setInputDraft] = useState<string>('');

  // Custom Model Tab State
  const [customModelName, setCustomModelName] = useState<string>('');
  const [customModelUrl, setCustomModelUrl] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<'LLM_GGUF' | 'STT_WHISPER'>('LLM_GGUF');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const downloadTimersRef = useRef<Record<string, number>>({});

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
      tag: 'MangalSpeechListener',
      level: 'I',
      message:
        'SpeechRecognizer active in STANDBY_LISTENING_FOR_MANGAL — Say "Mangal" or tap Mic anytime.'
    },
    {
      id: 'log-3',
      timestamp: '09:41:00.340',
      pid: '4812-4862',
      tag: 'ResumableDownloader',
      level: 'I',
      message:
        'Catalog seeded (6 models + Custom GGUF SAF/URL importer ready). Progress StateFlow connected.'
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
      text: 'MANGAL v1.2 is actively listening for "Mangal". Say "Mangal, turn on the flashlight", tap any quick chip above, check live download progress bars in Models, or import your own .gguf in Custom GGUF.',
      timestamp: '09:41:00'
    }
  ]);

  const activeLlmModel =
    models.find((m) => m.category === 'LLM_GGUF' && m.isActive)?.displayName ||
    'Built-In Offline Action Engine';

  const appendLog = useCallback(
    (tag: string, level: LogcatEntry['level'], message: string) => {
      const now = new Date();
      const ts = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setLogcat((prev) => [
        ...prev.slice(-38),
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

  // Acoustic wake earcon
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

  // Execute a full offline voice turn through MangalSpeechListener -> OpenWakeWordDetector -> LlamaCppEngineImpl -> AndroidToolExecutor
  const executeFullVoiceLoop = useCallback(
    (rawUtterance: string, isWakeTriggered = false) => {
      const trimmed = rawUtterance.trim();
      if (!trimmed) return;

      const wakeRegex = /^(?:hey\s+|ok\s+|hello\s+)?(?:mangal|mongol|mangala|mangle)\b[\s,.:;-]*(.*)$/i;
      const match = trimmed.match(wakeRegex);
      const wokeByPhrase = isWakeTriggered || Boolean(match) || awaitingFollowUpAfterMangal;
      const commandBody = match && match[1].trim().length > 0 ? match[1].trim() : trimmed;

      setOsView('MANGAL_APP');
      setMangalTab('voice_chat');

      if (wokeByPhrase) {
        playWakeEarcon();
        setWakeTriggeredListening(true);
        appendLog(
          'MangalSpeechListener',
          'I',
          `Wake phrase "Mangal" matched! Phase -> WAKE_TRIGGERED_AWAITING_COMMAND.`
        );
      }

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
        sttLatencyMs: 92,
        timestamp: nowTime
      };

      // If user only said "Mangal" (like "Hey Google") without a trailing command yet:
      if (/^(?:hey\s+|ok\s+)?(?:mangal|mongol|mangala)$/i.test(trimmed)) {
        const promptReply = "Yes? I'm listening. Tell me what to do (e.g., 'turn on the flashlight' or 'set alarm for 6:30 AM').";
        setAwaitingFollowUpAfterMangal(true);
        setWakeTriggeredListening(true);
        setChatHistory((prev) => [
          ...prev,
          userTurn,
          {
            id: `a-${Date.now() + 1}`,
            role: 'assistant',
            text: promptReply,
            triggeredByWakeWord: true,
            llmTokensPerSec: 38.4,
            timestamp: nowTime
          }
        ]);
        appendLog(
          'MangalSpeechListener',
          'I',
          'Wake word "Mangal" acknowledged! Microphone open in WAKE_TRIGGERED_AWAITING_COMMAND.'
        );
        speakViaAndroidTts("Yes? I'm listening. Tell me what to do.");
        return;
      }

      setAwaitingFollowUpAfterMangal(false);
      setTimeout(() => setWakeTriggeredListening(false), 1200);

      const lower = commandBody.toLowerCase();
      let toolCallJson: string | undefined;
      let toolResult: ChatTurn['toolExecutionResult'];
      let replyText = '';

      // 1. Alarm or Timer
      if (lower.includes('alarm') || lower.includes('timer') || lower.includes('wake me')) {
        const isTimer = lower.includes('timer');
        const payload = isTimer
          ? {
              type: 'tool_call',
              toolName: 'set_alarm_or_timer',
              arguments: { mode: 'timer', durationSeconds: 300, message: 'MANGAL Voice Timer' }
            }
          : {
              type: 'tool_call',
              toolName: 'set_alarm_or_timer',
              arguments: { mode: 'alarm', hour: 6, minute: 30, message: 'Morning Workout' }
            };
        toolCallJson = JSON.stringify(payload, null, 2);
        setLastIntentPayload((p) => ({
          ...p,
          alarmTime: isTimer ? '05:00 Timer' : '06:30',
          alarmLabel: isTimer ? 'MANGAL Voice Timer' : 'Morning Workout'
        }));
        appendLog(
          'AndroidToolExecutor',
          'I',
          isTimer
            ? 'startActivity(Intent(AlarmClock.ACTION_SET_TIMER) { length=300s, skipUi=true })'
            : 'startActivity(Intent(AlarmClock.ACTION_SET_ALARM) { hour=6, min=30, skipUi=true })'
        );
        toolResult = {
          toolName: 'set_alarm_or_timer',
          success: true,
          summary: isTimer
            ? 'Started 5-minute countdown timer via AlarmClock.ACTION_SET_TIMER.'
            : 'Scheduled 06:30 alarm ("Morning Workout") via AlarmClock.ACTION_SET_ALARM.',
          launchedIntentLabel: 'Open Clock View',
          onOpenIntentSheet: () => setOsView('SYSTEM_ALARM_INTENT')
        };
        replyText = isTimer
          ? "Done. I've started a 5-minute timer."
          : "Done. I've set your alarm for 6:30 AM labeled Morning Workout.";
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
            .trim() || 'YouTube';
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
          replyText: `Offline response via ${activeLlmModel}: I heard "${commandBody}". All 6 hardware tools (flashlight, alarm, timer, volume, open app, SMS/call) are active and 100% offline.`
        };
        toolCallJson = JSON.stringify(payload, null, 2);
        appendLog(
          'LlamaJniBridge',
          'I',
          `completionWithGrammar(${activeLlmModel}) -> generated 38 tokens at 31.2 tok/s.`
        );
        replyText = payload.replyText;
      }

      const assistantTurn: ChatTurn = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        triggeredByWakeWord: wokeByPhrase,
        llmTokensPerSec: thermalStatus === 'MODERATE' ? 14.8 : 31.2,
        toolCallJson,
        toolExecutionResult: toolResult,
        timestamp: nowTime
      };

      setChatHistory((prev) => [...prev, userTurn, assistantTurn]);
      speakViaAndroidTts(replyText);
    },
    [
      awaitingFollowUpAfterMangal,
      playWakeEarcon,
      appendLog,
      mediaVolume,
      thermalStatus,
      activeLlmModel,
      speakViaAndroidTts
    ]
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
      appendLog('MangalSpeechListener', 'I', 'Stopped live microphone stream.');
      return;
    }

    playWakeEarcon();
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
          setRmsEnergy(0.32 + Math.random() * 0.55);

          if (isFinal && transcript.length > 0) {
            setLiveHeardTranscript('');
            setRmsEnergy(0.08);
            executeFullVoiceLoop(transcript, true);
          }
        };

        rec.onerror = () => {
          setContinuousRealMicActive(false);
          appendLog(
            'MangalSpeechListener',
            'W',
            'Browser iframe mic permission blocked; running simulated voice capture.'
          );
          // Fallback simulated capture so clicking Tap Mic to Speak always responds!
          setLiveHeardTranscript('Mangal, turn on the flashlight...');
          setTimeout(() => {
            setLiveHeardTranscript('');
            executeFullVoiceLoop('Mangal, turn on the flashlight', true);
          }, 900);
        };

        rec.onend = () => {
          setContinuousRealMicActive(false);
          setRmsEnergy(0.08);
        };

        rec.start();
        setContinuousRealMicActive(true);
        appendLog(
          'MangalSpeechListener',
          'I',
          'SpeechRecognizer started — Speak your command or say "Mangal" now!'
        );
        return;
      } catch {
        setContinuousRealMicActive(false);
      }
    }

    // Fallback simulated wake capture if browser SpeechRecognition is unavailable
    setContinuousRealMicActive(true);
    setLiveHeardTranscript('Mangal, turn on the flashlight...');
    setTimeout(() => {
      setContinuousRealMicActive(false);
      setLiveHeardTranscript('');
      executeFullVoiceLoop('Mangal, turn on the flashlight', true);
    }, 1000);
  };

  useEffect(() => {
    const timers = downloadTimersRef.current;
    return () => {
      if (recognitionRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (recognitionRef.current as any).stop();
        } catch {
          // ignore
        }
      }
      Object.values(timers).forEach((id) => window.clearInterval(id));
    };
  }, []);

  // REAL-TIME STREAMING MODEL DOWNLOADER WITH LIVE PROGRESS BAR, SPEED, PAUSE & RESUME
  const startOrResumeModelDownload = (model: SimulatedModel) => {
    if (wifiOnlyGuard && !wifiEnabled) {
      const msg =
        "Wi-Fi-Only Guard is ON while Wi-Fi is disconnected. Turn off 'Restrict to Wi-Fi Only' above or enable Wi-Fi to download.";
      setModelStatusBanner(msg);
      setDownloadProgressMap((prev) => ({
        ...prev,
        [model.modelId]: {
          modelId: model.modelId,
          bytesDownloadedMb: prev[model.modelId]?.bytesDownloadedMb || 0,
          totalMb: model.sizeMb,
          speedMbPerSec: 0,
          status: 'FAILED',
          errorMessage: msg
        }
      }));
      appendLog('ResumableDownloader', 'E', msg);
      return;
    }

    const existing = downloadProgressMap[model.modelId];
    let currentMb = existing && existing.status === 'PAUSED' ? existing.bytesDownloadedMb : 0;
    const totalMb = model.sizeMb;

    setModelStatusBanner(`Downloading ${model.displayName} via HTTP Range stream...`);
    appendLog(
      'ResumableDownloader',
      'I',
      `GET ${model.modelId}.gguf (Range: bytes=${Math.floor(currentMb * 1048576)}-) -> HTTP 206 Partial Content`
    );

    setDownloadProgressMap((prev) => ({
      ...prev,
      [model.modelId]: {
        modelId: model.modelId,
        bytesDownloadedMb: currentMb,
        totalMb,
        speedMbPerSec: 42.5,
        status: currentMb > 0 ? 'DOWNLOADING' : 'CONNECTING'
      }
    }));

    if (downloadTimersRef.current[model.modelId]) {
      window.clearInterval(downloadTimersRef.current[model.modelId]);
    }

    const stepMb = Math.max(12, Math.round(totalMb / 14));
    const timerId = window.setInterval(() => {
      currentMb = Math.min(totalMb, currentMb + stepMb);
      const speed = +(38.4 + Math.random() * 19.2).toFixed(2);

      if (currentMb < totalMb) {
        setDownloadProgressMap((prev) => ({
          ...prev,
          [model.modelId]: {
            modelId: model.modelId,
            bytesDownloadedMb: currentMb,
            totalMb,
            speedMbPerSec: speed,
            status: 'DOWNLOADING'
          }
        }));
      } else {
        window.clearInterval(timerId);
        delete downloadTimersRef.current[model.modelId];

        // Verifying SHA-256 stage
        setDownloadProgressMap((prev) => ({
          ...prev,
          [model.modelId]: {
            modelId: model.modelId,
            bytesDownloadedMb: totalMb,
            totalMb,
            speedMbPerSec: 0,
            status: 'VERIFYING_CHECKSUM'
          }
        }));
        appendLog(
          'ResumableDownloader',
          'I',
          `Download 100% (${totalMb} MB). Computing streaming SHA-256 digest...`
        );

        window.setTimeout(() => {
          setDownloadProgressMap((prev) => ({
            ...prev,
            [model.modelId]: {
              modelId: model.modelId,
              bytesDownloadedMb: totalMb,
              totalMb,
              speedMbPerSec: 0,
              status: 'COMPLETED'
            }
          }));
          setModels((prev) =>
            prev.map((m) =>
              m.category === model.category
                ? {
                    ...m,
                    downloaded: m.modelId === model.modelId ? true : m.downloaded,
                    isActive: m.modelId === model.modelId
                  }
                : m
            )
          );
          setModelStatusBanner(
            `SHA-256 Verified & Activated: ${model.displayName} (setExecutable=false)`
          );
          appendLog(
            'LlamaJniBridge',
            'I',
            `Verified SHA-256 (${model.sha256}) & activated ${model.displayName} in engine.`
          );
        }, 550);
      }
    }, 240);

    downloadTimersRef.current[model.modelId] = timerId;
  };

  const pauseModelDownload = (modelId: string) => {
    if (downloadTimersRef.current[modelId]) {
      window.clearInterval(downloadTimersRef.current[modelId]);
      delete downloadTimersRef.current[modelId];
    }
    setDownloadProgressMap((prev) => {
      const cur = prev[modelId];
      if (!cur) return prev;
      return {
        ...prev,
        [modelId]: {
          ...cur,
          speedMbPerSec: 0,
          status: 'PAUSED'
        }
      };
    });
    setModelStatusBanner(`Paused ${modelId}.part on disk. Tap Resume Download anytime.`);
    appendLog('ResumableDownloader', 'W', `Paused ${modelId}.part — ready for HTTP Range resume.`);
  };

  const activateDownloadedModel = (model: SimulatedModel) => {
    const safeLimit = Math.floor(deviceRamMb * 0.78);
    if (model.requiredRamMb > safeLimit) {
      const errMsg = `OOM Guard Refusal: ${model.displayName} needs ${model.requiredRamMb} MB RAM (>78% of ${deviceRamMb} MB).`;
      setModelStatusBanner(errMsg);
      appendLog('DeviceHealthAndRamGuard', 'E', errMsg);
      return;
    }
    setModels((prev) =>
      prev.map((m) =>
        m.category === model.category ? { ...m, isActive: m.modelId === model.modelId } : m
      )
    );
    setModelStatusBanner(`Active Model Switched: ${model.displayName}`);
    appendLog(
      'LlamaJniBridge',
      'I',
      `Loaded ${model.modelId} (mmap=true, setExecutable=false, Play Protect DCL Safe)`
    );
  };

  const deleteModelFromDisk = (model: SimulatedModel) => {
    if (downloadTimersRef.current[model.modelId]) {
      window.clearInterval(downloadTimersRef.current[model.modelId]);
      delete downloadTimersRef.current[model.modelId];
    }
    setDownloadProgressMap((prev) => {
      const next = { ...prev };
      delete next[model.modelId];
      return next;
    });
    if (model.isCustom) {
      setModels((prev) => prev.filter((m) => m.modelId !== model.modelId));
    } else {
      setModels((prev) =>
        prev.map((m) =>
          m.modelId === model.modelId ? { ...m, downloaded: false, isActive: false } : m
        )
      );
    }
    setModelStatusBanner(`Deleted ${model.displayName} from Context.filesDir/models/.`);
    appendLog('ResumableDownloader', 'I', `Deleted ${model.modelId} from app-private storage.`);
  };

  // Import a user-selected custom .gguf / .bin file from device picker or preset
  const handleImportCustomModelFile = (fileName: string, fileSizeMb: number) => {
    const cleanId = `custom_${fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/\.(gguf|bin)$/, '')}`;
    const displayTitle = customModelName.trim() || fileName;
    const newCustomModel: SimulatedModel = {
      modelId: cleanId,
      displayName: displayTitle,
      category: customCategory,
      quantization: 'CUSTOM',
      sizeMb: fileSizeMb,
      requiredRamMb: Math.max(1024, Math.round(fileSizeMb * 1.4)),
      license: 'User Custom Model',
      sha256: '8f4e2a91c0d7',
      downloaded: true,
      isActive: true,
      isCustom: true
    };

    setModels((prev) => [
      newCustomModel,
      ...prev.map((m) => (m.category === customCategory ? { ...m, isActive: false } : m))
    ]);
    setCustomModelName('');
    setModelStatusBanner(
      `Imported & Activated Custom Model: ${displayTitle} (${fileSizeMb} MB · SHA-256 verified)`
    );
    appendLog(
      'CustomModelScreen',
      'I',
      `SAF OpenDocument imported "${fileName}" (${fileSizeMb} MB) -> Context.filesDir/models/${cleanId}.gguf [ACTIVE]`
    );
  };

  // Download a custom model from a direct HTTPS URL with live progress bar
  const handleDownloadCustomUrlModel = (urlToUse?: string, nameToUse?: string) => {
    const targetUrl = (urlToUse ?? customModelUrl).trim();
    if (!targetUrl) return;
    const rawFile = targetUrl.split('/').pop()?.split('?')[0] || 'custom_model.gguf';
    const title = (nameToUse ?? customModelName).trim() || rawFile;
    const slug = `custom_url_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    const customUrlEntity: SimulatedModel = {
      modelId: slug,
      displayName: `${title} (Custom URL)`,
      category: customCategory,
      quantization: 'CUSTOM',
      sizeMb: 940,
      requiredRamMb: 2048,
      license: 'Custom URL',
      sha256: '7d3b91a0e4f2',
      downloaded: false,
      isActive: false,
      isCustom: true
    };

    setModels((prev) => [customUrlEntity, ...prev.filter((m) => m.modelId !== slug)]);
    setCustomModelUrl('');
    setCustomModelName('');
    startOrResumeModelDownload(customUrlEntity);
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
            <div className="relative h-[720px] w-full bg-[#090D14] rounded-[30px] overflow-hidden flex flex-col justify-between border border-slate-800/80 select-none">
              {/* ANDROID 15 STATUS BAR */}
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
                        wakeTriggeredListening ||
                        continuousRealMicActive ||
                        awaitingFollowUpAfterMangal
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
                            {wifiEnabled ? 'Connected (For GGUF DL)' : '100% Offline'}
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

                    {/* Persistent ForegroundService Notification */}
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
                            ? 'Hands-free active — Say "Mangal" to start speaking (0 bytes cloud telemetry).'
                            : 'Hands-free wake word paused.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShadeOpen(false)}
                    className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    Swipe Up to Dismiss Shade
                  </button>
                </div>
              )}

              {/* ==================== OS VIEW 1: PIXEL LAUNCHER HOME SCREEN ==================== */}
              {osView === 'PIXEL_LAUNCHER' && (
                <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-b from-[#131926] via-[#0E131D] to-[#090C12]">
                  <div className="space-y-1 pt-2">
                    <div className="text-2xl font-light text-white tracking-tight">
                      Sat, Sep 26
                    </div>
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Play Protect Verified · Offline AI Ready</span>
                    </div>
                  </div>

                  {/* Center Showcase of the Custom MANGAL Adaptive App Icon */}
                  <div className="my-auto flex flex-col items-center text-center space-y-3 p-4 rounded-3xl bg-black/35 border border-slate-800/80 backdrop-blur-xs">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                      Android 15 Adaptive Icon Preview
                    </div>
                    <div
                      onClick={() => setOsView('MANGAL_APP')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowIconShortcuts((v) => !v);
                      }}
                      className="cursor-pointer group flex flex-col items-center gap-2"
                    >
                      <MangalAppIconSvg size={96} pulsing={wakeServiceRunning} showWordmark />
                      <span className="text-xs font-medium text-white group-hover:text-amber-300 transition-colors">
                        MANGAL
                      </span>
                    </div>

                    {showIconShortcuts && (
                      <div className="w-full p-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-left space-y-1.5 text-xs">
                        <button
                          onClick={() => {
                            setShowIconShortcuts(false);
                            setOsView('MANGAL_APP');
                            executeFullVoiceLoop('Mangal', true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center gap-2 cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Say &ldquo;Mangal&rdquo; Now</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowIconShortcuts(false);
                            setOsView('MANGAL_APP');
                            setMangalTab('custom_model');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Import Custom .GGUF Model</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setOsView('MANGAL_APP')}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs hover:bg-amber-300 cursor-pointer"
                      >
                        Tap Icon to Launch MANGAL
                      </button>
                      <button
                        onClick={() => setShowIconShortcuts((v) => !v)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 cursor-pointer"
                      >
                        {showIconShortcuts ? 'Hide Shortcuts' : 'Long-Press Menu'}
                      </button>
                    </div>
                  </div>

                  {/* Pixel Home Screen Dock */}
                  <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-800/60 justify-items-center">
                    <button
                      onClick={() => setOsView('MANGAL_APP')}
                      className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <MangalAppIconSvg size={48} pulsing={wakeServiceRunning} />
                      <span className="text-[10px] text-slate-200">MANGAL</span>
                    </button>
                    <button
                      onClick={() => setOsView('PLAY_PROTECT_SCANNER')}
                      className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-[22%] bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] text-slate-300">Play Protect</span>
                    </button>
                    <button
                      onClick={() => setOsView('SYSTEM_ALARM_INTENT')}
                      className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-[22%] bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400">
                        <Clock className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] text-slate-300">Clock</span>
                    </button>
                    <button
                      onClick={() => setOsView('SYSTEM_SMS_INTENT')}
                      className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-[22%] bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] text-slate-300">Messages</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== OS VIEW 2: GOOGLE PLAY PROTECT SCANNER ==================== */}
              {osView === 'PLAY_PROTECT_SCANNER' && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-[#0B1017] overflow-y-auto">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Google Play Protect</div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            No harmful behavior found · Verified
                          </div>
                        </div>
                      </div>
                      <MangalAppIconSvg size={38} />
                    </div>

                    <div className="space-y-2 text-[11px]">
                      {[
                        {
                          title: 'Zero Restricted SMS / Call Log Permissions',
                          detail:
                            'Uses Intent.ACTION_SENDTO & ACTION_DIAL so Play Protect never flags sideloaded APK.'
                        },
                        {
                          title: 'APK Signature Scheme v1 + v2 + v3 + v4',
                          detail:
                            '4096-bit RSA release keystore configured in app/build.gradle.kts.'
                        },
                        {
                          title: 'Non-Executable AI Model Storage (DCL Safe)',
                          detail:
                            'Downloaded & custom .gguf files locked with setExecutable(false, false) and setWritable(false, false).'
                        },
                        {
                          title: 'Android 15 16 KB ELF Page Alignment',
                          detail:
                            '-Wl,-z,max-page-size=16384 in CMakeLists.txt for libmangal_llama_jni.so & libmangal_whisper_jni.so.'
                        }
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-100">{item.title}</div>
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
                      </div>
                    )}

                    {osView === 'SYSTEM_ALARM_INTENT' && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Android Clock · AlarmClock Intent</span>
                        </div>
                        <div className="text-2xl font-mono font-bold text-white">
                          {lastIntentPayload.alarmTime}
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

              {/* ==================== OS VIEW 4: MANGAL MAINACTIVITY (10/10 COMPOSE UI) ==================== */}
              {osView === 'MANGAL_APP' && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#090D14]">
                  <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-between">
                    {/* TAB 1: ASSISTANT (VoiceChatScreen.kt) */}
                    {mangalTab === 'voice_chat' && (
                      <div className="flex-1 flex flex-col justify-between space-y-2">
                        {/* Top Header Card */}
                        <div
                          className={`p-3 rounded-2xl bg-[#111824] border transition-colors space-y-2 ${
                            wakeTriggeredListening ||
                            continuousRealMicActive ||
                            awaitingFollowUpAfterMangal
                              ? 'border-amber-400'
                              : 'border-[#1E293B]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <MangalAppIconSvg
                                size={38}
                                pulsing={
                                  wakeTriggeredListening ||
                                  continuousRealMicActive ||
                                  awaitingFollowUpAfterMangal ||
                                  wakeServiceRunning
                                }
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-extrabold text-white tracking-tight">
                                    MANGAL
                                  </span>
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#062E22] text-[#10B981]">
                                    100% OFFLINE
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-300 truncate">
                                  {awaitingFollowUpAfterMangal
                                    ? 'Wake Word "Mangal" Triggered · Speak command now'
                                    : continuousRealMicActive
                                    ? 'Listening live... Speak your command'
                                    : 'Hands-Free Active · Say "Mangal" or Tap Mic'}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setChatHistory([
                                  {
                                    id: `clr-${Date.now()}`,
                                    role: 'assistant',
                                    text: 'Encrypted history cleared. Say "Mangal" or tap any quick chip.',
                                    timestamp: new Date().toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })
                                  }
                                ]);
                              }}
                              className="px-2 py-1 rounded-lg border border-[#1E293B] text-[10px] text-slate-300 hover:text-white cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>

                          {/* Active Engine Bar + Quick Link to Custom GGUF */}
                          <div className="px-2.5 py-1.5 rounded-xl bg-[#080B11] flex items-center justify-between gap-2 text-[10px] font-mono">
                            <span className="text-slate-300 truncate">
                              Engine: {activeLlmModel}
                            </span>
                            <button
                              onClick={() => setMangalTab('custom_model')}
                              className="text-amber-400 font-sans font-bold hover:underline shrink-0 cursor-pointer"
                            >
                              + Custom GGUF
                            </button>
                          </div>

                          {/* Live Voice Acoustic Level & Partial Speech Transcript Pill */}
                          <div
                            className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-[10px] font-mono ${
                              wakeTriggeredListening ||
                              continuousRealMicActive ||
                              awaitingFollowUpAfterMangal
                                ? 'bg-[#291D0A] text-amber-200'
                                : 'bg-[#0D131F] text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  wakeTriggeredListening ||
                                  continuousRealMicActive ||
                                  awaitingFollowUpAfterMangal
                                    ? 'bg-amber-400 animate-ping'
                                    : wakeServiceRunning
                                    ? 'bg-emerald-400'
                                    : 'bg-slate-500'
                                }`}
                              />
                              <span className="truncate">
                                {liveHeardTranscript
                                  ? `Hearing: "${liveHeardTranscript}"`
                                  : awaitingFollowUpAfterMangal
                                  ? 'Listening for command after "Mangal"...'
                                  : wakeServiceRunning
                                  ? 'Say "Mangal, turn on the flashlight" or Tap Mic'
                                  : 'Wake word paused — Tap Mic below'}
                              </span>
                            </div>
                            <span className="text-amber-400 shrink-0 tabular-nums">
                              LVL {Math.round(rmsEnergy * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* 1-Tap Quick Command Chips (Matches VoiceChatScreen.kt) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          {[
                            ['Flashlight ON', 'Mangal, turn on the flashlight'],
                            ['Flashlight OFF', 'Mangal, turn off the flashlight'],
                            ['Alarm 6:30 AM', 'Mangal, set an alarm for 6:30 AM'],
                            ['5m Timer', 'Mangal, set a timer for 5 minutes'],
                            ['Volume Up', 'Mangal, turn volume up'],
                            ['Open YouTube', 'Mangal, open YouTube']
                          ].map(([label, cmd]) => (
                            <button
                              key={label}
                              onClick={() => executeFullVoiceLoop(cmd, true)}
                              className="px-2.5 py-1 rounded-full bg-[#111824] border border-[#1E293B] hover:border-amber-400/60 text-[10px] font-semibold text-amber-200 whitespace-nowrap cursor-pointer shrink-0"
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Conversation & Tool Execution LazyColumn */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[295px]">
                          {chatHistory.map((turn) => (
                            <div
                              key={turn.id}
                              className={`p-2.5 rounded-2xl border text-xs space-y-1.5 ${
                                turn.role === 'user'
                                  ? 'bg-[#1E293B] border-[#334155] ml-6'
                                  : 'bg-[#111824] border-[#1E293B] mr-2'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tabular-nums">
                                <span
                                  className={
                                    turn.role === 'user'
                                      ? 'text-amber-300 font-bold'
                                      : 'text-emerald-400 font-bold'
                                  }
                                >
                                  {turn.role === 'user'
                                    ? turn.triggeredByWakeWord
                                      ? 'YOU (WAKE: "MANGAL")'
                                      : 'YOU'
                                    : 'MANGAL (ON-DEVICE)'}
                                </span>
                                <span>{turn.timestamp}</span>
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
                                      TOOL: {turn.toolExecutionResult.toolName}
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

                        {/* Bottom Input + Prominent Tap Mic to Speak & "Mangal" Wake Toggle */}
                        <div className="pt-1.5 border-t border-[#1E293B] space-y-1.5">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (inputDraft.trim()) {
                                executeFullVoiceLoop(inputDraft, false);
                                setInputDraft('');
                              }
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={inputDraft}
                              onChange={(e) => setInputDraft(e.target.value)}
                              placeholder='Type "turn on flashlight" or "Mangal"...'
                              className="flex-1 bg-[#111824] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                            >
                              Send
                            </button>
                          </form>

                          <div className="grid grid-cols-12 gap-1.5">
                            <button
                              onClick={toggleRealMicWakeLoop}
                              className={`col-span-7 py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                                continuousRealMicActive || awaitingFollowUpAfterMangal
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                              }`}
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>
                                {continuousRealMicActive
                                  ? 'Listening... Speak!'
                                  : 'Tap Mic to Speak'}
                              </span>
                            </button>

                            <button
                              onClick={() => setWakeServiceRunning((v) => !v)}
                              className={`col-span-5 py-2 px-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-colors ${
                                wakeServiceRunning
                                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                                  : 'border-slate-700 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {wakeServiceRunning ? '"Mangal" Wake: ON' : '"Mangal" Wake: OFF'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: MODELS WITH LIVE DOWNLOAD PROGRESS BARS (ModelManagerScreen.kt) */}
                    {mangalTab === 'model_manager' && (
                      <div className="space-y-2.5">
                        <div className="p-3 rounded-2xl bg-[#111824] border border-[#1E293B] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h2 className="text-xs font-extrabold text-white">
                                Offline AI Model Manager
                              </h2>
                              <p className="text-[10px] text-slate-400">
                                Resumable HTTP Range downloads with live progress bar & SHA-256
                              </p>
                            </div>
                            <button
                              onClick={() => setMangalTab('custom_model')}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 cursor-pointer"
                            >
                              + Custom Model
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                            <span className="text-slate-300">Restrict Downloads to Wi-Fi Only</span>
                            <button
                              onClick={() => setWifiOnlyGuard((v) => !v)}
                              className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                                wifiOnlyGuard
                                  ? 'bg-amber-400 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {wifiOnlyGuard ? 'ON' : 'OFF (Mobile Data OK)'}
                            </button>
                          </div>

                          {modelStatusBanner && (
                            <div className="p-2 rounded-xl bg-[#23190B] text-[10px] font-mono text-amber-200">
                              {modelStatusBanner}
                            </div>
                          )}
                        </div>

                        {/* Model Cards with Real-Time Progress Bars */}
                        <div className="space-y-2 max-h-[430px] overflow-y-auto pr-0.5">
                          {models.map((m) => {
                            const prog = downloadProgressMap[m.modelId];
                            const isDownloading =
                              prog?.status === 'DOWNLOADING' ||
                              prog?.status === 'CONNECTING' ||
                              prog?.status === 'VERIFYING_CHECKSUM';
                            const isDownloaded = m.downloaded || prog?.status === 'COMPLETED';
                            const pct = prog
                              ? Math.min(100, Math.round((prog.bytesDownloadedMb / prog.totalMb) * 100))
                              : isDownloaded
                              ? 100
                              : 0;

                            return (
                              <div
                                key={m.modelId}
                                className={`p-3 rounded-2xl bg-[#111824] border space-y-2 ${
                                  m.isActive
                                    ? 'border-emerald-400'
                                    : isDownloading
                                    ? 'border-amber-400'
                                    : 'border-[#1E293B]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-white truncate">
                                    {m.displayName}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                                      m.isActive
                                        ? 'bg-[#062E22] text-emerald-400'
                                        : isDownloading
                                        ? 'bg-[#291D0A] text-amber-400'
                                        : isDownloaded
                                        ? 'bg-slate-800 text-slate-300'
                                        : 'bg-[#090D14] text-slate-400'
                                    }`}
                                  >
                                    {m.isActive
                                      ? 'ACTIVE'
                                      : prog?.status === 'CONNECTING'
                                      ? 'CONNECTING...'
                                      : prog?.status === 'DOWNLOADING'
                                      ? `DOWNLOADING ${pct}%`
                                      : prog?.status === 'VERIFYING_CHECKSUM'
                                      ? 'VERIFYING SHA-256...'
                                      : prog?.status === 'PAUSED'
                                      ? 'PAUSED'
                                      : isDownloaded
                                      ? 'DOWNLOADED'
                                      : 'NOT DOWNLOADED'}
                                  </span>
                                </div>

                                <div className="text-[10px] font-mono text-slate-400">
                                  {m.category} · {m.quantization} · {m.sizeMb} MB · Min{' '}
                                  {m.requiredRamMb} MB RAM
                                </div>

                                {/* LIVE PROGRESS BAR */}
                                {prog && prog.status !== 'IDLE' && (
                                  <div className="space-y-1">
                                    <div className="w-full h-2 rounded-full bg-[#080B11] overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-200 ${
                                          prog.status === 'FAILED'
                                            ? 'bg-rose-500'
                                            : prog.status === 'COMPLETED'
                                            ? 'bg-emerald-400'
                                            : 'bg-amber-400'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-amber-200 tabular-nums">
                                        {prog.bytesDownloadedMb} MB / {prog.totalMb} MB ({pct}%)
                                      </span>
                                      <span className="text-slate-400 tabular-nums">
                                        {isDownloading
                                          ? `${prog.speedMbPerSec.toFixed(1)} MB/s`
                                          : prog.status}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-0.5">
                                  {isDownloading ? (
                                    <button
                                      onClick={() => pauseModelDownload(m.modelId)}
                                      className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Pause className="w-3 h-3" />
                                      <span>Pause / Cancel</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        isDownloaded
                                          ? activateDownloadedModel(m)
                                          : startOrResumeModelDownload(m)
                                      }
                                      className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer ${
                                        m.isActive
                                          ? 'bg-emerald-400 text-slate-950'
                                          : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                      }`}
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>
                                        {m.isActive
                                          ? 'Active in Engine'
                                          : isDownloaded
                                          ? 'Activate Model'
                                          : prog?.status === 'PAUSED'
                                          ? 'Resume Download'
                                          : `Download (${m.sizeMb} MB)`}
                                      </span>
                                    </button>
                                  )}

                                  {(isDownloaded || prog?.status === 'PAUSED') && (
                                    <button
                                      onClick={() => deleteModelFromDisk(m)}
                                      className="px-2.5 py-1.5 rounded-xl border border-[#1E293B] text-rose-400 hover:bg-rose-950/40 text-[11px] font-semibold cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: CUSTOM MODEL SELECTOR (CustomModelScreen.kt) */}
                    {mangalTab === 'custom_model' && (
                      <div className="space-y-2.5 max-h-[555px] overflow-y-auto pr-0.5">
                        <div className="p-3 rounded-2xl bg-[#111824] border border-amber-400/80 space-y-1.5">
                          <div className="text-xs font-extrabold text-white">
                            Custom Model Selector (.gguf / .bin)
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            Bring your own GGUF LLM (DeepSeek, Llama 3.2, Qwen, Gemma, Mistral) or
                            Whisper .bin file from phone storage or a custom direct HTTPS URL.
                          </p>
                          {modelStatusBanner && (
                            <div className="p-2 rounded-xl bg-[#23190B] text-[10px] font-mono text-amber-200">
                              {modelStatusBanner}
                            </div>
                          )}
                        </div>

                        {/* 1. Select Category & Optional Name */}
                        <div className="p-3 rounded-2xl bg-[#111824] border border-[#1E293B] space-y-2">
                          <div className="text-[11px] font-bold text-amber-400">
                            1. Select Custom Model Type & Optional Name
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(
                              [
                                ['LLM_GGUF', 'LLM (.gguf)'],
                                ['STT_WHISPER', 'Whisper STT (.bin)']
                              ] as const
                            ).map(([cat, label]) => (
                              <button
                                key={cat}
                                onClick={() => setCustomCategory(cat)}
                                className={`py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                                  customCategory === cat
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-[#080B11] text-slate-400'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={customModelName}
                            onChange={(e) => setCustomModelName(e.target.value)}
                            placeholder="Optional Display Name (e.g. DeepSeek R1 1.5B Q4_K_M)"
                            className="w-full bg-[#080B11] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* 2. Import Local .gguf / .bin File from Phone Storage */}
                        <div className="p-3 rounded-2xl bg-[#111824] border border-[#1E293B] space-y-2">
                          <div className="text-[11px] font-bold text-white">
                            2. Import Local .gguf / .bin File from Phone Storage
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Uses Android SAF OpenDocument() picker, copies into encrypted app
                            storage, verifies SHA-256, and activates immediately.
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".gguf,.bin,.onnx,*/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const sizeMb = Math.max(
                                  45,
                                  Math.round(file.size / (1024 * 1024)) || 890
                                );
                                handleImportCustomModelFile(file.name, sizeMb);
                              }
                            }}
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Browse Phone Storage for .gguf / .bin File</span>
                          </button>

                          {/* Instant 1-Tap Sample Custom GGUF Presets for Testing */}
                          <div className="pt-1 space-y-1">
                            <div className="text-[9px] font-mono text-slate-400">
                              Or test instant SAF local import with a sample custom GGUF:
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={() =>
                                  handleImportCustomModelFile(
                                    'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
                                    1120
                                  )
                                }
                                className="p-1.5 rounded-lg bg-[#080B11] border border-slate-800 hover:border-amber-400/50 text-[10px] text-amber-200 font-mono truncate cursor-pointer"
                              >
                                + DeepSeek-R1-1.5B.gguf
                              </button>
                              <button
                                onClick={() =>
                                  handleImportCustomModelFile(
                                    'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
                                    2020
                                  )
                                }
                                className="p-1.5 rounded-lg bg-[#080B11] border border-slate-800 hover:border-amber-400/50 text-[10px] text-amber-200 font-mono truncate cursor-pointer"
                              >
                                + Llama-3.2-3B.gguf
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 3. Or Download from Custom Direct HTTPS URL */}
                        <div className="p-3 rounded-2xl bg-[#111824] border border-[#1E293B] space-y-2">
                          <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>3. Or Download from Custom Direct HTTPS URL</span>
                          </div>
                          <input
                            type="text"
                            value={customModelUrl}
                            onChange={(e) => setCustomModelUrl(e.target.value)}
                            placeholder="https://huggingface.co/.../resolve/main/model.gguf"
                            className="w-full bg-[#080B11] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-[10px] font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleDownloadCustomUrlModel()}
                              className="py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                            >
                              Download Custom URL
                            </button>
                            <button
                              onClick={() => {
                                handleDownloadCustomUrlModel(
                                  'https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
                                  'SmolLM2 1.7B Instruct'
                                );
                                setMangalTab('model_manager');
                              }}
                              className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[10px] cursor-pointer"
                            >
                              Demo HuggingFace URL DL
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: SETTINGS (SettingsScreen.kt) */}
                    {mangalTab === 'settings' && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-[#111824] border border-[#1E293B] space-y-2.5 text-xs">
                          <div>
                            <h2 className="text-xs font-extrabold text-white">
                              Native TTS Voice & Thermal Guard
                            </h2>
                            <p className="text-[10px] text-emerald-400">
                              100% Offline Guarantee · SQLCipher AES-256 · Zero Telemetry
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-200">
                              Hands-Free &ldquo;Mangal&rdquo; Service
                            </span>
                            <button
                              onClick={() => setWakeServiceRunning((v) => !v)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] cursor-pointer"
                            >
                              {wakeServiceRunning ? 'RUNNING' : 'STOPPED'}
                            </button>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Speech Rate</span>
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

                          <div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Voice Pitch</span>
                              <span>{speechPitch.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.6"
                              max="1.5"
                              step="0.05"
                              value={speechPitch}
                              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                              className="w-full accent-amber-400"
                            />
                          </div>

                          <button
                            onClick={() =>
                              speakViaAndroidTts(
                                'MANGAL offline voice synthesis is active and operating locally on your device.'
                              )
                            }
                            className="w-full py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                          >
                            Test Offline TTS Voice Now
                          </button>

                          <button
                            onClick={() => setOsView('PLAY_PROTECT_SCANNER')}
                            className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Open Google Play Protect Scanner
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4-TAB COMPOSE BOTTOM NAVIGATION BAR (Matches MangalNavGraph.kt) */}
                  <div className="grid grid-cols-4 border-t border-[#1E293B] bg-[#080B11] py-1.5 px-1.5 gap-1">
                    {(
                      [
                        ['voice_chat', 'Assistant', 'MIC'],
                        ['model_manager', 'Models', 'AI'],
                        ['custom_model', 'Custom GGUF', '+'],
                        ['settings', 'Settings', 'CFG']
                      ] as const
                    ).map(([tab, label, badge]) => {
                      const active = mangalTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setMangalTab(tab)}
                          className={`py-1 px-1 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#23190B] text-amber-400 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full text-[8px] font-mono font-bold flex items-center justify-center ${
                              active
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-[#111824] text-slate-400'
                            }`}
                          >
                            {badge}
                          </span>
                          <span className="text-[10px] truncate">{label}</span>
                        </button>
                      );
                    })}
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
        {/* Instant Feature Switcher & Voice Utterance Triggers */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                10/10 Upgraded APK + Interactive Emulator Controls
              </h2>
              <p className="text-xs text-slate-400">
                Test the new <strong>Live Download Progress Bar</strong>, the{' '}
                <strong>Custom GGUF Model Selector</strong>, and continuous{' '}
                <strong>&ldquo;Mangal&rdquo;</strong> voice listening.
              </p>
            </div>
          </div>

          {/* Direct Jump to the 4 Upgraded App Screens */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => {
                setOsView('MANGAL_APP');
                setMangalTab('voice_chat');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                osView === 'MANGAL_APP' && mangalTab === 'voice_chat'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              1. Assistant UI
            </button>
            <button
              onClick={() => {
                setOsView('MANGAL_APP');
                setMangalTab('model_manager');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                osView === 'MANGAL_APP' && mangalTab === 'model_manager'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              2. Progress Bar DL
            </button>
            <button
              onClick={() => {
                setOsView('MANGAL_APP');
                setMangalTab('custom_model');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                osView === 'MANGAL_APP' && mangalTab === 'custom_model'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-950 border border-amber-500/40 text-amber-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>3. Custom GGUF</span>
            </button>
            <button
              onClick={() => setOsView('PIXEL_LAUNCHER')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                osView === 'PIXEL_LAUNCHER'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              4. Home Icon
            </button>
          </div>

          {/* Voice Command Injection Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                title: '"Mangal" (Wake Only — Prompts & Listens)',
                utterance: 'Mangal'
              },
              {
                title: '"Mangal, turn on the flashlight"',
                utterance: 'Mangal, turn on the flashlight'
              },
              {
                title: '"Mangal, set alarm for 6:30 AM"',
                utterance: 'Mangal, set an alarm for 6:30 AM tomorrow labeled Morning Workout'
              },
              {
                title: '"Mangal, set a timer for 5 minutes"',
                utterance: 'Mangal, set a timer for 5 minutes'
              },
              {
                title: '"Mangal, send SMS to +1-555-0192"',
                utterance: 'Mangal, send an SMS to +1-555-0192 saying Running 10 minutes late'
              },
              {
                title: '"Mangal, open YouTube"',
                utterance: 'Mangal, open YouTube'
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
              <span>
                adb logcat -s MangalSpeechListener ResumableDownloader CustomModelScreen
              </span>
            </div>
            <button
              onClick={() => setLogcat([])}
              className="text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Logcat
            </button>
          </div>
          <div className="p-3.5 h-[250px] overflow-y-auto font-mono text-[11px] space-y-1.5 leading-relaxed">
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

        {/* Quick Links to Inspect the Upgraded Android Files */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">Inspect Upgraded Android Source:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                onInspectSourceFile(
                  'app/src/main/java/ai/mangal/assistant/ui/custom/CustomModelScreen.kt'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] hover:border-amber-400/50 cursor-pointer"
            >
              CustomModelScreen.kt
            </button>
            <button
              onClick={() =>
                onInspectSourceFile(
                  'app/src/main/java/ai/mangal/assistant/speech/MangalSpeechListener.kt'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] hover:border-amber-400/50 cursor-pointer"
            >
              MangalSpeechListener.kt
            </button>
            <button
              onClick={() =>
                onInspectSourceFile(
                  'app/src/main/java/ai/mangal/assistant/ui/models/ModelManagerScreen.kt'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] hover:border-emerald-400/50 cursor-pointer"
            >
              ModelManagerScreen.kt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
