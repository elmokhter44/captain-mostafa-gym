const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeArabic(input: string): string {
  return input
    .trim()
    .replace(/ـ/g, '')
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/^سورة\s+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}
