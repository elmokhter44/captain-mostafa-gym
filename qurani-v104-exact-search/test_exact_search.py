#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
assert len(sys.argv) == 2, 'usage: test_exact_search.py /path/to/extracted-verses.json'
rows = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
assert len(rows) == 6236, len(rows)
assert len({r['surahNumber'] for r in rows}) == 114
assert min(r['mushafPage'] for r in rows) == 1
assert max(r['mushafPage'] for r in rows) == 604
assert len({(r['surahNumber'], r['ayahNumber']) for r in rows}) == 6236
by_key = {(r['surahNumber'], r['ayahNumber']): r for r in rows}
assert by_key[(1,2)] == {'surahNumber':1,'ayahNumber':2,'mushafPage':1,'text':'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'}
assert by_key[(2,6)]['mushafPage'] == 3
assert by_key[(114,6)] == {'surahNumber':114,'ayahNumber':6,'mushafPage':604,'text':'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ'}

service = (ROOT / 'VerseSearchService.ts').read_text(encoding='utf-8')
search = (ROOT / 'SearchScreen.tsx').read_text(encoding='utf-8')
for needle in ['surahNumber: number', 'ayahNumber: number', 'normalizeSearchText', 'mushafPage: number']:
    assert needle in service, needle
assert 'buildMatchExcerpt' not in service, 'results must preserve exact verse text; no OCR excerpting'
assert '.map(item => item.entry)' in service.replace('\n',' '), 'search must return exact stored verse records'
assert 'numberOfLines={3}' not in search, 'full verse must not be visually truncated'
assert 'آية {item.ayahNumber}' in search, 'result must show ayah number context'
print('EXACT_SEARCH_CONTRACT_OK=1')
