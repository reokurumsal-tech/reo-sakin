#!/bin/bash
# Android projesini oluşturur ve REO Asistan ayarlarını uygular (Codemagic'te çalışır)
# Yalnızca Google Play "Dahili test" kanalı için: mağazada görünmez, yalnızca test listesine eklenenler yükler.
set -e
cd "$(dirname "$0")/.."
cp node_modules/@capacitor/core/dist/capacitor.js www/capacitor.js || { echo "HATA: @capacitor/core/dist/capacitor.js bulunamadı"; exit 1; }
[ -d android ] || npx cap add android
npx capacitor-assets generate --android --iconBackgroundColor '#0b3b60' --splashBackgroundColor '#0b3b60' --splashBackgroundColorDark '#0b3b60'
npx cap sync android
cp native/android/MainActivity.java android/app/src/main/java/com/reotesis/asistan/MainActivity.java
V=android/variables.gradle
[ -f $V ] && sed -i.bak -E 's/minSdkVersion = [0-9]+/minSdkVersion = 24/; s/compileSdkVersion = [0-9]+/compileSdkVersion = 36/; s/targetSdkVersion = [0-9]+/targetSdkVersion = 36/' $V && rm -f $V.bak
P=android/gradle.properties
grep -q suppressUnsupportedCompileSdk $P || echo 'android.suppressUnsupportedCompileSdk=36' >> $P
G=android/app/build.gradle
grep -q REO_IMZA $G || cat >> $G <<GEOF

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
        minSdkVersion 24
        targetSdkVersion 36
        if (System.getenv("BUILD_NUMBER")) { versionCode Integer.parseInt(System.getenv("BUILD_NUMBER")) + 1 }
        versionName "${SURUM:-1.0.0}"
    }
}
GEOF
echo "Android hazır: asistan/android/"
