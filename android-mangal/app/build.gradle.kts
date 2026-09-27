import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        load(FileInputStream(keystorePropertiesFile))
    }
}

android {
    namespace = "ai.mangal.assistant"
    compileSdk = 35

    defaultConfig {
        applicationId = "ai.mangal.assistant"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "1.1.0-playprotect-safe"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }
    }

    signingConfigs {
        create("release") {
            val ksFile = keystoreProperties.getProperty("storeFile")
                ?: System.getenv("MANGAL_KEYSTORE_FILE")
            if (!ksFile.isNullOrBlank()) {
                storeFile = file(ksFile)
                storePassword = keystoreProperties.getProperty("storePassword")
                    ?: System.getenv("MANGAL_KEYSTORE_PASSWORD")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                    ?: System.getenv("MANGAL_KEY_ALIAS")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                    ?: System.getenv("MANGAL_KEY_PASSWORD")
            }
            // Enable APK Signature Schemes v1, v2, v3, and v4 so Google Play Protect
            // cryptographic integrity verification passes without warnings.
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
            enableV4Signing = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    packaging {
        jniLibs {
            // Play Protect & Android 15 (16KB page size) compliance:
            // Keep native .so libraries page-aligned and uncompressed inside the signed APK
            // so PackageManager verifies their signatures at install time.
            useLegacyPackaging = false
        }
    }
}

dependencies {
    implementation(project(":core-llm"))
    implementation(project(":core-stt"))
    implementation(project(":core-tts"))
    implementation(project(":core-tools"))
    implementation(project(":data"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)

    // Hilt DI
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit)
}
