#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

import yaml

ROOT = Path.cwd()
V103 = ROOT / '.github/workflows/quran-series-v103-build-release.yml'
V104 = ROOT / 'qurani-v104-exact-search'


def run(script: str, label: str) -> None:
    print(f'\n===== {label} =====', flush=True)
    subprocess.run(script, shell=True, executable='/bin/bash', check=True, env=os.environ.copy())


def load_v103_steps() -> dict[str, str]:
    data = yaml.safe_load(V103.read_text(encoding='utf-8'))
    steps = data['jobs']['build-release']['steps']
    return {step.get('name'): step['run'] for step in steps if step.get('name') and 'run' in step}


def configure_v104() -> None:
    p = Path('/tmp/build.py')
    s = p.read_text(encoding='utf-8')
    for a, b in [
        ("'versionCode 1'", "'versionCode 5'"),
        ("'versionName \"1.0.0\"'", "'versionName \"1.0.4\"'"),
        ("VERSION_NAME = '1.0.0'", "VERSION_NAME = '1.0.4'"),
        ("VERSION_CODE = 1", "VERSION_CODE = 5"),
        ("versionCode='1' versionName='1.0.0'", "versionCode='5' versionName='1.0.4'"),
        ("'versionCode':1,'versionName':'1.0.0'", "'versionCode':5,'versionName':'1.0.4'"),
        ("title: 'من بين يدي السلسلة الفراتية'", "title: 'بين يدي السلسلة الفراتية'"),
    ]:
        s = s.replace(a, b)
    p.write_text(s, encoding='utf-8')
    assert "versionCode='5' versionName='1.0.4'" in s
    print('V104_VERSION_CONFIG_OK=1')


def exact_reference_index() -> None:
    refdir = Path('/tmp/reference-v104')
    extracted = Path('/tmp/reference-extract-v104')
    shutil.rmtree(refdir, ignore_errors=True)
    shutil.rmtree(extracted, ignore_errors=True)
    refdir.mkdir(parents=True)
    extracted.mkdir(parents=True)
    ref = refdir / 'reference-nafi.apk'

    subprocess.run(['gh', 'release', 'download', 'qurani-v1.0.2-nafi-final', '--pattern', 'default.apk', '--dir', str(refdir)], check=True)
    (refdir / 'default.apk').rename(ref)
    expected = (V104 / 'SHA256SUMS.txt').read_text(encoding='utf-8').split()[0]
    import hashlib
    digest = hashlib.sha256(ref.read_bytes()).hexdigest()
    assert digest == expected, (digest, expected)
    assert ref.stat().st_size == 155687902, ref.stat().st_size

    subprocess.run(['unzip', '-q', str(ref), 'assets/index.android.bundle', '-d', str(extracted)], check=True)
    json_out = Path('/tmp/verse-index.json')
    ts_out = ROOT / 'qurani-app/src/data/verses.generated.ts'
    subprocess.run(['python3', str(V104 / 'extract_reference_verse_index.py'), str(extracted / 'assets/index.android.bundle'), '--json-out', str(json_out), '--ts-out', str(ts_out)], check=True)
    subprocess.run(['python3', str(V104 / 'test_exact_search.py'), str(json_out)], check=True)

    test_out = Path('/tmp/v104-service-test')
    shutil.rmtree(test_out, ignore_errors=True)
    test_out.mkdir(parents=True)
    subprocess.run([
        str(ROOT / 'qurani-app/node_modules/.bin/tsc'), '--target', 'ES2020', '--module', 'commonjs', '--strict', '--skipLibCheck',
        '--outDir', str(test_out), str(V104 / 'VerseSearchService.ts'), str(V104 / 'test_service.ts')
    ], check=True)
    subprocess.run(['node', str(test_out / 'test_service.js')], check=True)
    print('REFERENCE_APK_SHA256_OK=1')
    print('EXACT_6236_AYAH_INDEX_OK=1')


def validate_app_contract() -> None:
    root = ROOT / 'qurani-app'
    reader = (root / 'src/features/reader/ReaderScreen.tsx').read_text(encoding='utf-8')
    index = (root / 'src/features/index/IndexScreen.tsx').read_text(encoding='utf-8')
    zoom = (root / 'src/features/reader/ZoomablePdfPage.tsx').read_text(encoding='utf-8')
    search = (root / 'src/features/search/SearchScreen.tsx').read_text(encoding='utf-8')
    service = (root / 'src/services/VerseSearchService.ts').read_text(encoding='utf-8')
    app = (root / 'src/app/App.tsx').read_text(encoding='utf-8')
    verses = (root / 'src/data/verses.generated.ts').read_text(encoding='utf-8')
    checks = {
        'rtl_reader': 'horizontal inverted pagingEnabled' in reader,
        'all_reader_sections_zoom': '<ZoomablePdfPage' in reader and 'scrollEnabled={!pageZoomed}' in reader and 'onTouchStart={handlePageTouchStart}' in reader,
        'pinch_zoom': 'MAX_ZOOM = 4.5' in zoom and 'PanResponder.create' in zoom and 'touchDistance' in zoom,
        'index_zoom': 'ZoomablePdfPage' in index and 'scrollEnabled={!pageZoomed}' in index,
        'dark_only': 'const dark=true;' in reader and "key:'theme'" not in reader and 'toggleTheme' not in reader,
        'splash_contain': 'resizeMode="contain"' in app,
        'exact_search_visible': '<Text style={styles.ayahText}>{item.text}</Text>' in search and 'آية {item.ayahNumber}' in search,
        'search_not_truncated': 'numberOfLines={3}' not in search,
        'search_returns_exact': 'buildMatchExcerpt' not in service and '.map(item => item.entry)' in service.replace('\n', ' '),
        'exact_6236': verses.count('"surahNumber":') == 6236 and verses.count('"ayahNumber":') == 6236,
        'exact_known_verse': 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ' in verses,
    }
    failed = [key for key, ok in checks.items() if not ok]
    assert not failed, 'V104_GREEN_FAIL=' + ','.join(failed)
    (root / 'tsconfig.series.json').write_text('{"extends":"./tsconfig.json","exclude":["node_modules","android","__tests__","**/*.node.test.ts"]}\n', encoding='utf-8')
    subprocess.run(['npx', 'tsc', '--noEmit', '-p', 'tsconfig.series.json'], cwd=root, check=True)
    print('V104_GREEN_CONTRACT_OK=1')
    print('TYPESCRIPT_OK=1')


