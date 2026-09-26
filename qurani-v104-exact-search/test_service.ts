import {normalizeSearchText, searchVerses, type VerseSearchEntry} from './VerseSearchService';

const verses: readonly VerseSearchEntry[] = [
  {surahNumber: 1, ayahNumber: 2, mushafPage: 1, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'},
  {surahNumber: 2, ayahNumber: 6, mushafPage: 3, text: 'إِنَّ ٱلَّذِينَ كَفَرُوا۟ سَوَآءٌ عَلَيْهِمْ ءَأَنذَرْتَهُمْ أَمْ لَمْ تُنذِرْهُمْ لَا يُؤْمِنُونَ'},
  {surahNumber: 114, ayahNumber: 6, mushafPage: 604, text: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ'},
];

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

check(normalizeSearchText('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ') === 'الحمد لله رب العالمين', 'harakat normalization');
const fatiha = searchVerses('الحمد لله رب العالمين', verses);
check(fatiha.length === 1, 'fatiha match count');
check(fatiha[0]?.surahNumber === 1 && fatiha[0]?.ayahNumber === 2, 'fatiha identity');
check(fatiha[0]?.text === verses[0]?.text, 'must return exact stored verse, not excerpt');
const kafaru = searchVerses('الذين كفروا سواء عليهم', verses);
check(kafaru[0]?.surahNumber === 2 && kafaru[0]?.ayahNumber === 6, 'multiword flexible match');
const nas = searchVerses('الجنة والناس', verses);
check(nas[0]?.mushafPage === 604 && nas[0]?.text === verses[2]?.text, 'nas exact display');
console.log('SEARCH_SERVICE_BEHAVIOR_OK=1');
check(normalizeSearchText('ٱلصَّلَوٰةَ') === normalizeSearchText('الصلاة'), 'uthmani salat spelling normalization');
check(normalizeSearchText('أُو۟لَٰٓئِكَ') === normalizeSearchText('أولئك'), 'uthmani ulaika spelling normalization');
check(normalizeSearchText('عَلَىٰ') === normalizeSearchText('على'), 'uthmani ala spelling normalization');
console.log('UTHMANI_NORMALIZATION_OK=1');
