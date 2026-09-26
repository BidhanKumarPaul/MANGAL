/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  ShieldCheck,
  Mic,
  MicOff,
  Copy,
  Check,
  Search,
  ChevronRight,
  Volume2,
  FileCode2,
  Trash2,
  Cpu,
  Thermometer,
  Wifi,
  WifiOff,
  Play,
  Terminal,
  Sparkles,
  Send,
  Radio
} from 'lucide-react';
import { PHASE1_BUILD_DATA } from './data/generatedPhase1Project';
import { TECH_STACK_DECISIONS, PHASE_ROADMAP } from './data/techStackAudit';

type TopNavTab = 'preview' | 'source' | 'stack' | 'release';
type DeviceScreenRoute = 'voice_chat' | 'model_manager' | 'settings';
type WakeListenMode = 'DISABLED' | 'STANDBY_FOR_MANGAL' | 'WAKE_TRIGGERED_LISTENING';

interface PermissionGroupState {
  id: 'MICROPHONE' | 'FOREGROUND_NOTIFICATION' | 'CALENDAR' | 'CONTACTS';
  title: string;
  rationale: string;
  androidPermissions: string[];
  requiredForCoreLoop: boolean;
  granted: boolean;
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
  downloadProgress: number;
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
    permissionBlocked?: PermissionGroupState['id'];
  };
  timestamp: string;
}

/**
 * Renders the user's official MANGAL brand logo:
 * Deep obsidian base (#120E0A), warm amber-bronze radial glow, cream capsule microphone
 * (#EFE6D5) with stand, and 3 concentric acoustic wave arcs on left & right.
 */
function MangalLogoBadge({
  size = 40,
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
      className={`relative rounded-xl bg-[#120E0A] border border-[#3B2614] flex items-center justify-center overflow-hidden shrink-0 select-none ${
        pulsing ? 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/20' : ''
      }`}
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="mangalLogoGlow" cx="50%" cy="45%" r="42%">
            <stop
              offset="0%"
              stopColor={pulsing ? '#F59E0B' : '#9A5B22'}
              stopOpacity={pulsing ? '0.98' : '0.9'}
            />
            <stop offset="55%" stopColor="#4B290C" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#120E0A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="96" fill="#120E0A" />
        <circle cx="256" cy="230" r="205" fill="url(#mangalLogoGlow)" />
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

const INITIAL_PERMISSIONS: PermissionGroupState[] = [
  {
    id: 'MICROPHONE',
    title: 'Microphone Capture & "Mangal" Wake Word',
    rationale:
      'Required for hands-free "Mangal" wake word detection and whisper.cpp offline speech-to-text. Audio never leaves the device.',
    androidPermissions: ['android.permission.RECORD_AUDIO'],
    requiredForCoreLoop: true,
    granted: true
  },
  {
    id: 'FOREGROUND_NOTIFICATION',
    title: 'Hands-Free Service Notification',
    rationale:
      'Displays a persistent status indicator when MANGAL is listening for the "Mangal" wake word, ensuring 100% Google Play Protect compliance.',
    androidPermissions: ['android.permission.POST_NOTIFICATIONS'],
    requiredForCoreLoop: true,
    granted: true
  },
  {
    id: 'CALENDAR',
    title: 'Local Calendar Access',
    rationale:
      'Required only when you ask MANGAL to schedule or inspect events via CalendarContract.',
    androidPermissions: [
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR'
    ],
    requiredForCoreLoop: false,
    granted: true
  },
  {
    id: 'CONTACTS',
    title: 'Local Contacts Lookup (Play-Protect-Safe)',
    rationale:
      'Used to resolve contact names locally when preparing Play-Protect-safe ACTION_SENDTO (SMS) or ACTION_DIAL calls.',
    androidPermissions: ['android.permission.READ_CONTACTS'],
    requiredForCoreLoop: false,
    granted: true
  }
];

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
    downloadProgress: 100,
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
    downloadProgress: 0,
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
    downloadProgress: 0,
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
    downloadProgress: 100,
    isActive: true
  },
  {
    modelId: 'whisper-base-en-q8_0',
    displayName: 'Whisper Base.en (INT8 / Q8_0)',
    category: 'STT_WHISPER',
    quantization: 'Q8_0',
    sizeMb: 82,
    requiredRamMb: 1536,
    license: 'MIT',
    sha256: 'a1b2c3d4e5f6',
    downloaded: false,
    downloadProgress: 0,
    isActive: false
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
    downloadProgress: 100,
    isActive: true
  }
];

