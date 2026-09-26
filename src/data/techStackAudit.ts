export interface StackDecisionItem {
  layer: string;
  selectedChoice: string;
  status: 'Verified & Wired' | 'License Audited' | 'Play Policy Flag';
  license: string;
  offlineGuarantee: string;
  engineeringNotes: string;
}

export const TECH_STACK_DECISIONS: StackDecisionItem[] = [
  {
    layer: 'LLM Inference (:core-llm)',
    selectedChoice: 'llama.cpp via Android NDK CMake JNI (GGUF Q4_K_M)',
    status: 'Verified & Wired',
    license: 'MIT License (ggml-org/llama.cpp)',
    offlineGuarantee: '100% offline mmap inference; zero network sockets compiled in JNI bridge.',
    engineeringNotes:
      'Compiled from upstream source via core-llm/src/main/cpp/CMakeLists.txt (-march=armv8.2-a+dotprod+fp16) with @Keep on LlamaJniBridge. Pre-flight RAM check via DeviceHealthAndRamGuard prevents native OOM kills.'
  },
  {
    layer: 'Model Weights (:data Catalog)',
    selectedChoice: 'Qwen 2.5 1.5B/3B Instruct (Q4_K_M) · Gemma 3 4B (Q4_K_M)',
    status: 'License Audited',
    license: 'Qwen 2.5: Apache-2.0 · Gemma 3: Google Gemma Terms of Use',
    offlineGuarantee: 'Downloaded once over Wi-Fi to Context.filesDir/models/ with SHA-256 verification.',
    engineeringNotes:
      'Default active model is Qwen 2.5 1.5B Instruct Q4_K_M (1.12 GB, Apache-2.0, min 3 GB RAM). ResumableModelDownloader uses HTTP Range headers and streaming SHA-256 verification.'
  },
  {
    layer: 'On-Device STT (:core-stt)',
    selectedChoice: 'whisper.cpp (ggml-tiny.en / ggml-base.en Q8_0 / INT8)',
    status: 'Verified & Wired',
    license: 'MIT License (ggml-org/whisper.cpp)',
    offlineGuarantee: '16kHz mono PCM AudioRecord ring buffer + RMS VAD fed to WhisperJniBridge.',
    engineeringNotes:
      'AudioRecordPcmCapture captures 80ms (1280-sample @ 16kHz) float32 frames with RMS energy Voice Activity Detection and streams into WhisperJniBridge.transcribePcm.'
  },
  {
    layer: 'On-Device TTS (:core-tts)',
    selectedChoice: 'Android Native TextToSpeech (android.speech.tts.TextToSpeech)',
    status: 'Verified & Wired',
    license: 'Android SDK Platform API (Apache-2.0)',
    offlineGuarantee: 'Enforces Engine.KEY_FEATURE_NETWORK_SYNTHESIS = "false" and filters !voice.isNetworkConnectionRequired.',
    engineeringNotes:
      'AndroidNativeTtsSpeaker wires UtteranceProgressListener, configurable speechRate (0.5x–2.0x), pitch (0.5x–1.5x), and offline voice selection with zero extra APK weight.'
  },
  {
    layer: 'Wake Word Engine (:core-stt)',
    selectedChoice: 'openWakeWord ("Hey Mangal", 80ms frame pipeline)',
    status: 'Verified & Wired',
    license: 'Apache-2.0 (dscripka/openWakeWord)',
    offlineGuarantee: '100% local spectral/embedding classifier; zero API keys or activation limits.',
    engineeringNotes:
      'Selected over Picovoice Porcupine because Porcupine requires a mandatory console AccessKey. OpenWakeWordDetector runs 100% key-free on 80ms 16kHz PCM frames.'
  },
  {
    layer: 'Tool / Action Layer (:core-tools)',
    selectedChoice: 'Typed JSON Schema ToolRegistry + AndroidToolExecutor',
    status: 'Play Policy Flag',
    license: 'Apache-2.0 (kotlinx-serialization-json)',
    offlineGuarantee: 'Deterministic local JSON envelope validator and Android Intent / ContentResolver dispatcher.',
    engineeringNotes:
      'Executes 6 tools end-to-end: set_alarm_or_timer, create_calendar_event, send_sms_or_place_call, open_installed_app, adjust_device_setting, and offline_app_or_web_search. Flags SEND_SMS & CALL_PHONE for Play Console Restricted Permissions review.'
  },
  {
    layer: 'Encrypted Local Storage (:data)',
    selectedChoice: 'Room 2.6.1 + SQLCipher 4.6.1 (net.zetetic:sqlcipher-android)',
    status: 'Verified & Wired',
    license: 'Room: Apache-2.0 · SQLCipher: BSD-3-Clause',
    offlineGuarantee: 'AES-256 encrypted SQLite DB; 256-bit key wrapped in Android Hardware Keystore.',
    engineeringNotes:
      'Configured with SupportOpenHelperFactory and MasterKey.KeyScheme.AES256_GCM in DatabaseModule.kt. Includes 1-tap user-clearable conversation memory (ChatRepository.clearConversationMemory).'
  }
];

export interface PhaseInfo {
  phase: number;
  title: string;
  status: 'Completed & Verified';
  summary: string;
  bugsCaughtAndFixed: string;
  deliverables: string[];
}

