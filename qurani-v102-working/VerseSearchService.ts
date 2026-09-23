import {normalizeArabic} from '../utils/arabic.ts';

export type VerseSearchEntry = Readonly<{
  surahNumber: number;
  ayahNumber: number;
  mushafPage: number;
  text: string;
}>;

export function searchVerses(query: string, verses: readonly VerseSearchEntry[], limit = 40): readonly VerseSearchEntry[] {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return [];
  const safeLimit = Math.max(1, Math.floor(limit));
  const out: VerseSearchEntry[] = [];
  for (const verse of verses) {
    if (normalizeArabic(verse.text).includes(normalizedQuery)) {
      out.push(verse);
      if (out.length >= safeLimit) break;
    }
  }
  return out;
}
