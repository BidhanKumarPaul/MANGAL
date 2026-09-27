# ==============================================================================
# MANGAL Phase 6 Production ProGuard / R8 Rules
# CRITICAL: Do NOT strip JNI entrypoints for llama.cpp, whisper.cpp, or SQLCipher
# ==============================================================================

# 1. Preserve all classes annotated with @androidx.annotation.Keep
-keep @androidx.annotation.Keep class * { *; }
-keepclasseswithmembers class * {
    @androidx.annotation.Keep <methods>;
}
-keepclasseswithmembers class * {
    @androidx.annotation.Keep <fields>;
}

# 2. Preserve all native JNI methods across :core-llm, :core-stt, and :data
-keepclasseswithmembernames class * {
    native <methods>;
}
-keep class ai.mangal.core.llm.LlamaJniBridge { *; }
-keep class ai.mangal.core.stt.WhisperJniBridge { *; }

# 3. Preserve SQLCipher native database classes & callbacks
-keep class net.zetetic.database.sqlcipher.** { *; }
-keep interface net.zetetic.database.sqlcipher.** { *; }

# 4. Google Tink & AndroidX Security Crypto (fixes R8 missing errorprone annotations)
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn kotlinx.coroutines.debug.**
-dontwarn sun.misc.Unsafe

# 5. Preserve Kotlinx Serialization @Serializable tool schemas (:core-tools)
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature
-keepclassmembers class ai.mangal.core.tools.** {
    *;
}
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> {
    static <1>$Companion Companion;
}
-if @kotlinx.serialization.Serializable class ** {
    static **$* *;
}
-keepclassmembers class <2>$<3> {
    kotlinx.serialization.KSerializer serializer(...);
}
