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

center_for_desc loginUsername >/dev/null
center_for_desc loginPassword >/dev/null
center_for_desc loginButton >/dev/null

tap_desc loginUsername
adb shell input text Admin
sleep 1
tap_desc loginPassword
adb shell input text Admin
sleep 1
tap_desc loginButton

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

pull_ui
SIZE="$(adb shell wm size | tr -d '\r' | tail -n 1)"
WIDTH="$(printf '%s' "$SIZE" | sed -E 's/.*: ([0-9]+)x([0-9]+).*/\1/')"
HEIGHT="$(printf '%s' "$SIZE" | sed -E 's/.*: ([0-9]+)x([0-9]+).*/\2/')"
python3 - "$WORK/window.xml" "$WIDTH" "$HEIGHT" <<'PY'
import re,sys,xml.etree.ElementTree as ET
p,w,h=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
root=ET.parse(p).getroot()
required=['الرئيسية والتقارير','المتدربون','إضافة متدرب','تصدير']

def parse_bounds(v):
    m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',v or '')
    return tuple(map(int,m.groups())) if m else None

def visible_bounds(label):
    matches=[]
    for n in root.iter('node'):
        text=(n.attrib.get('text') or '')
        desc=(n.attrib.get('content-desc') or '')
        if label in text or label in desc:
            b=parse_bounds(n.attrib.get('bounds'))
            if b: matches.append(b)
    if not matches:
        raise SystemExit(f'Responsive check could not find visible control: {label}')
    good=[b for b in matches if b[0]>=0 and b[1]>=0 and b[2]<=w and b[3]<=h and b[2]-b[0]>=20 and b[3]-b[1]>=12]
    if not good:
        raise SystemExit(f'Control is clipped outside {w}x{h}: {label} bounds={matches}')
    return good[0]

bounds={label:visible_bounds(label) for label in required}
for label,b in bounds.items(): print(f'VISIBLE {label}: {b}')

# The first three navigation buttons must share the compact mobile nav row.
# A desktop sidebar makes them large, same-width buttons stacked vertically.
nav=[bounds[x] for x in ['الرئيسية والتقارير','المتدربون','إضافة متدرب']]
yc=[(b[1]+b[3])//2 for b in nav]
widths=[b[2]-b[0] for b in nav]
if max(yc)-min(yc)>80:
    raise SystemExit(f'Desktop-style vertical navigation detected; nav centers={yc}, bounds={nav}')
if any(x>w*0.45 for x in widths):
    raise SystemExit(f'Navigation buttons are too wide for mobile grid; widths={widths}, screen={w}')

print(f'ANDROID RESPONSIVE MOBILE NAV PASSED at {w}x{h}')
PY

adb exec-out screencap -p > "$WORK/dashboard-success.png"
echo 'ANDROID LOGIN + DASHBOARD + RESPONSIVE E2E PASSED'
