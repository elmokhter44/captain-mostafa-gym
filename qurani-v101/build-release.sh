#!/usr/bin/env bash
set -euo pipefail

APP=qurani-app
DRIVE_FILE_ID=${DRIVE_FILE_ID:-1qKoCutARg2BzM4VfrO9iOsjuw_vbKeHu}

mkdir -p "$APP"
cat qurani-ci/text/part-* > /tmp/qurani-src.b64
base64 -d /tmp/qurani-src.b64 > /tmp/qurani-src.tar.gz
echo '8419ab562a4783684b34e1bc62a96be4dc3da00f8a85e5e0d298182ab1e79192  /tmp/qurani-src.tar.gz' | sha256sum -c -
tar -xzf /tmp/qurani-src.tar.gz -C "$APP"
cat qurani-v101/overlay/part-* > /tmp/qurani-v101-overlay.b64
base64 -d /tmp/qurani-v101-overlay.b64 > /tmp/qurani-v101-overlay.tar.gz
echo 'cbb6b45021274412968d6f6747fa54048d1d46be31e92a6cea31b5d80a2b9d7e  /tmp/qurani-v101-overlay.tar.gz' | sha256sum -c -
tar -xzf /tmp/qurani-v101-overlay.tar.gz -C "$APP"
cp qurani-v101/generate-verse-index.py "$APP/scripts/generate-verse-index.py"
chmod +x "$APP/scripts/generate-verse-index.py"
python3 - <<'PY'
from pathlib import Path
import base64
b64=''.join(p.read_text() for p in sorted(Path('qurani-ci/logo').glob('part-*')))
Path('/tmp/qurani-logo.jpg').write_bytes(base64.b64decode(b64,validate=True))
PY
echo '4c8d65a11c77539831be3a791e54b9eb984375cea878262fd1972ed3acf58cae  /tmp/qurani-logo.jpg' | sha256sum -c -
grep -q '"version": "1.0.1"' "$APP/package.json"
grep -q 'versionCode 2' "$APP/android/app/build.gradle"
grep -q 'versionName "1.0.1"' "$APP/android/app/build.gradle"

SIGNING_PASSWORD="$(openssl rand -hex 32)"
keytool -genkeypair -v -keystore "$APP/android/app/qurani-release.keystore" -storepass "$SIGNING_PASSWORD" -keypass "$SIGNING_PASSWORD" -alias qurani-release -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=Qurani Android Release, OU=Qurani, O=Qurani, L=Cairo, C=EG'
cat > "$APP/android/keystore.properties" <<EOF
storeFile=qurani-release.keystore
storePassword=$SIGNING_PASSWORD
keyAlias=qurani-release
keyPassword=$SIGNING_PASSWORD
EOF
mkdir -p "$APP/signing-backup"
cp "$APP/android/app/qurani-release.keystore" "$APP/signing-backup/"
cat > "$APP/signing-backup/signing-credentials.txt" <<EOF
IMPORTANT: Keep private. Required for every future update from Qurani v1.0.1 onward.
Package: com.qurani.app
Alias: qurani-release
Store password: $SIGNING_PASSWORD
Key password: $SIGNING_PASSWORD
EOF
chmod 600 "$APP/android/app/qurani-release.keystore" "$APP/android/keystore.properties" "$APP/signing-backup/"*

