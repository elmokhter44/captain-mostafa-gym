# v1.0.1 acceptance tests (written before implementation)

1. Viewer: Quran, index and every section route through the same zoomable PDF viewer; pinch zoom enabled.
2. Layout: PDF page uses full available reader width and height without extra top/bottom padding; single tap toggles popup menu.
3. Index: only general-source PDF pages 609-610 are used for the index.
4. Index interaction: tapping a surah name routes to that surah in the Quran viewer.
5. Popup/More: section icons open the local bundled section immediately; no remote fetch or intermediate black/loading screen.
6. Update compatibility: versionName=1.0.1, versionCode=2, package IDs unchanged, same signing key.
7. Release validation: unzip test, zipalign -c -P 16, apksigner verify with v1 and v2 true for all 12 APKs.
