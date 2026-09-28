from pathlib import Path
p=Path(__file__).parent
text=(p/'src/app/UnifiedSeriesGate.tsx').read_text()
manifest=(p/'src/app/mushafs.ts').read_text()
assert text.count("title: '") >= 3
assert 'ابدأ الآن' in text
assert 'اختر المصحف' in text
assert 'AsyncStorage.setItem' in text and 'AsyncStorage.getItem' in text
assert 'mushaf-card-' in text
ids=manifest.split("UNIFIED_MUSHAF_IDS = [",1)[1].split(']',1)[0]
assert ids.count("'")//2 == 12
print('UNIFIED_UI_CONTRACT_OK')
