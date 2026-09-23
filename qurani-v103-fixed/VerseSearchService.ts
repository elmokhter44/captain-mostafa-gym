import {normalizeArabic} from '../utils/arabic.ts';

export type VerseSearchEntry = Readonly<{
  surahNumber: number;
  ayahNumber: number;
  mushafPage: number;
  text: string;
}>;

function normalizeSearchText(value:string):string{
  return normalizeArabic(value).replace(/\s+/g,' ').trim();
}

export function searchVerses(query: string, verses: readonly VerseSearchEntry[]): readonly VerseSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  const queryTokens=normalizedQuery.split(' ').filter(Boolean);
  const out:VerseSearchEntry[]=[];
  for(const verse of verses){
    const normalizedVerse=normalizeSearchText(verse.text);
    if(normalizedVerse.includes(normalizedQuery)||queryTokens.every(token=>normalizedVerse.includes(token))){
      out.push(verse);
    }
  }
  return out;
}
