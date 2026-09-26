# Preserve whisper.cpp JNI bridge entrypoints during R8/ProGuard shrinking
-keep class ai.mangal.core.stt.WhisperJniBridge { *; }
-keepclasseswithmembernames class ai.mangal.core.stt.** {
    native <methods>;
}
