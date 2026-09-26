# Preserve llama.cpp JNI bridge symbols during R8/ProGuard shrinking
-keep class ai.mangal.core.llm.LlamaJniBridge { *; }
-keepclasseswithmembernames class ai.mangal.core.llm.** {
    native <methods>;
}
