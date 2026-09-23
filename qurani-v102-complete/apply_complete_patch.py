#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()

def replace_once(path: Path, old: str, new: str):
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'PATCH_PATTERN_MISSING: {path}: {old[:80]}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

reader = root / 'src/features/reader/ReaderScreen.tsx'
replace_once(reader,
    "const GLYPHS:Record<string,string>={reading:'◈',dua:'🤲','waqf-symbols':'۞','furati-intro':'📖',usul:'▤',index:'☷'};",
    "const GLYPHS:Record<string,string>={reading:'◈',dua:'◈','waqf-symbols':'۞','furati-intro':'📖',usul:'▤',index:'☷'};")
replace_once(reader, "  const [theme,setTheme]=useState<'light'|'dark'>(services.settings.get().theme==='dark'?'dark':'light');\n", "")
replace_once(reader, "  const toggleTheme=()=>{const next=theme==='dark'?'light':'dark';setTheme(next);services.settings.setTheme(next);setMenuMode(null);};\n", "")
replace_once(reader, "  const dark=theme==='dark';", "  const dark=true;")
replace_once(reader, "    {key:'theme',label:dark?'الوضع الفاتح':'الوضع الداكن',glyph:dark?'☀':'☾',action:toggleTheme},\n", "")

section_card = root / 'src/features/home/SectionCard.tsx'
replace_once(section_card, "  dua: '🤲',", "  dua: '◆',")

app = root / 'src/app/App.tsx'
replace_once(app,
    "<Image source={require('../../assets/branding/qurani-icon.png')} style={styles.logo} />",
    "<Image source={require('../../assets/branding/qurani-icon.png')} style={styles.logo} resizeMode=\"contain\" />")

print('COMPLETE_UI_PATCH_OK=1')
