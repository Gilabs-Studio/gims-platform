# POS Release Build Guide

**App:** Salesview POS Mobile (gims_pos)
**Stack:** Flutter 3.27+ / Dart 3.10+
**Last updated:** 2026-05-17

## Overview

This guide covers building release artifacts for Android (APK/AAB), iOS, and Windows with a custom API endpoint baked into the binary. The endpoint is injected at compile time via `--dart-define=GIMS_API_URL=<url>` and becomes the default value for the `ApiClient`.

The endpoint can still be overridden at runtime by the user in the PosShell settings UI, which persists to `SharedPreferences` key `gims_pos_base_url`.

---

## Prerequisites

| Platform | Requirements |
|----------|-------------|
| All | Flutter SDK 3.27+, Dart 3.10+, `cd apps/pos && flutter pub get` |
| Android | JDK 17, Android SDK (compileSdk + build-tools), valid keystore for signing |
| iOS | macOS, Xcode 16+, Apple Developer account, distribution certificate + provisioning profile |
| Windows | Windows 10+, Visual Studio 2022 with "Desktop development with C++" workload |

---

## Custom Endpoint Mechanism

The `ApiClient` (`lib/src/core/network/api_client.dart:15`) reads the endpoint from a compile-time define:

```dart
static const defaultBaseUrl = String.fromEnvironment(
  'GIMS_API_URL',
  defaultValue: 'https://api.example.com',
);
```

**Resolution order (first wins):**

1. Runtime value saved to `SharedPreferences` via PosShell settings UI
2. Compile-time `--dart-define=GIMS_API_URL=<url>`
3. Hardcoded default `http://localhost:<port>/`

All API calls route through `{baseUrl}/api/v1/...`.

---

## 1. Android

### 1.1 Keystore Setup (One-Time)

Generate a keystore for release signing:

```bash
keytool -genkey -v -keystore %USERPROFILE%\gims-pos-release.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 -alias gims-pos-release
```

Create `android/key.properties` (do **not** commit to git):

```properties
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=gims-pos-release
storeFile=C:\\Users\\<you>\\gims-pos-release.jks
```

### 1.2 Configure Release Signing

Edit `android/app/build.gradle.kts` and add before `buildTypes`:

```kotlin
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = keystoreProperties["storeFile"] != null ?
                file(keystoreProperties["storeFile"] as String) : null
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

### 1.3 Build APK (for direct distribution)

```bash
cd apps/pos
flutter clean
flutter pub get
flutter build apk --release --dart-define=GIMS_API_URL=https://your-server.com
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

To split by ABI (smaller per-device APKs):

```bash
flutter build apk --release --split-per-abi --dart-define=GIMS_API_URL=https://your-server.com
```

**Outputs:**
- `build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk`
- `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`
- `build/app/outputs/flutter-apk/app-x86_64-release.apk`

### 1.4 Build AAB (for Google Play Store)

```bash
cd apps/pos
flutter clean
flutter pub get
flutter build appbundle --release --dart-define=GIMS_API_URL=https://your-server.com
```

**Output:** `build/app/outputs/bundle/release/app-release.aab`

### 1.5 Verify Android Build

```bash
# Check the APK's AndroidManifest for the app ID
aapt dump badging build\app\outputs\flutter-apk\app-release.apk

# Verify the dart-define is embedded (search for the URL string)
strings build\app\outputs\flutter-apk\app-release.apk | findstr your-server
```

---

## 2. iOS

> **Requires macOS.** iOS builds cannot be produced on Windows or Linux.

### 2.1 One-Time Setup

1. Open `ios/Runner.xcworkspace` in Xcode (NOT `.xcodeproj`)
2. Signing & Capabilities tab → select your Team
3. Ensure Bundle Identifier is unique (e.g., `com.gilabs.gims.gims_pos`)
4. Set deployment target to iOS 15.0+

### 2.2 Build IPA (unsigned, for distribution via Apple tools)

```bash
cd apps/pos
flutter clean
flutter pub get
flutter build ipa --release --dart-define=GIMS_API_URL=https://your-server.com
```

**Output:** `build/ios/ipa/gims_pos.ipa`

### 2.3 Build for App Store / TestFlight

```bash
flutter build ipa --release --dart-define=GIMS_API_URL=https://your-server.com --export-method app-store
```

### 2.4 Build for Enterprise / Ad-Hoc

```bash
flutter build ipa --release --dart-define=GIMS_API_URL=https://your-server.com --export-method ad-hoc
```

### 2.5 Archiving via Xcode (Alternative)

```bash
flutter build ios --release --no-codesign --dart-define=GIMS_API_URL=https://your-server.com
```

