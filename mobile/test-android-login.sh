#!/usr/bin/env bash
set -euo pipefail
APK="${1:?APK path required}"
PKG="com.captainmostafagymmobile"
WORK="${GITHUB_WORKSPACE:-${RUNNER_TEMP:-/tmp}}/gym-login-test"
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
rendered=0
for i in $(seq 1 20); do
  sleep 1
  pull_ui
  if grep -q 'الرئيسية' "$WORK/window.xml" || grep -q 'المتدربون' "$WORK/window.xml" || grep -q 'إجمالي المتدربين' "$WORK/window.xml"; then
    rendered=1
    break
  fi
done

if [ "$rendered" != 1 ]; then
  echo 'Main WebView opened, but dashboard content was not exposed/rendered in the accessibility tree.' >&2
  cat "$WORK/window.xml" >&2
  adb logcat -d | tail -n 500 >&2 || true
  adb exec-out screencap -p > "$WORK/dashboard-failure.png" || true
  exit 1
fi

# Phone responsiveness gate: important dashboard controls must be present and
# fully inside the physical display rather than clipped beyond the left/right edge.
pull_ui
SIZE="$(adb shell wm size | tr -d '\r' | tail -n 1)"
WIDTH="$(printf '%s' "$SIZE" | sed -E 's/.*: ([0-9]+)x([0-9]+).*/\1/')"
HEIGHT="$(printf '%s' "$SIZE" | sed -E 's/.*: ([0-9]+)x([0-9]+).*/\2/')"
python3 - "$WORK/window.xml" "$WIDTH" "$HEIGHT" <<'PY'
import re,sys,xml.etree.ElementTree as ET
p,w,h=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
root=ET.parse(p).getroot()
required=['الرئيسية والتقارير','المتدربون','إضافة متدرب']

def parse_bounds(v):
    m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',v or '')
    return tuple(map(int,m.groups())) if m else None

for label in required:
    matches=[]
    for n in root.iter('node'):
        text=(n.attrib.get('text') or '')
        desc=(n.attrib.get('content-desc') or '')
        if label in text or label in desc:
            b=parse_bounds(n.attrib.get('bounds'))
            if b: matches.append(b)
    if not matches:
        raise SystemExit(f'Responsive check could not find visible control: {label}')
    # At least one accessibility node for the label must be fully on-screen.
    good=[b for b in matches if b[0]>=0 and b[1]>=0 and b[2]<=w and b[3]<=h and b[2]-b[0]>=20 and b[3]-b[1]>=12]
    if not good:
        raise SystemExit(f'Control is clipped outside {w}x{h}: {label} bounds={matches}')
    print(f'VISIBLE {label}: {good[0]}')
print(f'ANDROID RESPONSIVE BOUNDS PASSED at {w}x{h}')
PY

adb exec-out screencap -p > "$WORK/dashboard-success.png"
echo 'ANDROID LOGIN + DASHBOARD + RESPONSIVE E2E PASSED'