sudo apt-get update
sudo apt-get install -y poppler-utils unzip zip curl
python3 -m pip install --user --upgrade gdown pillow
mkdir -p "$APP/assets/branding"
python3 - <<'PY'
from PIL import Image
Image.open('/tmp/qurani-logo.jpg').convert('RGBA').save('qurani-app/assets/branding/qurani-icon.png', optimize=True)
PY
python3 -m gdown "$DRIVE_FILE_ID" -O /tmp/qurani-source.pdf
test "$(pdfinfo /tmp/qurani-source.pdf | awk '/^Pages:/ {print $2}')" = '681'
cd "$APP"
bash scripts/split-pdf.sh /tmp/qurani-source.pdf | tee ci/pdf-split-report.txt
test "$(pdfinfo android/app/src/main/assets/pdf/quran.pdf | awk '/^Pages:/ {print $2}')" = '604'
test "$(pdfinfo android/app/src/main/assets/pdf/qalun_usul.pdf | awk '/^Pages:/ {print $2}')" = '11'
test "$(pdfinfo android/app/src/main/assets/pdf/handwritten_warsh_qalun.pdf | awk '/^Pages:/ {print $2}')" = '32'
python3 scripts/generate-icons.py
sha256sum /tmp/qurani-source.pdf > ci/source-pdf-sha256.txt
curl -fsSL --retry 5 --retry-all-errors 'https://api.alquran.cloud/v1/quran/quran-uthmani' -o /tmp/quran-uthmani.json
python3 scripts/generate-verse-index.py /tmp/quran-uthmani.json src/data/verses.generated.ts | tee ci/verse-index-report.txt
grep -q 'Generated 6236 ayahs' ci/verse-index-report.txt
grep -q 'all 114 surah start pages match' ci/verse-index-report.txt

npm install --no-audit --no-fund
node --experimental-strip-types --test __tests__/*.node.test.ts | tee ci/business-tests.txt
grep -q '# pass 19' ci/business-tests.txt
grep -q '# fail 0' ci/business-tests.txt
cat > tsconfig.app.json <<'EOF'
{"extends":"./tsconfig.json","exclude":["node_modules","android","__tests__","**/*.node.test.ts"]}
EOF
npx tsc --noEmit -p tsconfig.app.json | tee ci/typecheck.txt

yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null || true
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools' 'ndk;27.1.12297006'
cd android
gradle wrapper --gradle-version 9.3.1
chmod +x gradlew
./gradlew clean
./gradlew assembleRelease --stacktrace | tee ../ci/gradle-release-build.txt
cd ..

APK=android/app/build/outputs/apk/release/app-release.apk
AAPT="$ANDROID_HOME/build-tools/36.0.0/aapt"
APKSIGNER="$ANDROID_HOME/build-tools/36.0.0/apksigner"
test -s "$APK"
"$AAPT" dump badging "$APK" | tee ci/apk-badging.txt
grep -q "package: name='com.qurani.app' versionCode='2' versionName='1.0.1'" ci/apk-badging.txt
grep -q "sdkVersion:'24'" ci/apk-badging.txt
grep -q "targetSdkVersion:'36'" ci/apk-badging.txt
grep -q "application-label:'قرآني'" ci/apk-badging.txt
"$APKSIGNER" verify --verbose --print-certs "$APK" | tee ci/apksigner.txt
grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' ci/apksigner.txt
unzip -l "$APK" > ci/apk-contents.txt
grep -q 'lib/arm64-v8a/librealm.so' ci/apk-contents.txt
grep -q 'lib/armeabi-v7a/librealm.so' ci/apk-contents.txt
grep -q 'lib/x86_64/librealm.so' ci/apk-contents.txt
grep 'librealm.so' ci/apk-contents.txt > ci/realm-native-libs.txt
sha256sum "$APK" | tee ci/apk-sha256.txt

cp "$APK" Qurani-v1.0.1.apk
(cd signing-backup && zip -q -r ../Qurani-signing-backup-v1.0.1.zip .)
zip -q -r Qurani-source-v1.0.1.zip . -x 'node_modules/*' 'android/.gradle/*' 'android/app/build/*' 'android/app/qurani-release.keystore' 'android/keystore.properties' 'signing-backup/*' '*.zip' 'Qurani-v1.0.1.apk'
mkdir -p ci/build-info
printf '%s\n' 'App: قرآني' 'Package: com.qurani.app' 'Version: 1.0.1 (2)' 'Min SDK: 24' 'Target SDK: 36' 'Reader: full-screen-width; vertical scroll preserved; pinch zoom 1x-4x' 'Search: surah + offline ayah text search (6236 ayahs)' 'React Native: 0.86.3' 'Realm JS: 20.2.0' > ci/build-info/BUILD-INFO.txt
