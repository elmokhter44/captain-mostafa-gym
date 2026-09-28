# سلسلة قرآني — Unified Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one installable Android APK named **سلسلة قرآني** that contains the 12 completed mushaf experiences, with first-run onboarding and a 12-card selector.

**Architecture:** Reuse the established v1.0.4 application runtime/UI once, with a selected-mushaf configuration/content layer. Keep the 12 standalone apps unchanged; the unified package owns all required original user-provided PDF/content assets and routes each selector card into that mushaf’s existing full home experience.

**Tech Stack:** Existing Android/React Native project stack and GitHub Actions build pipeline already used by Quran Series v1.0.4.

**Spec:** `docs/superpowers/specs/2026-09-28-qurani-unified-series-design.md`

## Global Constraints
- Display name: **سلسلة قرآني** with the current Qurani logo/identity.
- New Android package/application ID; must coexist with all 12 standalone apps.
- Original user-provided PDFs/assets are the only source for mushaf and section content.
- Preserve exact ayah search index integrity: exactly 6236 unique verses.
- Preserve each mushaf’s existing home, sections, explanations, index, zoom, RTL paging, PDF viewer, offline behavior and page mapping.
- Do not modify/remove the 12 standalone v1.0.4 apps or their release.
- Onboarding appears after splash only on first successful launch; later launches go from splash directly to selector.
- Onboarding page 3 title: **أقسام وشروح متكاملة**; body: **استكشف أقسام كل مصحف وشروحه المرفقة، كل ما تحتاجه في مكان واحد، بوضوح وتنظيم.**; CTA: **ابدأ الآن**.

## Review Focus
- First-run flag survives process restart and prevents onboarding from reappearing.
- Back from a selected mushaf root returns to selector without exiting unexpectedly.
- Every selector entry maps to the correct original content/assets and page mapping.
- All 12 content bundles are present in the final APK and no external download is required.
- Exact ayah search remains full-text and opens the correct mushaf page.

---

### Task 1: Unified app scaffold and identity
**Files:** Create a unified-app build/config layer and tests based on the existing v1.0.4 runtime.
**Interfaces:** Produces a standalone package named `سلسلة قرآني` and shared runtime entrypoint.
- [ ] Write failing verification for unique package ID, launcher name/logo, and coexistence with standalone IDs.
- [ ] Run verification and confirm failure before unified configuration exists.
- [ ] Add minimal unified configuration reusing the current runtime without changing standalone configs.
- [ ] Run verification and confirm pass.
- [ ] Commit.

### Task 2: First-run splash/onboarding flow
**Files:** Create focused onboarding state/screen components following existing project patterns; add tests.
**Interfaces:** Consumes unified app entrypoint; produces persisted `onboardingCompleted` state and selector handoff.
- [ ] Write failing tests for first launch, three RTL pages, exact approved copy, `ابدأ الآن`, persistence, and subsequent-launch bypass.
- [ ] Run tests and confirm failure.
- [ ] Implement three onboarding pages with the existing visual identity and local persistent completion state.
- [ ] Run tests and confirm pass.
- [ ] Commit.

### Task 3: Twelve-mushaf selector and routing
**Files:** Create selector/config mapping and navigation tests.
**Interfaces:** Produces 12 exact established entries; selection returns a mushaf config consumed by the shared existing home experience.
- [ ] Write failing tests asserting exactly 12 entries, exact names/order from v1.0.4, route into full mushaf home, and back-to-selector behavior.
- [ ] Run tests and confirm failure.
- [ ] Implement RTL selector with logo, `سلسلة قرآني`, `اختر المصحف`, and 12 cards.
- [ ] Wire selected config into the existing full mushaf home/navigation flow.
- [ ] Run tests and confirm pass.
- [ ] Commit.

### Task 4: Content bundle integration
**Files:** Unified content manifest/build script plus integrity tests.
**Interfaces:** Consumes the 12 original project content bundles; produces local per-mushaf asset mappings.
- [ ] Write failing integrity checks for all required original PDF/section assets and per-mushaf mappings.
- [ ] Run checks and confirm failure before integration.
- [ ] Package/copy the existing approved assets into the unified build without downloading substitutes.
- [ ] Verify all 12 mappings and offline availability.
- [ ] Commit.

### Task 5: Preserve v1.0.4 reader/search behavior
**Files:** Reuse existing search/reader services; add unified regression tests only where routing/config integration requires it.
**Interfaces:** Selected mushaf config feeds existing reader/search; exact index remains 6236 unique verses.
- [ ] Add regression tests for 6236 unique verses, full verse text, no OCR excerpt regression, correct `mushafPage`, zoom, RTL and section navigation.
- [ ] Run tests against unified app.
- [ ] Make only integration fixes required for selected-mushaf context.
- [ ] Re-run all search/UI regression checks.
- [ ] Commit.

### Task 6: CI build, APK verification and release
**Files:** Create a separate GitHub Actions workflow/release path for the unified app.
**Interfaces:** Produces one installable APK and checksum in a release separate from `quran-series-v1.0.4-exact-ayah-search`.
- [ ] Add CI verification for package ID, launcher name, onboarding copy/state tests, exactly 12 selector entries, asset integrity, and 6236-verse index.
- [ ] Build one release APK.
- [ ] Inspect APK metadata and ensure it can coexist with standalone apps.
- [ ] Publish a separate unified-app GitHub Release with APK + SHA256 checksum.
- [ ] Verify release assets are downloadable and report the direct APK link.
