export type SectionId =
  | 'intro'
  | 'warsh-summary'
  | 'warsh-lines'
  | 'quran'
  | 'index'
  | 'warsh-usul'
  | 'qalun-usul'
  | 'handwritten';

export type SectionSeed = Readonly<{
  id: SectionId;
  title: string;
  subtitle: string;
  sourceStartPage: number;
  sourceEndPage: number;
  assetName: string;
  featured?: boolean;
}>;

export const SECTIONS: readonly SectionSeed[] = [
  {id: 'intro', title: 'مقدمة', subtitle: 'التعريف بالمصحف وطريقة الاستفادة منه', sourceStartPage: 1, sourceEndPage: 5, assetName: 'intro.pdf'},
  {id: 'warsh-summary', title: 'شرح مختصر أصول الإمام ورش', subtitle: 'ملخص مبسط لأصول القراءة', sourceStartPage: 6, sourceEndPage: 9, assetName: 'warsh_summary.pdf'},
  {id: 'warsh-lines', title: 'شرح استخدامات الخطوط لاختلافات ورش', subtitle: 'دليل العلامات والخطوط داخل المصحف', sourceStartPage: 10, sourceEndPage: 12, assetName: 'warsh_lines_guide.pdf'},
  {id: 'quran', title: 'المصحف كامل', subtitle: 'المصحف المعلم بقراءة الإمام نافع – ورش وقالون', sourceStartPage: 13, sourceEndPage: 616, assetName: 'quran.pdf', featured: true},
  {id: 'index', title: 'تعريف وفهرس المصحف', subtitle: 'الفهرس الأصلي مع انتقال مباشر للسور', sourceStartPage: 617, sourceEndPage: 622, assetName: 'quran_index.pdf'},
  {id: 'warsh-usul', title: 'أصول قراءة الإمام نافع برواية ورش', subtitle: 'الأصول كما وردت في المصدر', sourceStartPage: 623, sourceEndPage: 638, assetName: 'warsh_usul.pdf'},
  {id: 'qalun-usul', title: 'أصول قراءة الإمام نافع برواية قالون', subtitle: 'يشمل الصفحات 639 إلى 649', sourceStartPage: 639, sourceEndPage: 649, assetName: 'qalun_usul.pdf'},
  {id: 'handwritten', title: 'أصول وفروش ورش وقالون بخط اليد', subtitle: 'أصول وفروش قراءة الإمام نافع المدني', sourceStartPage: 650, sourceEndPage: 681, assetName: 'handwritten_warsh_qalun.pdf'},
] as const;

export function sectionPageCount(section: SectionSeed): number {
  return section.sourceEndPage - section.sourceStartPage + 1;
}
