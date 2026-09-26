export type VerseSearchEntry = Readonly<{
  surahNumber: number;
  ayahNumber: number;
  mushafPage: number;
  text: string;
}>;

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g;

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\uFEFF\u200B-\u200D]/g, '')
    .replace(/\u0640/g, '')
    .replace(ARABIC_MARKS, '')
    // Uthmani dagger-alif spellings -> common searchable Arabic spellings.
    .replace(/ىٰ/g, 'ى')
    .replace(/وٰ/g, 'ا')
    .replace(/لٰئ/g, 'لئ')
    .replace(/ٰ/g, 'ا')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ء/g, '')
    .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = cur[0]!;
    for (let j = 1; j <= b.length; j += 1) {
      const v = Math.min(
        cur[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cur[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j < cur.length; j += 1) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

function tokenMatches(queryToken: string, verseToken: string): boolean {
  if (verseToken === queryToken || verseToken.includes(queryToken) || queryToken.includes(verseToken)) return true;
  if (queryToken.length < 4 || verseToken.length < 4) return false;
  const maxDistance = queryToken.length >= 8 ? 2 : 1;
  return distance(queryToken, verseToken, maxDistance) <= maxDistance;
}

function orderedHits(queryTokens: readonly string[], verseTokens: readonly string[]): number {
  let cursor = 0;
  let hits = 0;
  for (const queryToken of queryTokens) {
    let found = -1;
    for (let i = cursor; i < verseTokens.length; i += 1) {
      if (tokenMatches(queryToken, verseTokens[i]!)) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      hits += 1;
      cursor = found + 1;
    }
  }
  return hits;
}

export function searchVerses(query: string, verses: readonly VerseSearchEntry[]): readonly VerseSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const queryTokens = normalizedQuery.split(' ').filter(token => token.length >= 2);
  if (!queryTokens.length) return [];

  const scored: Array<{entry: VerseSearchEntry; score: number}> = [];
  for (const entry of verses) {
    const normalizedVerse = normalizeSearchText(entry.text);
    if (!normalizedVerse) continue;

    if (normalizedVerse.includes(normalizedQuery)) {
      const phraseStart = normalizedVerse.indexOf(normalizedQuery);
      scored.push({entry, score: 100000 + normalizedQuery.length * 100 - phraseStart});
      continue;
    }

    const verseTokens = normalizedVerse.split(' ').filter(Boolean);
    const ordered = orderedHits(queryTokens, verseTokens);
    if (ordered === queryTokens.length && queryTokens.length > 1) {
      scored.push({entry, score: 50000 + ordered * 100});
      continue;
    }

    let hits = 0;
    for (const queryToken of queryTokens) {
      if (verseTokens.some(verseToken => tokenMatches(queryToken, verseToken))) hits += 1;
    }
    const needed = queryTokens.length === 1 ? 1 : Math.max(2, Math.ceil(queryTokens.length * 0.7));
    if (hits >= needed) {
      scored.push({entry, score: hits * 1000 - (queryTokens.length - hits) * 250});
    }
  }

  return scored
    .sort((a, b) =>
      b.score - a.score ||
      a.entry.surahNumber - b.entry.surahNumber ||
      a.entry.ayahNumber - b.entry.ayahNumber,
    )
    .slice(0, 30)
    .map(item => item.entry);
}
