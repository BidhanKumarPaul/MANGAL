# MANGAL — Phase 6 Release Signing, `bundletool` Verification & Play Console Deployment Guide

## 1. Generate Upload Keystore (`keytool`)

Run the following command on your build workstation (requires JDK 17+):

```bash
keytool -genkeypair -v \
  -keystore mangal-upload-key.jks \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -alias mangal_upload \
  -dname "CN=MANGAL AI, OU=Mobile Engineering, O=Mangal, L=San Francisco, ST=CA, C=US"
```

Create `android-mangal/keystore.properties` (never commit this file to git):

```properties
storeFile=/absolute/path/to/mangal-upload-key.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=mangal_upload
keyPassword=YOUR_KEY_PASSWORD
```

---

## 2. Clone Native Submodules (`llama.cpp` & `whisper.cpp`)

To compile the JNI libraries (`libmangal_llama_jni.so` and `libmangal_whisper_jni.so`) from verified MIT source:

```bash
git submodule add https://github.com/ggml-org/llama.cpp.git core-llm/src/main/cpp/llama.cpp
git submodule add https://github.com/ggml-org/whisper.cpp.git core-stt/src/main/cpp/whisper.cpp
git submodule update --init --recursive
```

---

## 3. Build Debug APK & Signed Release AAB

```bash
# 1. Assemble Debug APK for local device testing
./gradlew assembleDebug

# 2. Build Signed Release Android App Bundle (.aab) with R8 shrinking + JNI keep rules
./gradlew bundleRelease
```

Output artifacts:
- Debug APK: `app/build/outputs/apk/debug/app-debug.apk`
- Signed Release AAB: `app/build/outputs/bundle/release/app-release.aab`

---

## 4. Test the Signed AAB Locally Using `bundletool`

Before uploading to Google Play Console, verify that R8 did not strip `LlamaJniBridge`, `WhisperJniBridge`, or `sqlcipher` symbols on a connected physical arm64 device:

```bash
# Generate device-specific APK set (.apks) from the release AAB
bundletool build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=mangal-release.apks \
  --ks=/absolute/path/to/mangal-upload-key.jks \
  --ks-pass=pass:YOUR_KEYSTORE_PASSWORD \
  --ks-key-alias=mangal_upload \
  --key-pass=pass:YOUR_KEY_PASSWORD \
  --connected-device

# Install the split APKs onto your connected Android device
bundletool install-apks --apks=mangal-release.apks
```

---

## 5. Google Play Console Restricted Permissions & Closed Testing Checklist

> **CRITICAL FLAG FOR `SEND_SMS` AND `CALL_PHONE` PERMISSIONS:**  
> Google Play enforces strict **SMS and Call Log Permission Policy**. Apps requesting `android.permission.SEND_SMS` or `android.permission.CALL_PHONE` must complete the **Permissions Declaration Form** in Play Console and demonstrate a core hands-free/voice-assistant exception (or be registered as the default Phone/SMS handler).
>
> - **Option A (Full Direct Execution for Sideload / Enterprise / Approved Voice Assistant):** Keep `SEND_SMS` and `CALL_PHONE` in `AndroidManifest.xml` and submit a screen-recorded video demonstration in Play Console > *App Content* > *Sensitive App Permissions*.
> - **Option B (Zero-Friction Play Store Approval):** Replace `SmsManager.sendTextMessage` and `Intent.ACTION_CALL` with `Intent.ACTION_SENDTO` (`smsto:`) and `Intent.ACTION_DIAL` (`tel:`), which launch the system dialer/SMS app pre-filled and require **zero** restricted permissions.

### Play Console Closed Testing Track Steps
1. Open **Google Play Console** → **Create app** (`MANGAL`, Default language, App, Free).
2. Navigate to **App content**:
   - **Privacy Policy**: Host `PRIVACY_POLICY.md` on a public HTTPS URL and paste the link.
   - **Data Safety**: Declare **No data collected** and **No data shared with third parties** (since 100% of STT, LLM, and Room SQLCipher storage stay on-device).
   - **App Access**: Note that on first launch the user downloads the open-weights GGUF model via Wi-Fi (no login credentials required).
3. Navigate to **Testing → Closed testing** → Create a track (`alpha`), upload `app-release.aab`, add tester emails, and submit for review.
