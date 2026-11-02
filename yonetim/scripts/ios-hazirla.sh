#!/bin/bash
# iOS projesini oluşturur ve Reo Yönetim ayarlarını uygular (Mac veya Codemagic'te çalışır)
set -e
cd "$(dirname "$0")/.."
cp node_modules/@capacitor/core/dist/capacitor.js www/capacitor.js || { echo "HATA: @capacitor/core/dist/capacitor.js bulunamadı"; exit 1; }
[ -d ios ] || npx cap add ios
# Apple: Nisan 2027'den itibaren en az iOS 15.0 hedefi zorunlu (ITMS-90068)
sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/" ios/App/Podfile
sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' ios/App/App.xcodeproj/project.pbxproj
# Yalnızca iPhone (iPad ekran görüntüsü istenmesin)
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = 1;/g' ios/App/App.xcodeproj/project.pbxproj
npx capacitor-assets generate --ios --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#ffffff'
npx cap sync ios
A=ios/App/App
PB=ios/App/App.xcodeproj/project.pbxproj
PL=$A/Info.plist
/usr/libexec/PlistBuddy -c "Delete :ITSAppUsesNonExemptEncryption" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" $PL
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'Reo Yönetim'" $PL 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string 'Reo Yönetim'" $PL
/usr/libexec/PlistBuddy -c "Delete :CFBundleDevelopmentRegion" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleDevelopmentRegion string tr" $PL
/usr/libexec/PlistBuddy -c "Delete :CFBundleLocalizations" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations array" -c "Add :CFBundleLocalizations:0 string tr" -c "Add :CFBundleLocalizations:1 string en" -c "Add :CFBundleLocalizations:2 string ru" $PL
# Yalnızca dikey kullanım (iPhone)
/usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" $PL
echo "iOS hazır: ios/App/App.xcworkspace"
