#!/bin/bash
# Android projesini oluşturur ve Reo E-Portal ayarlarını uygular
set -e
cd "$(dirname "$0")/.."
cp node_modules/@capacitor/core/dist/capacitor.js www/capacitor.js || { echo "HATA: @capacitor/core/dist/capacitor.js bulunamadı"; exit 1; }
[ -f firebase/google-services.json ] || { echo "HATA: firebase/google-services.json yok (Firebase konsolundan indirin)."; exit 1; }
[ -d android ] || npx cap add android
npx capacitor-assets generate --android --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#0b3b60'
npx cap sync android
cp firebase/google-services.json android/app/google-services.json
cp native/android/MainActivity.java android/app/src/main/java/com/reotesis/sakin/MainActivity.java
M=android/app/src/main/AndroidManifest.xml
grep -q POST_NOTIFICATIONS $M || sed -i.bak 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />#' $M
grep -q 'default_notification_channel_id' $M || sed -i.bak 's#</application>#    <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="reo" />\n    </application>#' $M
grep -q 'android:screenOrientation' $M || sed -i.bak 's#android:name=".MainActivity"#android:name=".MainActivity"\n            android:screenOrientation="portrait"#' $M
rm -f $M.bak
G=android/app/build.gradle
grep -q REO_IMZA $G || cat >> $G <<'GEOF'

// REO_IMZA: Codemagic anahtar deposu ve sürüm numarası
android {
    signingConfigs {
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            }
        }
    }
    buildTypes { release { if (System.getenv("CM_KEYSTORE_PATH")) { signingConfig signingConfigs.release } } }
    defaultConfig {
        if (System.getenv("BUILD_NUMBER")) { versionCode Integer.parseInt(System.getenv("BUILD_NUMBER")) + 1 }
        versionName "1.0.0"
    }
}
GEOF
echo "Android hazır: android/"
