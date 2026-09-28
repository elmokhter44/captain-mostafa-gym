let activeMushafId = 'abuamr';

export function setActiveMushafId(id: string): void {
  activeMushafId = id;
}

export function getActiveMushafId(): string {
  return activeMushafId;
}

export function scopedPdfAsset(assetName: string): string {
  if (assetName.includes('/')) return assetName;
  return `${activeMushafId}/${assetName}`;
}
