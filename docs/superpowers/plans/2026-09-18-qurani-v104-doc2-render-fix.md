# Qurani v1.0.4 Doc2 Render Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deliver `al-mushaf-al-muallam-nafi-v1.0.4.apk` with the fourth page of the Warsh summary replaced by the exact uploaded `Doc2.pdf` page and verified on Android.

**Architecture:** Keep the verified v1.0.1 source/signing restoration used by the existing release workflow, reapply only the already-approved v1.0.3 behavior/copy, reconstruct the uploaded Doc2 bytes exactly from CI text chunks, and create `warsh_summary_v104.pdf` by concatenating the original first three pages with Doc2 page 1. Test both Android PdfRenderer output and a release-APK UI navigation to page 4 before publishing.

**Tech Stack:** React Native, Android Gradle, PyMuPDF, Android PdfRenderer, adb/UIAutomator, GitHub Actions.

**Spec:** User-approved instructions in the Quran_karem project conversation.

## Global Constraints

- Package: `com.qurani.app`.
- Version: `1.0.4`; Android `versionCode 5`.
- Use the same release signing key as v1.0.3 so update-install works.
- Do not change logo, colors, sections, UI, or functions beyond already-approved changes.
- Use the uploaded `Doc2.pdf` itself; do not convert it to JPG and do not use an overlay.
- Preserve Warsh summary pages 1–3 byte/render-equivalent; replace only page 4.
- New asset name: `warsh_summary_v104.pdf`.
- Verify page 4 with Android PdfRenderer and with install/update/launch/navigation/relaunch on an Android emulator.

---

### Task 1: Preserve exact Doc2 bytes in CI

**Files:**
- Create: `.ci-assets/doc2-pdf-v104-b64/part00` ... chunk files.
- Modify: `.github/workflows/qurani-v104-render-fix.yml`.

**Interfaces:**
- Consumes: uploaded `Doc2.pdf` SHA-256 `cb949d1af46acf76c447da9a4cdaea0e13a7a606453fbf9d850f928d1d71bc47`.
- Produces: `/tmp/Doc2-v104.pdf` with the same SHA-256.

- [ ] **Step 1: Write the failing CI assertion**

```bash
cat .ci-assets/doc2-pdf-v104-b64/part* | base64 -d > /tmp/Doc2-v104.pdf
echo 'cb949d1af46acf76c447da9a4cdaea0e13a7a606453fbf9d850f928d1d71bc47  /tmp/Doc2-v104.pdf' | sha256sum -c -
```

- [ ] **Step 2: Verify it fails before the chunks exist**

Expected: missing chunk path or SHA mismatch.

- [ ] **Step 3: Add exact base64 chunks from the uploaded file**

No image conversion or rasterization is permitted.

- [ ] **Step 4: Verify exact SHA passes**

Expected: `OK`.

### Task 2: Replace only Warsh summary page 4

**Files:**
- Modify: `.github/workflows/qurani-v104-render-fix.yml`.

**Interfaces:**
- Consumes: original `warsh_summary.pdf` and `/tmp/Doc2-v104.pdf`.
- Produces: `android/app/src/main/assets/pdf/warsh_summary_v104.pdf`.

- [ ] **Step 1: Assert source PDFs have expected page counts**

```python
assert old.page_count == 4
assert doc2.page_count == 1
```

- [ ] **Step 2: Build with direct PDF page insertion**

```python
out.insert_pdf(old, from_page=0, to_page=2)
out.insert_pdf(doc2, from_page=0, to_page=0)
```

- [ ] **Step 3: Assert output has 4 pages and first three render hashes match the original**

Expected: all assertions pass.

### Task 3: Build signed v1.0.4 and test PdfRenderer

**Files:**
- Modify: `.github/workflows/qurani-v104-render-fix.yml`.
- Create during CI: `android/app/src/androidTest/java/com/qurani/app/PdfPageRenderTest.kt`.

**Interfaces:**
- Produces: signed `al-mushaf-al-muallam-nafi-v1.0.4.apk`.

- [ ] **Step 1: Run the Android PdfRenderer regression against page index 3**

Expected: rendered page has paper/content pixels and is not a gray placeholder.

- [ ] **Step 2: Build release APK and verify package/version/signing certificate matches v1.0.3**

Expected: package `com.qurani.app`, versionCode `5`, versionName `1.0.4`, same signer digest.

### Task 4: Update-install and UI-smoke page 4

**Files:**
- Modify: `.github/workflows/qurani-v104-render-fix.yml`.

**Interfaces:**
- Produces: `warsh-page4-v104.png` evidence and final release.

- [ ] **Step 1: Install v1.0.3, launch, then `adb install -r` v1.0.4**

Expected: update succeeds without uninstalling between versions.

- [ ] **Step 2: Launch v1.0.4 and navigate by UIAutomator to `شرح مختصر أصول الإمام ورش`**

Expected: section opens.

- [ ] **Step 3: Scroll until `صفحة 4 من 4` is visible, capture screenshot, and reject gray-placeholder pixels**

Expected: screenshot exists and pixel test passes.

- [ ] **Step 4: Force-stop and relaunch**

Expected: app process returns without fatal exception.

- [ ] **Step 5: Publish GitHub release**

Attach both `al-mushaf-al-muallam-nafi-v1.0.4.apk` and `warsh-page4-v104.png`.
