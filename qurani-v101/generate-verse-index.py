#!/usr/bin/env python3
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('Usage: generate-verse-index.py <alquran-cloud-json> <output-ts>')

source = Path(sys.argv[1])
out = Path(sys.argv[2])

EXPECTED_SURAH_STARTS = {
    1: (1, 'الفاتحة'), 2: (2, 'البقرة'), 3: (50, 'آل عمران'), 4: (77, 'النساء'),
    5: (106, 'المائدة'), 6: (128, 'الأنعام'), 7: (151, 'الأعراف'), 8: (177, 'الأنفال'),
    9: (187, 'التوبة'), 10: (208, 'يونس'), 11: (221, 'هود'), 12: (235, 'يوسف'),
    13: (249, 'الرعد'), 14: (255, 'إبراهيم'), 15: (262, 'الحجر'), 16: (267, 'النحل'),
    17: (282, 'الإسراء'), 18: (293, 'الكهف'), 19: (305, 'مريم'), 20: (312, 'طه'),
    21: (322, 'الأنبياء'), 22: (332, 'الحج'), 23: (342, 'المؤمنون'), 24: (350, 'النور'),
    25: (359, 'الفرقان'), 26: (367, 'الشعراء'), 27: (377, 'النمل'), 28: (385, 'القصص'),
    29: (396, 'العنكبوت'), 30: (404, 'الروم'), 31: (411, 'لقمان'), 32: (415, 'السجدة'),
    33: (418, 'الأحزاب'), 34: (428, 'سبأ'), 35: (434, 'فاطر'), 36: (440, 'يس'),
    37: (446, 'الصافات'), 38: (453, 'ص'), 39: (458, 'الزمر'), 40: (467, 'غافر'),
    41: (477, 'فصلت'), 42: (483, 'الشورى'), 43: (489, 'الزخرف'), 44: (496, 'الدخان'),
    45: (499, 'الجاثية'), 46: (502, 'الأحقاف'), 47: (507, 'محمد'), 48: (511, 'الفتح'),
    49: (515, 'الحجرات'), 50: (518, 'ق'), 51: (520, 'الذاريات'), 52: (523, 'الطور'),
    53: (526, 'النجم'), 54: (528, 'القمر'), 55: (531, 'الرحمن'), 56: (534, 'الواقعة'),
    57: (537, 'الحديد'), 58: (542, 'المجادلة'), 59: (545, 'الحشر'), 60: (549, 'الممتحنة'),
    61: (551, 'الصف'), 62: (553, 'الجمعة'), 63: (554, 'المنافقون'), 64: (556, 'التغابن'),
    65: (558, 'الطلاق'), 66: (560, 'التحريم'), 67: (562, 'الملك'), 68: (564, 'القلم'),
    69: (566, 'الحاقة'), 70: (568, 'المعارج'), 71: (570, 'نوح'), 72: (572, 'الجن'),
    73: (574, 'المزمل'), 74: (575, 'المدثر'), 75: (577, 'القيامة'), 76: (578, 'الإنسان'),
    77: (580, 'المرسلات'), 78: (582, 'النبأ'), 79: (583, 'النازعات'), 80: (585, 'عبس'),
    81: (586, 'التكوير'), 82: (587, 'الانفطار'), 83: (587, 'المطففين'), 84: (589, 'الانشقاق'),
    85: (590, 'البروج'), 86: (591, 'الطارق'), 87: (591, 'الأعلى'), 88: (592, 'الغاشية'),
    89: (593, 'الفجر'), 90: (594, 'البلد'), 91: (595, 'الشمس'), 92: (595, 'الليل'),
    93: (596, 'الضحى'), 94: (596, 'الشرح'), 95: (597, 'التين'), 96: (597, 'العلق'),
    97: (598, 'القدر'), 98: (598, 'البينة'), 99: (599, 'الزلزلة'), 100: (599, 'العاديات'),
    101: (600, 'القارعة'), 102: (600, 'التكاثر'), 103: (601, 'العصر'), 104: (601, 'الهمزة'),
    105: (601, 'الفيل'), 106: (602, 'قريش'), 107: (602, 'الماعون'), 108: (602, 'الكوثر'),
    109: (603, 'الكافرون'), 110: (603, 'النصر'), 111: (603, 'المسد'), 112: (604, 'الإخلاص'),
    113: (604, 'الفلق'), 114: (604, 'الناس'),
}

payload = json.loads(source.read_text(encoding='utf-8'))
surahs = payload.get('data', {}).get('surahs')
if not isinstance(surahs, list) or len(surahs) != 114:
    raise SystemExit('Expected 114 surahs from AlQuran Cloud')

verses = []
for surah in surahs:
    surah_number = int(surah['number'])
    ayahs = surah.get('ayahs', [])
    if not ayahs:
        raise SystemExit(f'No ayahs for surah {surah_number}')
    expected_page, expected_name = EXPECTED_SURAH_STARTS[surah_number]
    first_page = int(ayahs[0]['page'])
    if first_page != expected_page:
        raise SystemExit(
            f'Surah start page mismatch for {surah_number} {expected_name}: expected {expected_page}, got {first_page}'
        )
    for ayah in ayahs:
        page = int(ayah['page'])
        ayah_number = int(ayah['numberInSurah'])
        text = str(ayah['text']).strip()
        if not (1 <= page <= 604):
            raise SystemExit(f'Invalid mushaf page {page} for {surah_number}:{ayah_number}')
        if not text:
            raise SystemExit(f'Empty ayah text for {surah_number}:{ayah_number}')
        verses.append({
            'surahNumber': surah_number,
            'ayahNumber': ayah_number,
            'mushafPage': page,
            'text': text,
        })

if len(verses) != 6236:
    raise SystemExit(f'Expected 6236 ayahs, got {len(verses)}')
if min(v['mushafPage'] for v in verses) != 1 or max(v['mushafPage'] for v in verses) != 604:
    raise SystemExit('Verse index must cover mushaf pages 1 through 604')

out.parent.mkdir(parents=True, exist_ok=True)
compact = json.dumps(verses, ensure_ascii=False, separators=(',', ':'))
out.write_text(
    "import type {VerseSearchEntry} from '../services/VerseSearchService';\n\n"
    "// Generated at build time from AlQuran Cloud quran-uthmani metadata. Runtime use is fully offline.\n"
    f"export const VERSE_INDEX: readonly VerseSearchEntry[] = {compact};\n",
    encoding='utf-8',
)
print(f'Generated {len(verses)} ayahs; all 114 surah start pages match the app index; page range 1-604 -> {out}')
