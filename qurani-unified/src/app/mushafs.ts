import type {MushafEntry} from './UnifiedSeriesGate';

export const UNIFIED_MUSHAF_IDS = ['abuamr','ibnamir','ibnkathir','khalafhamza','alkisai','khalladhamza','abujaafar','yaqub','khalaf10','asim','warshazraq','qalunqasr'] as const;
export const makeMushafEntries = (titles: string[]): MushafEntry[] => {
  if (titles.length !== UNIFIED_MUSHAF_IDS.length) throw new Error(`Expected 12 mushaf titles, got ${titles.length}`);
  return UNIFIED_MUSHAF_IDS.map((id,index)=>({id,title:titles[index]??`مصحف ${index+1}`}));
};