def force_v104_final_verifier(script: str) -> str:
    # The v1.0.4 build intentionally reuses the proven v1.0.3 signing/build shell.
    # Rewrite version checks independently so a stale paired string can never survive.
    script = script.replace('v103', 'v104').replace('v1.0.3', 'v1.0.4')
    script = re.sub(r"versionCode='4'", "versionCode='5'", script)
    script = re.sub(r"versionName='1\.0\.3'", "versionName='1.0.4'", script)
    script = re.sub(r"versionName='1\.0\.4'", "versionName='1.0.4'", script)

    stale = [
        "versionCode='4'",
        "versionName='1.0.3'",
        'v1.0.3',
    ]
    remaining = [token for token in stale if token in script]
    if remaining:
        raise SystemExit('STALE_V103_FINAL_VERIFIER=' + ','.join(remaining))
    if "versionCode='5'" not in script or "versionName='1.0.4'" not in script:
        raise SystemExit('V104_FINAL_VERIFIER_MISSING')

    for line in script.splitlines():
        if 'dump badging' in line or ('grep -q' in line and ('versionCode' in line or 'versionName' in line)):
            print('V104_FINAL_VERIFY:', line.strip(), flush=True)
    return script


def main() -> None:
    steps = load_v103_steps()
    run(steps['Reconstruct app source and stable APK skeleton'], 'reconstruct source')

    install = steps['Install build and OCR dependencies'].replace(
        "sudo apt-get install -y -qq tesseract-ocr tesseract-ocr-ara >/dev/null\n", ''
    )
    run(install, 'install build dependencies (OCR removed)')

    run(steps['Apply zoom and visible Quran search-result fixes'], 'preserve v1.0.3 UI/zoom behavior')
    shutil.copy2(V104 / 'SearchScreen.tsx', ROOT / 'qurani-app/src/features/search/SearchScreen.tsx')
    shutil.copy2(V104 / 'VerseSearchService.ts', ROOT / 'qurani-app/src/services/VerseSearchService.ts')

    exact_reference_index()
    configure_v104()
    validate_app_contract()

    overlays = steps['Build 12 v1.0.3 overlays']
    overlays = overlays.replace('series-output-v103', 'series-output-v104')
    overlays = overlays.replace("x['versionCode']==4 and x['versionName']=='1.0.3'", "x['versionCode']==5 and x['versionName']=='1.0.4'")
    overlays = overlays.replace('ALL_12_V103_OVERLAYS_OK', 'ALL_12_V104_OVERLAYS_OK')
    overlays = overlays.replace("/tmp/sections", "/tmp/sections /tmp/verse-index.json /tmp/v104-service-test /tmp/reference-v104 /tmp/reference-extract-v104")
    run(overlays, 'build 12 v1.0.4 overlays')

    final = force_v104_final_verifier(steps['Build sign and verify final 12 APKs from approved PDFs'])
    run(final, 'build sign and verify 12 final APKs')

    apk_count = len(list((ROOT / 'final-apks').glob('*.apk')))
    assert apk_count == 12, apk_count
    print('ALL_12_V104_FINAL_APKS_VERIFIED=1')

    tag = 'quran-series-v1.0.4-exact-ayah-search'
    env = os.environ.copy()
    subprocess.run(['gh', 'release', 'delete', tag, '--cleanup-tag', '--yes'], env=env, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assets = [str(p) for p in sorted((ROOT / 'final-apks').glob('*.apk'))]
    assets.append(str(ROOT / 'final-apks/SHA256SUMS.txt'))
    notes = (
        '12 APKs with one focused change only: offline ayah search now uses the exact structured 6236-ayah index from the exact user-supplied reference APK '
        '(verified SHA-256 42fe532629b4420fc9ade04355fee2b451e76afbc0a2203c4cf38b044c23e3c3), so results display complete coherent ayah text instead of OCR fragments. '
        'Search remains flexible for unvocalized Arabic and common Uthmani spellings. All Quran and section PDFs remain the original user-provided PDFs. UI, zoom, RTL paging and all other v1.0.3 behavior are unchanged.'
    )
    subprocess.run(['gh', 'release', 'create', tag, *assets, '--target', os.environ['GITHUB_SHA'], '--title', 'Quran Series v1.0.4 – Exact Ayah Search', '--notes', notes], env=env, check=True)
    print('V104_RELEASE_PUBLISHED=1')


if __name__ == '__main__':
    main()
