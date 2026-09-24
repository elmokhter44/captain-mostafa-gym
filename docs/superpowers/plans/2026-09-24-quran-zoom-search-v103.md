# Quran Zoom + Search Results v1.0.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 12 updated Android APKs where pinch zoom works in the Quran and every explanatory section, and offline search shows the matching Quran text itself instead of generic technical/instructional cards.

**Architecture:** Keep the existing React Native reader, PDF assets, RTL paging, and user-PDF-only OCR search source. Make ReaderScreen expose ZoomablePdfPage directly to touch input, while retaining tap-to-open-menu through passive touch tracking. Keep the 604-page OCR index generated from the approved source PDF and change VerseSearchService to return a contextual text excerpt around the match so SearchScreen can render Quran text plus surah/page context.

**Tech Stack:** React Native/TypeScript, PanResponder, GitHub Actions, PyMuPDF, Tesseract Arabic OCR, Android build-tools/apksigner.

**Spec:** User request in the current Quran_karem conversation, 2026-09-24.

## Global Constraints

- Use only the user's approved PDFs for Quran/search content; do not call external Quran APIs or replace PDF content.
- Preserve RTL horizontal paging, full-size rendering, dark-only reader menu, existing index behavior, package IDs, and section names.
- Produce 12 independent installable APKs.
- New release version: versionName `1.0.3`, versionCode `4`.
- Verify every APK with unzip, 16K zipalign, APK signature v1/v2, package ID, versionCode/versionName, and embedded PDF assets.

## Review Focus

- Two-finger pinch must not be intercepted by a parent Pressable in ReaderScreen.
- Single-tap menu behavior must remain available when the page is not zoomed.
- Search cards must render OCR-derived matching Quran text, never the generic phrase `نتيجة مطابقة لنص البحث`.
- Search results must navigate to the exact matched mushaf page.
- Empty/short queries must remain safe and return no text results.

---

### Task 1: Reader pinch zoom in Quran and all sections

**Files:**
- Modify: `qurani-v102-fixed/ReaderScreen.tsx`
- Modify: `.github/workflows/quran-series-v102-complete.yml`

**Interfaces:**
- Consumes: `ZoomablePdfPage` with `onZoomStateChange` and existing `pageZoomed` state.
- Produces: direct child `ZoomablePdfPage` touch surface plus passive single-tap handlers.

- [ ] **Step 1: Add RED contract check** proving the reconstructed current reader still wraps `ZoomablePdfPage` in a `Pressable` and lacks passive tap handlers.
- [ ] **Step 2: Run workflow RED stage and confirm the new requirement is reported missing before the patch is applied.**
- [ ] **Step 3: Remove the Pressable wrapper around the PDF page; add touch-start/touch-end tap tracking on a plain View without claiming the responder.**
- [ ] **Step 4: GREEN contract must verify `ZoomablePdfPage` remains used for all Reader sections, `scrollEnabled={!pageZoomed}` remains, and passive tap handlers exist.**
- [ ] **Step 5: TypeScript compile must pass.**

### Task 2: Show matching Quran text in search results

**Files:**
- Modify: `qurani-v102-complete/VerseSearchService.ts`
- Modify: `qurani-v102-complete/SearchScreen.tsx`
- Modify: `.github/workflows/quran-series-v102-complete.yml`

**Interfaces:**
- Consumes: OCR page entries `{mushafPage, text}` from `verses.generated.ts`.
- Produces: search results `{mushafPage, text}` where `text` is a contextual excerpt centered on the matching OCR tokens.

- [ ] **Step 1: Add RED contract check** for the existing generic result title `نتيجة مطابقة لنص البحث` and instruction copy.
- [ ] **Step 2: Verify RED stage reports the missing user-facing verse-text result behavior.**
- [ ] **Step 3: Implement contextual excerpt extraction around exact/fuzzy matched tokens while preserving page ranking and the 30-result limit.**
- [ ] **Step 4: Render the excerpt as the primary result text, derive the surah name from the current page using the existing surah start-page metadata, and show only `سورة … • صفحة …` as context.**
- [ ] **Step 5: Remove generic/technical instruction strings from result cards and counter hint.**
- [ ] **Step 6: GREEN contract and TypeScript compile must pass.**

### Task 3: Build and publish the 12 updated APKs

**Files:**
- Modify: `.github/workflows/quran-series-v102-complete.yml`
- Modify: `.github/workflows/quran-series-v102-final-fixed.yml`

**Interfaces:**
- Consumes: persisted 12 overlays from the complete-payload workflow.
- Produces: GitHub Release `quran-series-v1.0.3-zoom-search` with 12 APKs + `SHA256SUMS.txt`.

- [ ] **Step 1: Configure payload builder for versionCode 4/versionName 1.0.3.**
- [ ] **Step 2: Build/persist 12 overlays and assert 12 unique packages plus requested UI/search contracts.**
- [ ] **Step 3: Update the final release workflow to reconstruct the new payload, build with the original approved PDFs, sign, and verify all 12 APKs.**
- [ ] **Step 4: Publish the new release only after all verification commands pass.**
- [ ] **Step 5: Verify the release contains exactly 12 APKs plus checksum file and provide direct download links.**
