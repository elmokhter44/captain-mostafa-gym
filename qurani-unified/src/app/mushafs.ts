import type {MushafEntry} from './UnifiedSeriesGate';

export const UNIFIED_MUSHAF_IDS = ['nafi','ibn-kathir','abu-amr','ibn-amir','asim','hamza','kisai','abu-jafar','yaqub','khalaf','series-11','series-12'] as const;
export const makeMushafEntries = (titles: string[]): MushafEntry[] => {
  if (titles.length !== UNIFIED_MUSHAF_IDS.length) throw new Error(`Expected 12 mushaf titles, got ${titles.length}`);
  return UNIFIED_MUSHAF_IDS.map((id, index) => ({id, title: titles[index] ?? `مصحف ${index + 1}`}));
};
