#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/payload final-apks /tmp/sources /tmp/sections /tmp/apkwork
cat .series-generated-v102/parts/payload.part-* > /tmp/v102.tar.gz
tar -tzf /tmp/v102.tar.gz >/dev/null
tar -xzf /tmp/v102.tar.gz -C /tmp/payload
test -s /tmp/payload/base.apk
test -d /tmp/payload/overlays
keytool -genkeypair -v -keystore /tmp/quran-v102.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Quran Karem Series,O=QuranKarem,C=EG' >/dev/null 2>&1

cat > /tmp/apps.tsv <<'EOF'
01	abuamr	com.qurani.series.abuamr	638	1BVoetPB5RCq5cSV1zxaxb0nj98B0faup	المصحف المعلم بقراءة الإمام أبي عمرو البصري براوييه السوسي والدوري.apk
02	ibnamir	com.qurani.series.ibnamir	633	1zxcrxi4Q2J0jaKZS1hFPQEF3GhNIDlTZ	المصحف المعلم بقراءة الإمام ابن عامر الشامي برواية هشام وبالحاشية ما خالفه فيه ابن ذكوان.apk
03	ibnkathir	com.qurani.series.ibnkathir	632	1hFgLvZYo_tqrpTn82kzzRy30kr3agtg5	المصحف المعلم بقراءة الإمام عبدالله بن كثير براوييه البزي وقنبل.apk
04	khalafhamza	com.qurani.series.khalafhamza	636	14dV4ewJ75I-feQSTz0oNsMvUSz2vnlPG	المصحف المعلم برواية الإمام خلف عن حمزة بوجه السكت على الساكن المفصول.apk
05	alkisai	com.qurani.series.alkisai	633	1a2PHF7eHXmKtn8bgd_SHbSKSyc4vp1b3	المصحف المعلم بقراءة الإمام الكسائي براوييه الليث والدوري.apk
06	khalladhamza	com.qurani.series.khalladhamza	636	1iLjNkH1nB-eovs6xXJmsh0Zd_dBagpWS	المصحف المعلم برواية الإمام خلاد عن حمزة بوجه ترك السكت مطلقًا.apk
07	abujaafar	com.qurani.series.abujaafar	634	1ka0xEX2tK95HTJos_eU0W_yjtzYVFeKM	المصحف المعلم بقراءة الإمام أبي جعفر المدني براوييه ابن وردان وابن جماز.apk
08	yaqub	com.qurani.series.yaqub	630	1-HMgAHqQbJz97EQnPUDd7tFmUJ-uHsJu	المصحف المعلم بقراءة الإمام يعقوب الحضرمي براوييه رويس وروح.apk
09	khalaf10	com.qurani.series.khalaf10	628	1vHJkNHxGLxLqby6pszUoxhGcOP4-wK6F	المصحف المعلم بقراءة الإمام خلف العاشر البزار براوييه إسحاق وإدريس.apk
10	asim	com.qurani.series.asim	633	1dtHbfD19xNUxc9rPNT2gHuxTTSK8XLBh	المصحف المعلم بقراءة الإمام عاصم ابن أبي النجود برواية حفص وبالحاشية ما خالفه فيه شعبة.apk
11	warshazraq	com.qurani.series.warshazraq	637	1eZsEfvK2WYERoHXRqdIxgfC8K6hqAcgI	مصحف ورش عن نافع من طريق الأزرق.apk
12	qalunqasr	com.qurani.series.qalunqasr	632	1qTjYqpjs9S6v0UM2nZMXvUSsmBXxum3b	مصحف قالون عن نافع بوجه قصر المنفصل وإسكان ميم الجمع.apk
EOF

BT="$ANDROID_HOME/build-tools/36.0.0"
AAPT="$BT/aapt"
ZIPALIGN="$BT/zipalign"
APKSIGNER="$BT/apksigner"
KEYSTORE=/tmp/quran-v102.keystore

while IFS=$'\t' read -r num slug package pages drive_id filename; do
  echo "===== $num $slug ====="
  src="/tmp/sources/$slug.pdf"
  python3 -m gdown "$drive_id" -O "$src" --quiet
  test -s "$src"
  python3 - "$src" "$pages" "$slug" <<'PY'
