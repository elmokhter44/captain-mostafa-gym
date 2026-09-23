export type IndexHotspotSeed = Readonly<{
  id: string;
  indexPdfPage: 621 | 622;
  surahId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

function columnRows(
  page: 621 | 622,
  startSurah: number,
  count: number,
  x: number,
  width: number,
  yStart: number,
  yEnd: number,
): IndexHotspotSeed[] {
  const rowHeight = (yEnd - yStart) / count;
  return Array.from({length: count}, (_, i) => ({
    id: `${page}-${startSurah + i}`,
    indexPdfPage: page,
    surahId: startSurah + i,
    x,
    y: yStart + i * rowHeight,
    width,
    height: rowHeight,
  }));
}

// Coordinates are normalized against the exact A4 source page. They cover each
// surah's half-row in the two-column printed tables while leaving the title area untouched.
export const INDEX_HOTSPOTS: readonly IndexHotspotSeed[] = [
  ...columnRows(621, 1, 28, 0.445, 0.335, 0.199, 0.850),
  ...columnRows(621, 29, 28, 0.120, 0.320, 0.199, 0.850),
  ...columnRows(622, 57, 29, 0.515, 0.315, 0.199, 0.850),
  ...columnRows(622, 86, 29, 0.238, 0.272, 0.199, 0.850),
] as const;