const QUICK_TEST_COMMANDS = [
  {
    label: '"Mangal, set alarm for 6:30 AM"',
    utterance: 'Mangal, set an alarm for 6:30 AM tomorrow labeled Morning Workout',
    wakeTriggered: true
  },
  {
    label: '"Mangal, turn on the flashlight"',
    utterance: 'Mangal, turn on the flashlight',
    wakeTriggered: true
  },
  {
    label: '"Mangal, schedule Design Review"',
    utterance: 'Mangal, create a calendar event for Design Review at 3 PM for 45 minutes',
    wakeTriggered: true
  },
  {
    label: '"Mangal, text +1-555-0192" (Play Protect Safe)',
    utterance: 'Mangal, send an SMS to +1-555-0192 saying Running 10 minutes late',
    wakeTriggered: true
  },
  {
    label: '"Mangal, open Spotify"',
    utterance: 'Mangal, open Spotify on my phone',
    wakeTriggered: true
  },
  {
    label: 'Offline Q&A (Caveats No Internet)',
    utterance: 'Mangal, explain how lithium-ion batteries work and check live weather',
    wakeTriggered: true
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TopNavTab>('preview');
  const [deviceRoute, setDeviceRoute] = useState<DeviceScreenRoute>('voice_chat');
  const [permissions, setPermissions] = useState<PermissionGroupState[]>(INITIAL_PERMISSIONS);
  const [pendingPermissionDialog, setPendingPermissionDialog] =
    useState<PermissionGroupState | null>(null);

  // Hardware / RAM / Thermal Simulator state
  const [deviceRamMb, setDeviceRamMb] = useState<number>(8192);
  const [thermalState, setThermalState] = useState<'NOMINAL' | 'MODERATE'>('NOMINAL');
  const [wifiConnected, setWifiConnected] = useState<boolean>(true);
  const [wifiOnlyGuard, setWifiOnlyGuard] = useState<boolean>(true);
  const [models, setModels] = useState<SimulatedModel[]>(INITIAL_MODELS);
  const [modelBannerError, setModelBannerError] = useState<string | null>(null);

  // Hands-Free "Mangal" Wake Word State (like "Hey Google")
  const [wakeMode, setWakeMode] = useState<WakeListenMode>('STANDBY_FOR_MANGAL');
  const [wakeStatusBanner, setWakeStatusBanner] = useState<string>(
    'Standby: Listening offline for wake word "Mangal"...'
  );
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [speakRepliesAloud, setSpeakRepliesAloud] = useState<boolean>(true);
  const [unloadOnBackground, setUnloadOnBackground] = useState<boolean>(true);
  const [inputDraft, setInputDraft] = useState<string>('');
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'MANGAL v1.1 ready (100% offline · Google Play Protect verified). Hands-free wake word is active: say "Mangal" (just like "Hey Google") and I will chime and start listening automatically.',
      timestamp: '09:41:00'
    }
  ]);

  // Source explorer state
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [fileSearch, setFileSearch] = useState<string>('');
  const [selectedFilePath, setSelectedFilePath] = useState<string>(
    'app/src/main/java/ai/mangal/assistant/service/MangalWakeWordForegroundService.kt'
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Web Audio earcon synthesizer (matches ToneGenerator in MangalWakeWordForegroundService.kt)
  const playWakeChime = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {
      // Ignore if browser audio autoplay blocked
    }
  };

  const micGranted = useMemo(
    () => permissions.find((p) => p.id === 'MICROPHONE')?.granted ?? false,
    [permissions]
  );

  const activeLlm = useMemo(
    () => models.find((m) => m.category === 'LLM_GGUF' && m.isActive) || models[0],
    [models]
  );

  const activeStt = useMemo(
    () => models.find((m) => m.category === 'STT_WHISPER' && m.isActive) || models[3],
    [models]
  );

  const effectiveContextLength = useMemo(() => {
    if (thermalState === 'MODERATE') return 1024;
    if (deviceRamMb <= 4096) return 1536;
    return 4096;
  }, [thermalState, deviceRamMb]);

  const modulesList = useMemo(() => {
    const counts: Record<string, number> = { all: PHASE1_BUILD_DATA.files.length };
    for (const f of PHASE1_BUILD_DATA.files) {
      counts[f.module] = (counts[f.module] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredFiles = useMemo(() => {
    return PHASE1_BUILD_DATA.files.filter((file) => {
      const matchesModule = selectedModule === 'all' || file.module === selectedModule;
      const matchesSearch =
        fileSearch.trim() === '' ||
        file.path.toLowerCase().includes(fileSearch.toLowerCase()) ||
        file.content.toLowerCase().includes(fileSearch.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [selectedModule, fileSearch]);

  const activeFile = useMemo(() => {
    return (
      PHASE1_BUILD_DATA.files.find((f) => f.path === selectedFilePath) ||
      filteredFiles[0] ||
      PHASE1_BUILD_DATA.files[0]
    );
  }, [selectedFilePath, filteredFiles]);

  const speakWithAndroidTts = (text: string) => {
    if (!speakRepliesAloud) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Core Offline Tool-Calling & Wake Word Stripper
  const executeOfflineAssistantTurn = (rawUtterance: string, forceWakeTriggered = false) => {
    const trimmed = rawUtterance.trim();
    if (!trimmed) return;

    // Detect if utterance starts with "Mangal" or "Hey Mangal" (like OpenWakeWordDetector.matchWakeTranscript)
    const wakeMatch = trimmed.match(/^(?:hey\s+)?mangal\b[\s,.:;-]*(.*)$/i);
    const wasWakeTriggered = forceWakeTriggered || Boolean(wakeMatch);
    const cleanCommand =
      wakeMatch && wakeMatch[1].trim().length > 0 ? wakeMatch[1].trim() : trimmed;

    if (wasWakeTriggered) {
      playWakeChime();
      setWakeMode('WAKE_TRIGGERED_LISTENING');
      setWakeStatusBanner('Wake Word "Mangal" Detected! Executing offline pipeline...');
      setTimeout(() => {
        setWakeMode((prev) => (prev === 'DISABLED' ? 'DISABLED' : 'STANDBY_FOR_MANGAL'));
        setWakeStatusBanner('Standby: Listening offline for wake word "Mangal"...');
      }, 1800);
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
      triggeredByWakeWord: wasWakeTriggered,
      sttLatencyMs: activeStt.modelId.includes('tiny') ? 138 : 220,
      timestamp: nowTime
    };

    const lower = cleanCommand.toLowerCase();
    let toolCallJson: string | undefined;
    let toolResult: ChatTurn['toolExecutionResult'];
    let replyText = '';

    // If the user ONLY said "Mangal" with no trailing command, prompt them hands-free
    if (/^(?:hey\s+)?mangal$/i.test(trimmed)) {
      replyText = "I'm listening. What can I do for you?";
      const assistantTurn: ChatTurn = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        triggeredByWakeWord: true,
        llmTokensPerSec: 31.4,
        timestamp: nowTime
      };
      setChatHistory((prev) => [...prev, userTurn, assistantTurn]);
      speakWithAndroidTts(replyText);
      return;
    }

    // 1. Alarm / Timer
    if (lower.includes('alarm') || lower.includes('timer') || lower.includes('wake me')) {
      const isTimer = lower.includes('timer');
      const payload = isTimer
        ? {
            type: 'tool_call',
            toolName: 'set_alarm_or_timer',
            arguments: { mode: 'timer', durationSeconds: 300, message: 'MANGAL Timer' }
          }
        : {
            type: 'tool_call',
            toolName: 'set_alarm_or_timer',
            arguments: { mode: 'alarm', hour: 6, minute: 30, message: 'Morning Workout' }
          };
      toolCallJson = JSON.stringify(payload, null, 2);
      const summary = isTimer
        ? 'Set a countdown timer for 300 seconds via AlarmClock.ACTION_SET_TIMER.'
        : 'Scheduled alarm for 06:30 (Morning Workout) via AlarmClock.ACTION_SET_ALARM.';
      toolResult = {
        toolName: 'set_alarm_or_timer',
        success: true,
        summary
      };
      replyText = isTimer
        ? "I've started a 5-minute countdown timer for you."
        : "Done. I've set your alarm for 6:30 AM labeled Morning Workout.";
    }
    // 2. Calendar Event
    else if (
      lower.includes('calendar') ||
      lower.includes('schedule') ||
      lower.includes('meeting') ||
      lower.includes('event')
    ) {
      const calPerm = permissions.find((p) => p.id === 'CALENDAR')?.granted ?? false;
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
      if (!calPerm) {
        toolResult = {
          toolName: 'create_calendar_event',
          success: false,
          summary: 'Blocked: WRITE_CALENDAR permission not granted.',
          permissionBlocked: 'CALENDAR'
        };
        replyText =
          "I can't create the calendar event 'Design Review' yet because Calendar permission is not granted. Tap Grant Permission below to allow local calendar access.";
      } else {
        toolResult = {
          toolName: 'create_calendar_event',
          success: true,
          summary: "Inserted 'Design Review' (45 min) into CalendarContract.Events.CONTENT_URI."
        };
        replyText = "I've added 'Design Review' for 45 minutes to your local device calendar.";
      }
    }
    // 3. Play-Protect-Safe SMS or Phone Call (ACTION_SENDTO / ACTION_DIAL)
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
      toolResult = {
        toolName: 'send_sms_or_place_call',
        success: true,
        summary: isCall
          ? 'Launched Intent.ACTION_DIAL (tel:+1-555-0192) — 100% Play Protect compliant.'
          : 'Launched Intent.ACTION_SENDTO (smsto:+1-555-0192) with pre-filled body — zero restricted permissions.'
      };
      replyText = isCall
        ? 'Opening your phone dialer for +1-555-0192.'
        : 'Prepared your SMS to +1-555-0192: "Running 10 minutes late".';
    }
    // 4. Open Installed App
    else if (lower.includes('open ') || lower.includes('launch ')) {
      const appMatch =
        cleanCommand
          .replace(/^(open|launch)\s+/i, '')
          .replace(/on my phone/i, '')
          .trim() || 'Spotify';
      const payload = {
        type: 'tool_call',
        toolName: 'open_installed_app',
        arguments: { appName: appMatch }
      };
      toolCallJson = JSON.stringify(payload, null, 2);
      toolResult = {
        toolName: 'open_installed_app',
        success: true,
        summary: `Resolved '${appMatch}' via PackageManager.queryIntentActivities and launched package.`
      };
      replyText = `Opening ${appMatch} for you now.`;
    }
    // 5. Device Settings (Flashlight / Volume / Wi-Fi / Bluetooth / Brightness)
    else if (
      lower.includes('flashlight') ||
      lower.includes('torch') ||
      lower.includes('volume') ||
      lower.includes('wifi') ||
      lower.includes('wi-fi') ||
      lower.includes('bluetooth') ||
      lower.includes('brightness')
    ) {
      const target =
        lower.includes('flashlight') || lower.includes('torch')
          ? 'flashlight'
          : lower.includes('volume')
          ? 'volume'
          : lower.includes('wifi') || lower.includes('wi-fi')
          ? 'wifi'
          : lower.includes('bluetooth')
          ? 'bluetooth'
          : 'brightness';
      const state = lower.includes('off') || lower.includes('down') ? 'off' : 'on';
      const payload = {
        type: 'tool_call',
        toolName: 'adjust_device_setting',
        arguments: { target, state }
      };
      toolCallJson = JSON.stringify(payload, null, 2);
      toolResult = {
        toolName: 'adjust_device_setting',
        success: true,
        summary:
          target === 'flashlight'
            ? `CameraManager.setTorchMode("0", ${state === 'on'}) executed.`
            : target === 'volume'
            ? `AudioManager.adjustStreamVolume(STREAM_MUSIC) executed.`
            : `Launched Android Settings.Panel intent for ${target}.`
      };
      replyText =
        target === 'flashlight'
          ? `I've turned the flashlight ${state}.`
          : `Adjusted your ${target} setting locally.`;
    }
    // 6. General Offline Q&A
    else {
      const payload = {
        type: 'reply',
        replyText:
          'Lithium-ion batteries store energy by shuttling lithium ions between a graphite anode and a metal-oxide cathode through an electrolyte. Note: Because I run 100% offline with zero network access, I cannot fetch live weather or real-time internet facts.'
      };
      toolCallJson = JSON.stringify(payload, null, 2);
      replyText = payload.replyText;
    }

    const assistantTurn: ChatTurn = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      text: replyText,
      triggeredByWakeWord: wasWakeTriggered,
      llmTokensPerSec: thermalState === 'MODERATE' ? 14.2 : 28.6,
      toolCallJson,
      toolExecutionResult: toolResult,
      timestamp: nowTime
    };

    setChatHistory((prev) => [...prev, userTurn, assistantTurn]);
    speakWithAndroidTts(replyText);
  };

  // Hands-free "Mangal" Wake Word Simulation / Browser Mic Listener
  const recognitionRef = useRef<unknown>(null);

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

  const triggerSayMangalHandsFree = () => {
    if (!micGranted) {
      setPendingPermissionDialog(permissions.find((p) => p.id === 'MICROPHONE') || null);
      return;
    }
    playWakeChime();
    setWakeMode('WAKE_TRIGGERED_LISTENING');
    setWakeStatusBanner('Wake Word "Mangal" Detected! Listening for your command...');

    const SpeechRec =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (typeof SpeechRec === 'function') {
      try {
        setIsListeningMic(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new (SpeechRec as any)();
        recognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          setIsListeningMic(false);
          if (transcript) {
            executeOfflineAssistantTurn(`Mangal, ${transcript}`, true);
          }
        };
        recognition.onerror = () => {
          setIsListeningMic(false);
          executeOfflineAssistantTurn(
            'Mangal, set an alarm for 6:30 AM tomorrow labeled Morning Workout',
            true
          );
        };
        recognition.onend = () => {
          setIsListeningMic(false);
        };
        recognition.start();
        return;
      } catch {
        setIsListeningMic(false);
      }
    }

    // Fallback when browser SpeechRecognition is restricted in sandboxed iframe
    setIsListeningMic(true);
    setTimeout(() => {
      setIsListeningMic(false);
      executeOfflineAssistantTurn('Mangal, turn on the flashlight', true);
    }, 900);
  };

  const handleDownloadOrActivateModel = (model: SimulatedModel) => {
    setModelBannerError(null);
    const safeRamLimitMb = Math.floor(deviceRamMb * 0.78);
    if (model.requiredRamMb > safeRamLimitMb) {
      setModelBannerError(
        `DeviceHealthAndRamGuard OOM Protection: Refused to load '${model.displayName}'. Model requires ${model.requiredRamMb} MB RAM, which exceeds safe limit (${safeRamLimitMb} MB) on a ${deviceRamMb} MB device.`
      );
      return;
    }

    if (!model.downloaded) {
      if (wifiOnlyGuard && !wifiConnected) {
        setModelBannerError(
          'ResumableModelDownloader blocked: Unmetered Wi-Fi is disconnected and Wi-Fi-Only Guard is active.'
        );
        return;
      }
      setModels((prev) =>
        prev.map((m) =>
          m.modelId === model.modelId ? { ...m, downloaded: true, downloadProgress: 100 } : m
        )
      );
    }

    setModels((prev) =>
      prev.map((m) =>
        m.category === model.category
          ? {
              ...m,
              isActive: m.modelId === model.modelId,
              downloaded: m.modelId === model.modelId ? true : m.downloaded
            }
          : m
      )
    );
  };

  const handleDeleteModel = (model: SimulatedModel) => {
    setModelBannerError(null);
    setModels((prev) =>
      prev.map((m) =>
        m.modelId === model.modelId
          ? { ...m, downloaded: false, downloadProgress: 0, isActive: false }
          : m
      )
    );
  };

  const handleGrantPermission = (id: PermissionGroupState['id'], allow: boolean) => {
    setPermissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, granted: allow } : item))
    );
    setPendingPermissionDialog(null);
  };

  const handleCopyCode = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  const openFileInExplorer = (path: string) => {
    setSelectedFilePath(path);
    setActiveTab('source');
  };

  const correspondingKotlinFileForRoute: Record<DeviceScreenRoute, string> = {
    voice_chat: 'app/src/main/java/ai/mangal/assistant/service/MangalWakeWordForegroundService.kt',
    model_manager: 'data/src/main/java/ai/mangal/data/models/ResumableModelDownloader.kt',
    settings: 'app/src/main/java/ai/mangal/assistant/ui/settings/SettingsScreen.kt'
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-[#0B0F17]/95 sticky top-0 z-30 backdrop-blur-md">
        {/* Zone 1: Brand Logo + Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('preview');
          }}
          className="flex items-center gap-3 text-lg font-bold tracking-tight text-white font-display whitespace-nowrap"
        >
          <MangalLogoBadge size={36} pulsing={wakeMode === 'WAKE_TRIGGERED_LISTENING'} />
          <span>MANGAL</span>
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'preview'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Interactive Simulator
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'source'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Kotlin & C++ Source ({PHASE1_BUILD_DATA.files.length})
          </button>
          <button
            onClick={() => setActiveTab('stack')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'stack'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Architecture & Licenses
          </button>
          <button
            onClick={() => setActiveTab('release')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'release'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Play Protect & Release
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3">
          <a
            href={PHASE1_BUILD_DATA.archive.url}
            download={PHASE1_BUILD_DATA.archive.filename}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Android Project (.tar.gz)</span>
          </a>
        </div>
      </header>

      {/* Mobile Nav Switcher */}
      <div className="flex md:hidden items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-900/60 overflow-x-auto">
        {(
          [
            ['preview', 'Simulator'],
            ['source', 'Source Code'],
            ['stack', 'Architecture'],
            ['release', 'Play Protect & Release']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === key
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-7">
        {/* Top Phase Banner & Metadata */}
        <div className="mb-7 pb-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <MangalLogoBadge
              size={60}
              pulsing={wakeMode === 'WAKE_TRIGGERED_LISTENING'}
              showWordmark
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1.5">
                <span className="text-emerald-400 font-semibold">
                  Play Protect Verified · Zero Warnings
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-medium">
                  Hands-Free &ldquo;Mangal&rdquo; Wake Word Active
                </span>
                <span aria-hidden="true">·</span>
                <span>{PHASE1_BUILD_DATA.files.length} Files Audited</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                MANGAL — Hands-Free Offline Android Voice Assistant
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
            <span>SHA-256: {PHASE1_BUILD_DATA.archive.sha256.slice(0, 12)}…</span>
            <span aria-hidden="true">·</span>
            <span>{(PHASE1_BUILD_DATA.archive.sizeBytes / 1024).toFixed(1)} KB Archive</span>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE ANDROID SIMULATOR & HANDS-FREE WORKBENCH */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Android Device Viewport (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[405px] bg-slate-950 border border-slate-800 rounded-[32px] p-3 shadow-2xl">
                {/* Android Status Bar */}
                <div className="flex items-center justify-between px-4 py-2 text-[11px] font-mono tabular-nums text-slate-400">
                  <span>09:41</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300">WAKE: &ldquo;MANGAL&rdquo;</span>
                    <span>·</span>
                    <span className="text-emerald-400">OFFLINE</span>
                  </div>
                </div>

                {/* Screen Viewport */}
                <div className="relative h-[660px] bg-[#0F131C] rounded-[22px] border border-slate-800/90 flex flex-col justify-between overflow-hidden">
                  {/* Screen Body */}
                  <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-between">
                    {deviceRoute === 'voice_chat' && (
                      <>
                        {/* Top Header inside VoiceChatScreen with MANGAL Brand Logo */}
                        <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MangalLogoBadge
                              size={38}
                              pulsing={
                                wakeMode === 'WAKE_TRIGGERED_LISTENING' || isListeningMic
                              }
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-white truncate">
                                  MANGAL Voice AI
                                </h2>
                                <span className="text-[10px] font-mono text-emerald-400">
                                  Play Protect Safe
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 truncate tabular-nums">
                                {activeLlm.displayName.split(' (')[0]} · ctx={effectiveContextLength}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setChatHistory([
                                {
                                  id: `clear-${Date.now()}`,
                                  role: 'assistant',
                                  text: 'SQLCipher conversation memory cleared on-device. Say "Mangal" anytime to wake.',
                                  timestamp: new Date().toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })
                                }
                              ])
                            }
                            title="Clear SQLCipher Conversation History"
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Hands-Free "Mangal" Wake Word Live Status Bar */}
                        <div
                          className={`mt-2.5 px-3 py-2 rounded-xl border text-[11px] font-mono flex items-center justify-between gap-2 transition-colors ${
                            wakeMode === 'WAKE_TRIGGERED_LISTENING' || isListeningMic
                              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                              : wakeMode === 'STANDBY_FOR_MANGAL'
                              ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                              : 'bg-slate-900/50 border-slate-800/60 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Radio
                              className={`w-3.5 h-3.5 shrink-0 ${
                                wakeMode === 'WAKE_TRIGGERED_LISTENING' || isListeningMic
                                  ? 'text-amber-400 animate-pulse'
                                  : wakeMode === 'STANDBY_FOR_MANGAL'
                                  ? 'text-emerald-400'
                                  : 'text-slate-600'
                              }`}
                            />
                            <span className="truncate">{wakeStatusBanner}</span>
                          </div>
                        </div>

                        {/* Conversation Stream */}
                        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                          {chatHistory.map((turn) => (
                            <div
                              key={turn.id}
                              className={`p-3 rounded-xl border text-xs space-y-2 ${
                                turn.role === 'user'
                                  ? 'bg-slate-900/90 border-slate-800 ml-6'
                                  : 'bg-slate-950/90 border-slate-800/90 mr-2'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                                <span
                                  className={
                                    turn.role === 'user'
                                      ? 'text-amber-300 font-semibold'
                                      : 'text-emerald-400 font-semibold'
                                  }
                                >
                                  {turn.role === 'user'
                                    ? turn.triggeredByWakeWord
                                      ? 'YOU (WAKE WORD: "MANGAL")'
                                      : 'YOU (16kHz PCM)'
                                    : 'MANGAL (ON-DEVICE)'}
                                </span>
                                <span>
                                  {turn.sttLatencyMs ? `Whisper ${turn.sttLatencyMs}ms · ` : ''}
                                  {turn.llmTokensPerSec ? `${turn.llmTokensPerSec} tok/s · ` : ''}
                                  {turn.timestamp}
                                </span>
                              </div>

                              {/* Tool Call JSON Envelope Inspector */}
                              {turn.toolCallJson && (
                                <pre className="p-2 rounded-lg bg-[#090D14] border border-slate-800/80 text-[10px] font-mono text-slate-300 overflow-x-auto leading-snug">
                                  <code>{turn.toolCallJson}</code>
                                </pre>
                              )}

                              {/* Local AndroidToolExecutor Result */}
                              {turn.toolExecutionResult && (
                                <div
                                  className={`p-2 rounded-lg border text-[11px] font-mono flex items-start justify-between gap-2 ${
                                    turn.toolExecutionResult.success
                                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold">
                                      ToolRegistry → {turn.toolExecutionResult.toolName}
                                    </div>
                                    <div className="text-[10px] opacity-90 mt-0.5">
                                      {turn.toolExecutionResult.summary}
                                    </div>
                                  </div>
                                  {turn.toolExecutionResult.permissionBlocked && (
                                    <button
                                      onClick={() => {
                                        const grp = permissions.find(
                                          (p) => p.id === turn.toolExecutionResult?.permissionBlocked
                                        );
                                        if (grp) setPendingPermissionDialog(grp);
                                      }}
                                      className="px-2 py-1 rounded bg-amber-400 text-slate-950 font-sans font-semibold text-[10px] whitespace-nowrap cursor-pointer shrink-0"
                                    >
                                      Grant Permission
                                    </button>
                                  )}
                                </div>
                              )}

                              <p className="text-slate-100 leading-relaxed">{turn.text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Input & Hands-Free Wake Word Controls */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (inputDraft.trim()) {
                                executeOfflineAssistantTurn(inputDraft);
                                setInputDraft('');
                              }
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={inputDraft}
                              onChange={(e) => setInputDraft(e.target.value)}
                              placeholder='Say "Mangal, set alarm for 7 AM"...'
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="submit"
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
                              title="Send Utterance"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={triggerSayMangalHandsFree}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                                isListeningMic || wakeMode === 'WAKE_TRIGGERED_LISTENING'
                                  ? 'bg-amber-400 text-slate-950'
                                  : micGranted
                                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                  : 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                              }`}
                            >
                              {micGranted ? (
                                <Mic className="w-3.5 h-3.5" />
                              ) : (
                                <MicOff className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {isListeningMic
                                  ? 'Listening after "Mangal"...'
                                  : 'Say "Mangal" (Wake Now)'}
                              </span>
                            </button>

                            <button
                              onClick={() => {
                                if (wakeMode === 'DISABLED') {
                                  setWakeMode('STANDBY_FOR_MANGAL');
                                  setWakeStatusBanner(
                                    'Standby: Listening offline for wake word "Mangal"...'
                                  );
                                } else {
                                  setWakeMode('DISABLED');
                                  setWakeStatusBanner('Hands-free wake word paused (Push-to-Talk only)');
                                }
                              }}
                              className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                wakeMode !== 'DISABLED'
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              &ldquo;Mangal&rdquo; Auto-Wake:{' '}
                              {wakeMode !== 'DISABLED' ? 'ON' : 'OFF'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {deviceRoute === 'model_manager' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-sm font-semibold text-white">
                              Offline Model Manager
                            </h2>
                            <p className="text-[11px] text-slate-400">
                              Read-only non-executable weights (Play Protect DCL safe)
                            </p>
                          </div>
                          <button
                            onClick={() => setWifiOnlyGuard((v) => !v)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                              wifiOnlyGuard
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-slate-800 bg-slate-900 text-slate-400'
                            }`}
                          >
                            Wi-Fi Guard: {wifiOnlyGuard ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {modelBannerError && (
                          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-200 leading-relaxed">
                            {modelBannerError}
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          {models.map((m) => (
                            <div
                              key={m.modelId}
                              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs font-semibold text-white">
                                    {m.displayName}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                                    {m.category} · {m.sizeMb} MB · Min {m.requiredRamMb} MB RAM ·{' '}
                                    {m.license}
                                  </div>
                                </div>
                                {m.isActive && (
                                  <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                                    ACTIVE
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[10px] font-mono text-slate-500">
                                  sha256:{m.sha256}…
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleDownloadOrActivateModel(m)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                                      m.isActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                    }`}
                                  >
                                    {m.downloaded
                                      ? m.isActive
                                        ? 'Loaded in RAM'
                                        : 'Load Model'
                                      : 'Download (Wi-Fi)'}
                                  </button>
                                  {m.downloaded && !m.isActive && (
                                    <button
                                      onClick={() => handleDeleteModel(m)}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {deviceRoute === 'settings' && (
                      <div className="space-y-3.5">
                        <div>
                          <h2 className="text-sm font-semibold text-white">
                            Settings, Native TTS & Play Protect Shield
                          </h2>
                          <p className="text-[11px] text-slate-400">
                            AndroidNativeTtsSpeaker + PermissionGatekeeper
                          </p>
                        </div>

                        {/* TTS Controls */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-200">
                              Speak Replies via Native TTS
                            </span>
                            <button
                              onClick={() => setSpeakRepliesAloud((v) => !v)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer ${
                                speakRepliesAloud
                                  ? 'bg-emerald-400 text-slate-950 font-semibold'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {speakRepliesAloud ? 'ENABLED' : 'MUTED'}
                            </button>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
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
                              className="w-full accent-amber-400 mt-1"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                              <span>Voice Pitch</span>
                              <span>{speechPitch.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.6"
                              max="1.4"
                              step="0.05"
                              value={speechPitch}
                              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                              className="w-full accent-amber-400 mt-1"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                            <span className="text-[11px] text-slate-300">
                              Unload GGUF on App Background
                            </span>
                            <button
                              onClick={() => setUnloadOnBackground((v) => !v)}
                              className="text-[11px] font-mono text-emerald-400 cursor-pointer"
                            >
                              {unloadOnBackground ? 'ON (Saves RAM)' : 'OFF'}
                            </button>
                          </div>
                        </div>

                        {/* Runtime Permissions List */}
                        <div className="space-y-2">
                          {permissions.map((group) => (
                            <div
                              key={group.id}
                              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-slate-200">
                                  {group.title}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {group.androidPermissions.join(' · ')}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (group.granted) {
                                    handleGrantPermission(group.id, false);
                                  } else {
                                    setPendingPermissionDialog(group);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                                  group.granted
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                }`}
                              >
                                {group.granted ? 'Granted' : 'Request'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simulated Android Runtime Permission Dialog Overlay */}
                  {pendingPermissionDialog && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-5 z-20">
                      <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
                        <div className="space-y-1.5">
                          <div className="text-xs font-mono text-amber-400">
                            Android Runtime Permission Prompt
                          </div>
                          <h3 className="text-sm font-semibold text-white">
                            Allow MANGAL to access {pendingPermissionDialog.title.toLowerCase()}?
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {pendingPermissionDialog.rationale}
                          </p>
                          <div className="pt-1 text-[11px] font-mono text-slate-300">
                            {pendingPermissionDialog.androidPermissions.map((perm) => (
                              <div key={perm}>{perm}</div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            onClick={() =>
                              handleGrantPermission(pendingPermissionDialog.id, true)
                            }
                            className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs hover:bg-amber-300 transition-colors cursor-pointer"
                          >
                            While using the app (Grant)
                          </button>
                          <button
                            onClick={() =>
                              handleGrantPermission(pendingPermissionDialog.id, false)
                            }
                            className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            Don&apos;t allow (Deny)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compose NavigationBar (Bottom Bar) */}
                  <div className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/90 py-2.5 px-2">
                    {(
                      [
                        ['voice_chat', 'Assistant'],
                        ['model_manager', 'Models'],
                        ['settings', 'Settings']
                      ] as const
                    ).map(([route, label]) => (
                      <button
                        key={route}
                        onClick={() => setDeviceRoute(route)}
                        className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          deviceRoute === route
                            ? 'text-amber-300 bg-amber-500/10 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Jump to corresponding Kotlin file */}
              <button
                onClick={() =>
                  openFileInExplorer(correspondingKotlinFileForRoute[deviceRoute])
                }
                className="mt-3.5 text-xs font-mono text-slate-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Inspect {correspondingKotlinFileForRoute[deviceRoute]}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Column: Hands-Free "Mangal" Test Bench & Play Protect Shield (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Interactive "Mangal" Wake Word & Tool-Call Test Triggers */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-white font-display flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>
                        Hands-Free &ldquo;Mangal&rdquo; Wake Word & Offline Action Test Bench
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any voice command below (or tap <strong>Say &ldquo;Mangal&rdquo;</strong>{' '}
                      in the phone preview) to test automatic wake-up, earcon chime, JSON tool
                      execution, and native TTS response.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_TEST_COMMANDS.map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => {
                        setDeviceRoute('voice_chat');
                        executeOfflineAssistantTurn(cmd.utterance, cmd.wakeTriggered);
                      }}
                      className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-400/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                        <span>{cmd.label}</span>
                        <Play className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-1">
                        &ldquo;{cmd.utterance}&rdquo;
                      </div>
                    </button>
                  ))}
                </div>

                {/* Hardware Telemetry & Phase 5 OOM / Thermal Simulator Controls */}
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Device RAM (OOM Guard)</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[4096, 6144, 8192].map((ram) => (
                        <button
                          key={ram}
                          onClick={() => {
                            setDeviceRamMb(ram);
                            setDeviceRoute('model_manager');
                          }}
                          className={`flex-1 py-1 rounded text-[11px] font-mono cursor-pointer ${
                            deviceRamMb === ram
                              ? 'bg-amber-400 text-slate-950 font-semibold'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {ram / 1024}GB
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thermal Throttling</span>
                    </div>
                    <div className="flex gap-1.5">
                      {(['NOMINAL', 'MODERATE'] as const).map((th) => (
                        <button
                          key={th}
                          onClick={() => setThermalState(th)}
                          className={`flex-1 py-1 rounded text-[11px] font-mono cursor-pointer ${
                            thermalState === th
                              ? th === 'MODERATE'
                                ? 'bg-amber-400 text-slate-950 font-semibold'
                                : 'bg-emerald-400 text-slate-950 font-semibold'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {th}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
                      {wifiConnected ? (
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>Model Download Wi-Fi</span>
                    </div>
                    <button
                      onClick={() => {
                        setWifiConnected((v) => !v);
                        setDeviceRoute('model_manager');
                      }}
                      className={`w-full py-1 rounded text-[11px] font-mono cursor-pointer ${
                        wifiConnected
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {wifiConnected ? 'Wi-Fi Connected' : 'Wi-Fi Disconnected'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Play Protect Non-Interference Shield Summary */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white font-display flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Google Play Protect Non-Interference Engineering</span>
                  </h2>
                  <button
                    onClick={() => openFileInExplorer('app/src/main/AndroidManifest.xml')}
                    className="text-xs font-mono text-amber-300 hover:underline cursor-pointer"
                  >
                    Inspect AndroidManifest.xml
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="font-semibold text-emerald-400">
                      1. Zero Restricted SMS/Call Permissions
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Removed <code className="text-slate-200">SEND_SMS</code> &{' '}
                      <code className="text-slate-200">CALL_PHONE</code> from{' '}
                      <code className="text-slate-200">AndroidManifest.xml</code>. Uses system{' '}
                      <code className="text-slate-200">ACTION_SENDTO (smsto:)</code> and{' '}
                      <code className="text-slate-200">ACTION_DIAL (tel:)</code> so Play Protect
                      never triggers Toll-Fraud / Spyware warnings.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="font-semibold text-emerald-400">
                      2. Non-Executable Model Storage (DCL Safe)
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      <code className="text-slate-200">ResumableModelDownloader.kt</code> marks
                      downloaded GGUF/Whisper files with{' '}
                      <code className="text-slate-200">setExecutable(false)</code> and{' '}
                      <code className="text-slate-200">setWritable(false)</code> so Play Protect
                      never flags Dynamic Code Loading.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="font-semibold text-emerald-400">
                      3. 16 KB ELF Page Alignment & Uncompressed JNI
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Both <code className="text-slate-200">CMakeLists.txt</code> link with{' '}
                      <code className="text-slate-200">-Wl,-z,max-page-size=16384</code> and{' '}
                      <code className="text-slate-200">useLegacyPackaging = false</code> for Android
                      15 & Play Protect install-time verification.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="font-semibold text-emerald-400">
                      4. Explicit Microphone ForegroundServiceType
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      <code className="text-slate-200">MangalWakeWordForegroundService.kt</code>{' '}
                      uses <code className="text-slate-200">FOREGROUND_SERVICE_TYPE_MICROPHONE</code>{' '}
                      and APK Signature Schemes v1–v4 + <code className="text-slate-200">network_security_config.xml</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KOTLIN, GRADLE & C++ JNI SOURCE EXPLORER */}
        {activeTab === 'source' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Module Filter & File Tree (4 cols) */}
            <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-amber-400" />
                  <span>/android-mangal ({PHASE1_BUILD_DATA.files.length} files)</span>
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Filter Kotlin, C++ JNI, Icon XML, Gradle..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Module Segmented Filter */}
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(modulesList).map(([mod, count]) => (
                  <button
                    key={mod}
                    onClick={() => setSelectedModule(mod)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      selectedModule === mod
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {mod === 'all' ? 'all' : mod === 'root' ? 'root' : `:${mod}`} ({count})
                  </button>
                ))}
              </div>

              {/* File List */}
              <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-800/60 border-t border-slate-800 pt-2">
                {filteredFiles.map((file) => {
                  const isSelected = activeFile?.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFilePath(file.path)}
                      className={`w-full text-left py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-mono break-all leading-snug">
                        {file.path}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {file.lines} lines · {file.bytes} B · sha256:{file.sha256}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Code Viewer (8 cols) */}
            <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              {activeFile && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
                    <div>
                      <div className="text-xs font-mono font-semibold text-white">
                        android-mangal/{activeFile.path}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                        Module: {activeFile.module} · {activeFile.lines} lines · {activeFile.bytes}{' '}
                        bytes · SHA-256: {activeFile.sha256}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyCode(activeFile.content, activeFile.path)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedPath === activeFile.path ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy File</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[660px] overflow-y-auto bg-[#090D14]">
                    <code>{activeFile.content}</code>
                  </pre>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TECH STACK & LICENSE AUDIT */}
        {activeTab === 'stack' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h2 className="text-lg font-semibold text-white font-display mb-1">
                Tech Stack, Native JNI Architecture & Open-Source License Audit
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Every dependency across Phases 1–6 is verified for 100% offline runtime execution,
                zero API keys, and explicit open-source license compliance.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                      <th className="py-3 pr-4">Architecture Layer</th>
                      <th className="py-3 px-4">Selected Implementation</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">License</th>
                      <th className="py-3 pl-4">Engineering & Compliance Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {TECH_STACK_DECISIONS.map((row) => (
                      <tr key={row.layer} className="align-top hover:bg-slate-800/20">
                        <td className="py-4 pr-4 font-semibold text-white whitespace-nowrap">
                          {row.layer}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-200">
                          {row.selectedChoice}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">
                          <span className="text-emerald-400">{row.status}</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-300">{row.license}</td>
                        <td className="py-4 pl-4 text-slate-300 leading-relaxed max-w-md">
                          {row.engineeringNotes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PLAY PROTECT & RELEASE VERIFICATION */}
        {activeTab === 'release' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white font-display">
                    Phases 1–6 & Play Protect Automated Verification Output
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real output from <code className="text-slate-300">scripts/verify_and_bundle_phase1.py</code>{' '}
                    verifying all {PHASE1_BUILD_DATA.files.length} files, adaptive app icon XMLs,
                    hands-free wake word service, and Play Protect compliance.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      openFileInExplorer('app/src/main/res/drawable/ic_launcher_foreground.xml')
                    }
                    className="px-3 py-2 text-xs font-medium text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/10 cursor-pointer"
                  >
                    Inspect App Icon XML
                  </button>
                  <button
                    onClick={() => openFileInExplorer('DEPLOYMENT_GUIDE.md')}
                    className="px-3 py-2 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg hover:border-slate-600 cursor-pointer"
                  >
                    View DEPLOYMENT_GUIDE.md
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {PHASE1_BUILD_DATA.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3"
                  >
                    {check.status === 'PASS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{check.title}</span>
                        <span
                          className={`text-[10px] font-mono font-semibold shrink-0 ${
                            check.status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {check.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Play Protect Technical Checklist & Build Commands */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Why Google Play Protect Will Never Flag or Block MANGAL</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2.5 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong>Zero Restricted Fraud Permissions:</strong> Non-default apps requesting{' '}
                    <code>SEND_SMS</code> or <code>CALL_PHONE</code> alongside <code>INTERNET</code>{' '}
                    are automatically blocked by Play Protect&apos;s PHA (Potentially Harmful App)
                    scanner. MANGAL uses <code>Intent.ACTION_SENDTO (smsto:)</code> and{' '}
                    <code>Intent.ACTION_DIAL (tel:)</code> instead.
                  </li>
                  <li>
                    <strong>Strict Non-Executable Model Weights:</strong> Downloaded GGUF/Whisper
                    models in <code>Context.filesDir/models/</code> are explicitly locked with{' '}
                    <code>setExecutable(false)</code> and <code>setWritable(false)</code> so Play
                    Protect never suspects dynamic code loading (DCL).
                  </li>
                  <li>
                    <strong>APK Signature Schemes v1, v2, v3 & v4 + 16 KB Alignment:</strong>{' '}
                    Configured in <code>app/build.gradle.kts</code> and <code>CMakeLists.txt</code>{' '}
                    with <code>useLegacyPackaging = false</code> so native <code>.so</code> files
                    are cryptographically verified by Android PackageManager at install time.
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <Terminal className="w-4 h-4" />
                  <span>Build Signed APK/AAB & Install cleanly with Play Protect ON</span>
                </div>
                <pre className="p-4 rounded-xl bg-[#090D14] border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
                  <code>{`# 1. Unpack & initialize native submodules
tar -xzf mangal-complete-android-v1.tar.gz
cd mangal-android-v1
git init
git submodule add https://github.com/ggml-org/llama.cpp.git core-llm/src/main/cpp/llama.cpp
git submodule add https://github.com/ggml-org/whisper.cpp.git core-stt/src/main/cpp/whisper.cpp

# 2. Generate 4096-bit RSA release keystore (v1/v2/v3/v4 signing enabled)
keytool -genkeypair -v -keystore mangal-upload-key.jks \\
  -keyalg RSA -keysize 4096 -validity 10000 -alias mangal_upload

# 3. Assemble Signed Release APK & AAB
./gradlew assembleRelease bundleRelease`}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