export const PHASE_ROADMAP: PhaseInfo[] = [
  {
    phase: 1,
    title: 'Project Scaffold & Multi-Module Architecture',
    status: 'Completed & Verified',
    summary: '6-module Gradle setup (:app, :core-llm, :core-stt, :core-tts, :core-tools, :data), Hilt DI, Room + SQLCipher AES-256 DB, Compose Navigation, and PermissionGatekeeper.',
    bugsCaughtAndFixed: 'Fixed Gradle Kotlin DSL top-level import ordering in app/build.gradle.kts and added Android 11+ (API 30+) <queries> visibility for launcher, alarm, timer, and web search intents.',
    deliverables: [
      'settings.gradle.kts + gradle/libs.versions.toml version catalog',
      'Room + SQLCipher SupportOpenHelperFactory with Android Keystore passphrase (:data)',
      'Hilt @HiltAndroidApp + @AndroidEntryPoint + module bindings across all 6 modules'
    ]
  },
  {
    phase: 2,
    title: 'Model Management & Resumable SHA-256 Downloader',
    status: 'Completed & Verified',
    summary: 'Curated GGUF/Whisper/openWakeWord catalog, Wi-Fi-only network capability guard, HTTP Range resumable downloads, and streaming SHA-256 verification.',
    bugsCaughtAndFixed: 'Ensured partial .part files reset cleanly if server responds with HTTP 200 instead of HTTP 206 Partial Content, and deletes corrupted .part files on SHA-256 mismatch.',
    deliverables: [
      'RecommendedModelCatalog.kt (Qwen 2.5 1.5B/3B, Gemma 3 4B, Whisper Tiny/Base INT8, openWakeWord)',
      'ResumableModelDownloader.kt with RandomAccessFile seek & MessageDigest SHA-256 check',
      'ModelManagerScreen.kt with Wi-Fi guard toggle, RAM badges, and activate/delete controls'
    ]
  },
  {
    phase: 3,
    title: 'On-Device STT (whisper.cpp) + Native TTS Pipeline',
    status: 'Completed & Verified',
    summary: '16kHz mono PCM AudioRecord ring buffer with RMS VAD chunking into whisper.cpp JNI, paired with Android Native TextToSpeech offline voice filtering.',
    bugsCaughtAndFixed: 'Added explicit Engine.KEY_FEATURE_NETWORK_SYNTHESIS="false" bundle parameter and !voice.isNetworkConnectionRequired filter so Android TTS never attempts a network call.',
    deliverables: [
      'AudioRecordPcmCapture.kt (16kHz mono PCM float32 ring buffer + RMS VAD)',
      'WhisperTranscriber.kt + whisper_jni.cpp + CMakeLists.txt (ARMv8.2 dotprod/fp16)',
      'LocalTtsSpeaker.kt with UtteranceProgressListener, speechRate, and pitch controls'
    ]
  },
  {
    phase: 4,
    title: 'LLM Inference (llama.cpp) + Typed Tool-Calling Execution',
    status: 'Completed & Verified',
    summary: 'llama.cpp JNI session with structured JSON schema validation (ToolRegistry) and end-to-end AndroidToolExecutor across 6 local device actions.',
    bugsCaughtAndFixed: 'Added markdown code-fence stripping in ToolRegistry.parseAndValidateEnvelope so models wrapping JSON in ```json blocks never fail deserialization, plus runtime permission fallbacks.',
    deliverables: [
      'LlmEngine.kt + llama_jni.cpp + CMakeLists.txt',
      'ToolRegistry.kt deterministic system prompt builder & JSON schema validator',
      'AndroidToolExecutor.kt (AlarmClock, CalendarContract, SmsManager/ACTION_CALL, PackageManager, CameraManager Torch/AudioManager/Settings.Panel)'
    ]
  },
  {
    phase: 5,
    title: 'Wake Word (openWakeWord), Memory & Thermal/OOM Guard',
    status: 'Completed & Verified',
    summary: 'Offline openWakeWord 80ms frame detector, user-clearable SQLCipher conversation history, ActivityManager pre-flight RAM guard, and lifecycle model unloading.',
    bugsCaughtAndFixed: 'Wired ModelMemoryLifecycleObserver into MainActivity.lifecycle so backgrounding the app automatically unloads native GGUF weights, and capped model RAM at 78% of physical device RAM.',
    deliverables: [
      'OpenWakeWordDetector.kt (key-free Apache-2.0 wake word detection)',
      'DeviceHealthAndRamGuard.kt (ActivityManager OOM refusal + PowerManager thermal throttling)',
      'ModelMemoryLifecycleObserver.kt + ChatRepository.clearConversationMemory()'
    ]
  },
  {
    phase: 6,
    title: 'Release Hardening, R8/ProGuard JNI Rules & Play Console Compliance',
    status: 'Completed & Verified',
    summary: 'R8 JNI keep rules for llama.cpp/whisper.cpp/SQLCipher, release keystore signingConfig, PRIVACY_POLICY.md, and step-by-step bundletool & Play Console guide.',
    bugsCaughtAndFixed: 'Added consumerProguardFiles("consumer-rules.pro") to both :core-llm and :core-stt library modules so R8 preserves native JNI methods in multi-module release AAB builds.',
    deliverables: [
      'app/proguard-rules.pro + :core-llm & :core-stt consumer-rules.pro (@Keep + native <methods>)',
      'Release signingConfigs in app/build.gradle.kts + jniLibs packaging config',
      'PRIVACY_POLICY.md & DEPLOYMENT_GUIDE.md (keytool, bundletool, Play Console SEND_SMS/CALL_PHONE compliance)'
    ]
  }
];
