#!/bin/bash
# iOS projesini oluşturur ve REO Sakin ayarlarını uygular (Mac veya Codemagic'te çalışır)
set -e
cd "$(dirname "$0")/.."
[ -f firebase/GoogleService-Info.plist ] || { echo "HATA: firebase/GoogleService-Info.plist yok (Firebase konsolundan indirin)."; exit 1; }
[ -d ios ] || npx cap add ios
npx capacitor-assets generate --ios --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#0b3b60'
npx cap sync ios
A=ios/App/App
cp firebase/GoogleService-Info.plist $A/GoogleService-Info.plist
cp native/ios/AppDelegate.swift $A/AppDelegate.swift
cp native/ios/App.entitlements $A/App.entitlements
PB=ios/App/App.xcodeproj/project.pbxproj
# GoogleService-Info.plist ve entitlements'ı projeye bağla
grep -q "CODE_SIGN_ENTITLEMENTS" $PB || sed -i '' 's#INFOPLIST_FILE = App/Info.plist;#INFOPLIST_FILE = App/Info.plist;\
				CODE_SIGN_ENTITLEMENTS = App/App.entitlements;#g' $PB
if ! grep -q "GoogleService-Info.plist" $PB; then
  gem list -i xcodeproj >/dev/null 2>&1 || gem install xcodeproj --no-document
  ruby -e 'require "xcodeproj"; p=Xcodeproj::Project.open("ios/App/App.xcodeproj"); t=p.targets.find{|x|x.name=="App"}; g=p.main_group["App"]; r=g.new_file("GoogleService-Info.plist"); t.resources_build_phase.add_file_reference(r); p.save'
fi
PL=$A/Info.plist
/usr/libexec/PlistBuddy -c "Delete :UIBackgroundModes" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" -c "Add :UIBackgroundModes:0 string remote-notification" $PL
/usr/libexec/PlistBuddy -c "Delete :ITSAppUsesNonExemptEncryption" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" $PL
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'REO Sakin'" $PL 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string 'REO Sakin'" $PL
/usr/libexec/PlistBuddy -c "Delete :CFBundleDevelopmentRegion" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleDevelopmentRegion string tr" $PL
/usr/libexec/PlistBuddy -c "Delete :CFBundleLocalizations" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations array" -c "Add :CFBundleLocalizations:0 string tr" -c "Add :CFBundleLocalizations:1 string en" -c "Add :CFBundleLocalizations:2 string ru" $PL
# Yalnızca dikey kullanım (iPhone)
/usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" $PL 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" $PL
echo "iOS hazır: ios/App/App.xcworkspace"
