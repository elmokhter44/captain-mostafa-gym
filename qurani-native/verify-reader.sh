#!/usr/bin/env bash
set -euo pipefail
adb install -r deliverable/qurani-series-single.apk
adb shell am start -n com.qurani.nativeunified/.MainActivity
sleep 4
adb shell uiautomator dump /sdcard/hierarchy.xml
adb pull /sdcard/hierarchy.xml /tmp/hierarchy.xml
grep -q 'mushaf-card-abuamr' /tmp/hierarchy.xml
for slug in abuamr ibnamir ibnkathir khalafhamza alkisai khalladhamza abujaafar yaqub khalaf10 asim warshazraq qalunqasr; do
  adb shell am force-stop com.qurani.nativeunified
  adb logcat -c
  adb shell am start -n com.qurani.nativeunified/.MainActivity --es verify_slug "$slug"
  sleep 9
  adb logcat -d -s QURANI:I AndroidRuntime:E > "/tmp/$slug.log"
  cat "/tmp/$slug.log"
  grep -F "PDF_RENDER_OK=pdf/$slug/reading.pdf page=0" "/tmp/$slug.log"
  echo "NATIVE_READING_$slug=PASS"
done
echo ALL_12_NATIVE_READING_PDFS=PASS
