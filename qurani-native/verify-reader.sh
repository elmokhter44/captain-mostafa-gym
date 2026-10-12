#!/usr/bin/env bash
set -euo pipefail
adb wait-for-device
for attempt in $(seq 1 90); do
  if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && adb shell pm list packages >/dev/null 2>&1; then break; fi
  sleep 2
done
adb shell pm list packages >/dev/null
adb install -r deliverable/qurani-series-single.apk
adb shell am start -n com.qurani.nativeunified/.MainActivity
sleep 5
for slug in abuamr ibnamir ibnkathir khalafhamza alkisai khalladhamza abujaafar yaqub khalaf10 asim warshazraq qalunqasr; do
  adb shell am force-stop com.qurani.nativeunified
  adb logcat -c
  adb shell am start -n com.qurani.nativeunified/.MainActivity --es verify_slug "$slug"
  found=0
  for attempt in $(seq 1 30); do
    sleep 2
    adb logcat -d -s QURANI:I AndroidRuntime:E > "/tmp/$slug.log" || true
    if grep -Fq "PDF_RENDER_OK=pdf/$slug/reading.pdf page=0" "/tmp/$slug.log"; then
      found=1
      break
    fi
    if grep -Eq 'FATAL EXCEPTION|PDF_OPEN_ERROR|PDF_RENDER_ERROR' "/tmp/$slug.log"; then break; fi
  done
  if [[ "$found" -ne 1 ]]; then
    echo "NATIVE_READING_$slug=FAILED"
    cat "/tmp/$slug.log"
    exit 1
  fi
  echo "NATIVE_READING_$slug=PASS"
done
echo ALL_12_NATIVE_READING_PDFS=PASS
