let activeMushafId = 'abuamr';

export function setActiveMushafId(id: string): void {
  activeMushafId = id;
}

export function getActiveMushafId(): string {
  return activeMushafId;
}

/**
 * Unified APK stores every original v1.0.4 PDF set under its own mushaf directory.
 * Reader/Index/section code continues to pass the original asset filename.
 * Always scope that filename to the currently selected mushaf.
 */
export function scopedPdfAsset(assetName: string): string {
  const normalized = assetName.replace(/^\/+/, '');
  if (normalized.startsWith(activeMushafId + '/')) return normalized;
  return `${activeMushafId}/${normalized}`;
}
