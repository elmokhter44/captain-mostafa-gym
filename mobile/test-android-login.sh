#!/usr/bin/env bash
set -euo pipefail
APK="${1:?APK path required}"
PKG="com.captainmostafagymmobile"
WORK="${RUNNER_TEMP:-/tmp}/gym-login-test"
mkdir -p "$WORK"

adb wait-for-device
adb install -r "$APK"
adb shell pm clear "$PKG" >/dev/null
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 5

pull_ui() {
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml "$WORK/window.xml" >/dev/null 2>&1
}
center_for_desc() {
  local desc="$1"
  pull_ui
  python3 - "$WORK/window.xml" "$desc" <<'PY'
import re,sys,xml.etree.ElementTree as ET
p,desc=sys.argv[1:]
root=ET.parse(p).getroot()
for n in root.iter('node'):
    if n.attrib.get('content-desc')==desc:
        b=n.attrib.get('bounds','')
        m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',b)
        if m:
            x1,y1,x2,y2=map(int,m.groups())
            print((x1+x2)//2,(y1+y2)//2)
            raise SystemExit(0)
raise SystemExit(f'Element not found: {desc}')
PY
}

tap_desc() {
  read -r x y < <(center_for_desc "$1")
  adb shell input tap "$x" "$y"
}

# Verify the login screen is actually present.
center_for_desc loginUsername >/dev/null
center_for_desc loginPassword >/dev/null
center_for_desc loginButton >/dev/null

# Enter the default credentials exactly as a user would.
tap_desc loginUsername
adb shell input text Admin
sleep 1
tap_desc loginPassword
adb shell input text Admin
sleep 1
tap_desc loginButton

# Native PBKDF2 is synchronous but should complete quickly. Allow the WebView and Realm UI to bootstrap.
for i in $(seq 1 30); do
  sleep 1
  pull_ui
  if grep -q 'content-desc="mainWebView"' "$WORK/window.xml"; then
    break
  fi
  if [ "$i" = 30 ]; then
    echo 'Login did not transition to the main WebView.' >&2
    cat "$WORK/window.xml" >&2
    adb logcat -d | tail -n 500 >&2 || true
    adb exec-out screencap -p > "$WORK/login-failure.png" || true
    exit 1
  fi
done

# Confirm the HTML dashboard has rendered, not just an empty WebView.
for i in $(seq 1 20); do
  sleep 1
  pull_ui
  if grep -q 'الرئيسية' "$WORK/window.xml" || grep -q 'المتدربون' "$WORK/window.xml" || grep -q 'إجمالي المتدربين' "$WORK/window.xml"; then
    echo 'ANDROID LOGIN + DASHBOARD E2E PASSED'
    adb exec-out screencap -p > "$WORK/dashboard-success.png" || true
    exit 0
  fi
done

echo 'Main WebView opened, but dashboard content was not exposed/rendered in the accessibility tree.' >&2
cat "$WORK/window.xml" >&2
adb logcat -d | tail -n 500 >&2 || true
adb exec-out screencap -p > "$WORK/dashboard-failure.png" || true
exit 1
