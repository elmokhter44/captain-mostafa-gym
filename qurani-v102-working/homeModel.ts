import type {SectionSeed} from '../../data/sections.ts';

export function buildHomeCards(sections: readonly SectionSeed[]): readonly SectionSeed[] {
  const quran = sections.find(section => section.id === 'quran');
  const rest = sections.filter(section => section.id !== 'quran');
  return quran ? [quran, ...rest] : [...sections];
}
