let activeMushafId = 'abuamr';

export function setActiveMushafId(id: string): void {
  activeMushafId = id;
}

export function getActiveMushafId(): string {
  return activeMushafId;
}

export function scopedPdfAsset(assetName: string): string {
  const normalized = assetName.replace(/^\/+/, '');
  const parts = normalized.split('/');
  if (parts[0] === activeMushafId) return normalized;
  const file = parts.pop() ?? normalized;
  const dir = parts.length ? parts.join('/') + '/' : '';
  return `${activeMushafId}/${dir}${activeMushafId}-${file}`;
}
