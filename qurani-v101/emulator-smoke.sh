#!/usr/bin/env bash
set -euo pipefail
cd qurani-app
mkdir -p android/app/build/outputs/apk/release
cp Qurani-v1.0.1.apk android/app/build/outputs/apk/release/app-release.apk
python3 ci/ui_smoke.py | tee ci/android-emulator-smoke.txt
adb logcat -d -v time > ci/android-logcat-final.txt || true
if grep -E 'FATAL EXCEPTION|AndroidRuntime.*Process: com.qurani.app' ci/android-logcat-final.txt; then
  echo 'Fatal Qurani exception detected' >&2
  exit 1
fi
adb exec-out screencap -p > ci/emulator-final.png
