let activeMushafId = 'abuamr';

export function setActiveMushafId(id: string): void {
  activeMushafId = id;
  console.log('[QURANI] ACTIVE_MUSHAF=' + id);
}

export function getActiveMushafId(): string {
  return activeMushafId;
}

/**
 * The Android PDF service resolves files relative to assets/pdf/.
 * Use a unique flat filename rather than a nested directory so the native
 * renderer works consistently on Android release builds.
 */
export function scopedPdfAsset(assetName: string): string {
  const normalized = assetName.replace(/^\/+/, '');
  const scoped = `${activeMushafId}__${normalized}`;
  console.log('[QURANI] PDF_ASSET=' + scoped);
  return scoped;
}
