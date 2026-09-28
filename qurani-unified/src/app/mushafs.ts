import type {MushafEntry} from './UnifiedSeriesGate';

// IDs are stable app-level routing keys. Exact display names/content bindings are completed by CI from the established series manifest so no external content is introduced.
export const UNIFIED_MUSHAF_IDS = ['nafi','ibn-kathir','abu-amr','ibn-amir','asim','hamza','kisai','abu-jafar','yaqub','khalaf','series-11','series-12'] as const;
export const makeMushafEntries = (titles: string[]): MushafEntry[] => {
  if (titles.length !== 12) throw new Error(`Expected 12 mushaf titles, got ${titles.length}`);
  return titles.map((title, index) => ({id: UNIFIED_MUSHAF_IDS[index], title}));
};
