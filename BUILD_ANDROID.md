# Building SecureVault Android APK

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17+** - Usually included with Android Studio

## Quick Build Steps

### 1. Build the Web App (Already done)
```bash
npm run build
```

### 2. Sync to Android (Already done)
```bash
npx cap sync android
```

### 3. Open in Android Studio
```bash
npx cap open android
```

Or manually open the `android/` folder in Android Studio.

### 4. Build the APK

In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build > Build Bundle(s)/APK(s) > Build APK(s)**
3. Click "locate" when build completes to find your APK

**APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`

## For Signed Release APK

1. **Build > Generate Signed Bundle/APK**
2. Select **APK**
3. Create a new keystore or use existing
4. Select **release** build variant
5. Click **Finish**

**Release APK Location:** `android/app/release/app-release.apk`

## Command Line Build (Alternative)

If you have Android SDK installed:

```bash
cd android
./gradlew assembleDebug
```

## App Details

- **App ID:** com.securevault.wallet
- **App Name:** SecureVault
- **Min SDK:** 22 (Android 5.1+)

## Troubleshooting

### Gradle sync failed
- Ensure Android SDK is installed
- Update Gradle plugin if prompted

### Build failed
- Run `npx cap sync android` again
- Clean project: **Build > Clean Project**

## Updating the App

After making web changes:
```bash
npm run build
npx cap sync android
```
Then rebuild the APK in Android Studio.