import sys, fitz
from pathlib import Path
src_path, expected, slug=sys.argv[1],int(sys.argv[2]),sys.argv[3]
src=fitz.open(src_path)
assert src.page_count==expected,(slug,src.page_count,expected)
outdir=Path('/tmp/sections')/slug
outdir.mkdir(parents=True,exist_ok=True)
ranges={'reading.pdf':(1,4),'quran.pdf':(5,608),'quran_index.pdf':(609,610),'dua.pdf':(611,611),'waqf_symbols.pdf':(612,616),'furati_intro.pdf':(617,620),'usul.pdf':(621,expected)}
for name,(start,end) in ranges.items():
    d=fitz.open(); d.insert_pdf(src,from_page=start-1,to_page=end-1)
    d.save(outdir/name,garbage=0,deflate=False)
    assert d.page_count==end-start+1,(slug,name,d.page_count)
    d.close()
src.close()
PY
  workdir="/tmp/apkwork/$slug"
  rm -rf "$workdir" && mkdir -p "$workdir/stage/assets/pdf" "$workdir/stage/assets"
  cp /tmp/payload/base.apk "$workdir/unsigned.apk"
  (zip -q -d "$workdir/unsigned.apk" 'META-INF/*' 'AndroidManifest.xml' 'resources.arsc' 'assets/index.android.bundle' 'assets/pdf/*' || true)
  cp "/tmp/payload/overlays/$slug/files/AndroidManifest.xml" "$workdir/stage/AndroidManifest.xml"
  cp "/tmp/payload/overlays/$slug/files/resources.arsc" "$workdir/stage/resources.arsc"
  cp "/tmp/payload/overlays/$slug/files/assets/index.android.bundle" "$workdir/stage/assets/index.android.bundle"
  cp "/tmp/sections/$slug/"*.pdf "$workdir/stage/assets/pdf/"
  (cd "$workdir/stage" && zip -q -0 "$workdir/unsigned.apk" AndroidManifest.xml resources.arsc assets/index.android.bundle assets/pdf/*.pdf)
  "$ZIPALIGN" -f -P 16 4 "$workdir/unsigned.apk" "$workdir/aligned.apk"
  "$APKSIGNER" sign --ks "$KEYSTORE" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --min-sdk-version 21 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "final-apks/$filename" "$workdir/aligned.apk"
  unzip -t "final-apks/$filename" >/dev/null
  "$ZIPALIGN" -c -P 16 4 "final-apks/$filename"
  "$APKSIGNER" verify --verbose --min-sdk-version 21 "final-apks/$filename" | tee "$workdir/signing.txt"
  grep -q 'Verified using v1 scheme (JAR signing): true' "$workdir/signing.txt"
  grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' "$workdir/signing.txt"
  "$AAPT" dump badging "final-apks/$filename" | tee "$workdir/badging.txt"
  grep -q "package: name='$package' versionCode='3' versionName='1.0.2'" "$workdir/badging.txt"
  unzip -l "final-apks/$filename" | grep -q 'assets/pdf/quran.pdf'
  unzip -l "final-apks/$filename" | grep -q 'assets/pdf/quran_index.pdf'
  unzip -l "final-apks/$filename" | grep -q 'assets/pdf/usul.pdf'
done < /tmp/apps.tsv

test "$(find final-apks -maxdepth 1 -name '*.apk' | wc -l)" -eq 12
sha256sum final-apks/*.apk | tee final-apks/SHA256SUMS.txt
TAG=quran-series-v1.0.2-final12
gh release delete "$TAG" --cleanup-tag --yes >/dev/null 2>&1 || true
gh release create "$TAG" final-apks/*.apk final-apks/SHA256SUMS.txt --title 'Quran Series v1.0.2 – Zoom + RTL + Verse Search' --notes 'Final 12 APKs from the user-provided PDFs only. Pinch zoom works in the Quran and all sections/explanations. Quran paging is right-to-left with Al-Fatiha first. Verse-text search is enabled. Arabic titles and wording were corrected.'