Then open `ios/Runner.xcworkspace` in Xcode:
1. Product → Archive
2. Window → Organizer → Distribute App

### 2.6 iOS-Specific Notes

- `NSAllowsArbitraryLoads` is set to `true` in `Info.plist` for development. For production, restrict this to specific domains and enable HTTPS.
- The display name is **Salesview Pos** (`CFBundleDisplayName`).
- iPad multitasking is supported (all 4 orientations in `Info.plist`).

---

## 3. Windows

### 3.1 Prerequisites

- Visual Studio 2022 with "Desktop development with C++" workload
- Windows 10 SDK (10.0.19041.0+) installed via Visual Studio Installer

### 3.2 Build Release Output

```bash
cd apps/pos
flutter clean
flutter pub get
flutter build windows --release --dart-define=GIMS_API_URL=https://your-server.com
```

**Output:** `build/windows/x64/runner/Release/`

### 3.3 Build Installer (Inno Setup, recommended)

Prerequisites:

1. Install [Inno Setup 6](https://jrsoftware.org/isinfo.php)
2. The helper will auto-detect `ISCC.exe` from the registry or common install paths

Then run the bundled packaging script:

```powershell
cd apps\pos
.\installer\build_windows_installer.ps1 -ApiUrl https://your-server.com
```

If Inno Setup is installed in a custom location, pass it explicitly:

```powershell
.\installer\build_windows_installer.ps1 -ApiUrl https://your-server.com -IsccPath "D:\Program Files\Inno Setup 6\ISCC.exe"
```

This will:

1. build the Windows release
2. package `build/windows/x64/runner/Release/`
3. emit `build/windows/installer/output/salesview_pos_setup.exe`

### 3.4 Optional ZIP Distribution

```powershell
cd apps\pos
Compress-Archive -Path build\windows\x64\runner\Release\* `
  -DestinationPath gims_pos_windows.zip
```

Users extract the ZIP and run `salesview_pos.exe`.

### 3.5 Windows-Specific Notes

- The binary name is defined in `windows/CMakeLists.txt` (`BINARY_NAME` variable).
- Version info is compiled into the binary via `FLUTTER_VERSION` macros in `windows/runner/CMakeLists.txt:24-28`.
- The installer branding lives in `installer/salesview_pos.iss`.
- For enterprise deployment, consider code-signing the installer and `.exe` with a certificate.

---

## Version Bumping

Before each release, update the version in `pubspec.yaml`:

```yaml
version: 1.0.0+1   # 1.0.0 = marketing version, 1 = build number
```

| Platform | Marketing Version | Build Number |
|----------|-------------------|-------------|
| Android | `versionName` | `versionCode` |
| iOS | `CFBundleShortVersionString` | `CFBundleVersion` |
| Windows | Product version | Build suffix |

**Override at build time:**

```bash
flutter build apk --release \
  --build-name=1.2.0 --build-number=3 \
  --dart-define=GIMS_API_URL=https://your-server.com
```

---

## Quick Reference Matrix

| Target | Command | Output |
|--------|---------|--------|
| Android APK (fat) | `flutter build apk --release --dart-define=GIMS_API_URL=<url>` | `build/app/outputs/flutter-apk/app-release.apk` |
| Android APK (split) | `flutter build apk --release --split-per-abi --dart-define=GIMS_API_URL=<url>` | 3 per-ABI APKs |
| Android AAB | `flutter build appbundle --release --dart-define=GIMS_API_URL=<url>` | `build/app/outputs/bundle/release/app-release.aab` |
| iOS IPA | `flutter build ipa --release --dart-define=GIMS_API_URL=<url>` | `build/ios/ipa/gims_pos.ipa` |
| Windows installer | `.\installer\build_windows_installer.ps1 -ApiUrl <url>` | `build/windows/installer/output/salesview_pos_setup.exe` |

---

## Common Issues

### `flutter build` fails with "Gradle build failed"

```bash
# Clear Gradle cache
cd android && .\gradlew clean
cd .. && flutter clean && flutter pub get
```

### iOS build fails with signing error

Open `ios/Runner.xcworkspace` in Xcode, select the Runner target, and re-select your Team under Signing & Capabilities. Ensure the provisioning profile includes the device UDID for ad-hoc builds.

### Windows build fails with "Visual Studio not found"

Ensure Visual Studio 2022 is installed with the "Desktop development with C++" workload. The Windows 10 SDK must also be selected during installation.

### Custom endpoint not taking effect

Verify no endpoint was previously saved in the app's SharedPreferences (the runtime value takes priority). Clear app data or uninstall/reinstall after building with a new `--dart-define`.
