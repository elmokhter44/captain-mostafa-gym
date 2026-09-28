# سلسلة قرآني — Unified 12 Mushaf App Design

## Goal
Build one independent Android application named **سلسلة قرآني** that contains all 12 completed Qurani mushaf experiences while preserving the existing standalone applications unchanged.

## First-launch experience
- Android launcher shows one app named **سلسلة قرآني** using the existing Qurani logo/identity.
- Every launch starts with the existing Qurani splash/logo treatment.
- On the **first launch after installation only**, the splash is followed by a 3-page RTL Arabic onboarding flow.
- Persist a local first-launch/onboarding-completed flag. After completion, future launches skip onboarding and go directly from splash to the 12-mushaf selector.
- Onboarding remains fully offline and uses the same current Qurani colors, logo, typography direction, and calm visual identity.

### Onboarding page 1 — القرآن الكريم بقراءاته بين يديك
- Short introduction explaining that سلسلة قرآني gathers the established mushaf experiences in one application.
- Calm Qurani visual/illustration consistent with the current identity.
- **التالي** action and page indicator.

### Onboarding page 2 — مصاحف متعددة في مكان واحد
- Explain that the user can choose among the 12 included mushafs/readings and move easily between them.
- Visual treatment may use small representative mushaf cards while keeping the screen uncluttered.
- **التالي** action and page indicator.

### Onboarding page 3 — تجربة قراءة متكاملة
- Summarize the preserved features: exact ayah-text search, index, zoom, RTL paging/navigation, sections/explanations, and offline use.
- Primary CTA: **ابدأ الآن**.
- Completing this action stores the onboarding-completed flag and opens the 12-mushaf selector.

## Main selector user experience
- App opens to a new RTL Arabic selector/home screen after onboarding has been completed.
- Header shows the existing logo and **سلسلة قرآني**.
- Intro copy: **اختر المصحف**.
- The screen contains 12 cards, one for each existing v1.0.4 mushaf, using the exact established mushaf names/order.
- Tapping a card opens that mushaf's existing full home experience, not the PDF directly.
- Inside a selected mushaf, existing navigation, sections, index, exact ayah search, PDF viewer, zoom, RTL paging, and offline behavior remain unchanged.
- Back navigation behaves naturally inside the selected mushaf. Back from that mushaf's root/home returns to the 12-card selector.

## Architecture
Create a new independent unified app/package rather than nesting or launching the 12 APKs. Reuse the established application UI/runtime once and introduce a selected-mushaf configuration/content layer. Each of the 12 mushaf entries maps to its own original PDF/content assets and metadata. The standalone APK projects/releases are not modified or removed.

The first-launch onboarding is an app-level flow before the selector and must not alter any individual mushaf runtime. Its completion state is stored locally on-device and requires no account or network connection.

## Content integrity
- Original user-provided PDFs/assets remain the only source for mushaf and section content.
- Do not download or substitute Quran PDFs/content from external websites.
- Preserve v1.0.4 exact ayah search behavior and the extracted 6236-unique-ayah reference index.
- Preserve each mushaf's page mapping and section mapping.
- No OCR/page-excerpt search regression.

## Identity and packaging
- Display name: **سلسلة قرآني**.
- Use the current Qurani logo and visual identity already present in the series.
- Use a new Android package/application ID so the unified app can coexist with all 12 standalone apps.
- First unified release is built as its own version/release and must not overwrite the standalone v1.0.4 release.

## Build and verification
CI builds one installable APK for the unified application and publishes it in a separate GitHub Release. Verification must cover: successful APK build, unique package ID, launcher name, splash, exactly 3 onboarding pages, first-launch-only onboarding persistence, **ابدأ الآن** routing to selector, 12 selector entries, selector-to-mushaf routing, back-to-selector behavior, presence of all required content assets, exact-search index integrity (6236 unique verses), and preservation of v1.0.4 search implementation constraints.

## Non-goals
- No redesign of individual mushaf experiences.
- No changes to the 12 standalone v1.0.4 APKs.
- No online content dependency.
- No embedding/launching the standalone APK binaries from the unified app.
