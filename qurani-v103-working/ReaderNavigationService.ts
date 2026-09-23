export type ReaderTarget = Readonly<{sectionId: string; logicalPage?: number}>;

export function toSurahTarget(surah: {mushafStartPage: number}): ReaderTarget {
  if (!Number.isInteger(surah.mushafStartPage) || surah.mushafStartPage < 1 || surah.mushafStartPage > 604) {
    throw new RangeError('Invalid surah start page');
  }
  return {sectionId: 'quran', logicalPage: surah.mushafStartPage};
}
