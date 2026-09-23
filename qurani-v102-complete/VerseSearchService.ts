import {normalizeArabic} from '../utils/arabic.ts';

export type VerseSearchEntry = Readonly<{
  mushafPage: number;
  text: string;
}>;

function normalizeSearchText(value: string): string {
  return normalizeArabic(value)
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

function tokenMatches(queryToken: string, pageToken: string): boolean {
  if (pageToken.includes(queryToken) || queryToken.includes(pageToken)) return true;
  if (queryToken.length < 3 || pageToken.length < 3) return false;
  const maxDistance = queryToken.length >= 7 ? 2 : 1;
  return distance(queryToken, pageToken, maxDistance) <= maxDistance;
}

export function searchVerses(query: string, pages: readonly VerseSearchEntry[]): readonly VerseSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];
  const queryTokens = normalizedQuery.split(' ').filter(token => token.length >= 2);
  if (!queryTokens.length) return [];

  const scored: Array<{entry: VerseSearchEntry; score: number}> = [];
  for (const entry of pages) {
    const pageText = normalizeSearchText(entry.text);
    if (!pageText) continue;
    if (pageText.includes(normalizedQuery)) {
      scored.push({entry, score: 1000 + normalizedQuery.length});
      continue;
    }
    const pageTokens = pageText.split(' ').filter(token => token.length >= 2);
    let hits = 0;
    for (const queryToken of queryTokens) {
      if (pageTokens.some(pageToken => tokenMatches(queryToken, pageToken))) hits += 1;
    }
    const needed = queryTokens.length === 1 ? 1 : Math.max(2, Math.ceil(queryTokens.length * 0.4));
    if (hits >= needed) scored.push({entry, score: hits * 100 - Math.abs(queryTokens.length - hits) * 10});
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.mushafPage - b.entry.mushafPage)
    .slice(0, 30)
    .map(item => item.entry);
}
