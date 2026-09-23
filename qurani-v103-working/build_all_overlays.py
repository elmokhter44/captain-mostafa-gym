#!/usr/bin/env python3
from pathlib import Path
import sys, os, re, json, subprocess, zipfile, hashlib, shutil, html

root=Path(sys.argv[1]).resolve()
base_apk=Path(sys.argv[2]).resolve()
apps_path=Path(sys.argv[3]).resolve()
outroot=Path(sys.argv[4]).resolve()
apps=json.loads(apps_path.read_text(encoding='utf-8'))
outroot.mkdir(parents=True,exist_ok=True)
(outroot/'overlays').mkdir(exist_ok=True)

build_gradle_template=(root/'android/app/build.gradle').read_text(encoding='utf-8')
strings_template=(root/'android/app/src/main/res/values/strings.xml').read_text(encoding='utf-8')
app_json_template=json.loads((root/'app.json').read_text(encoding='utf-8'))


def sha256_bytes(b: bytes): return hashlib.sha256(b).hexdigest()
def sha256_file(p: Path):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def write_sections(a):
    def q(s): return json.dumps(s,ensure_ascii=False)
    text=f'''export type SectionId =\n  | 'quran'\n  | 'reading'\n  | 'index'\n  | 'dua'\n  | 'waqf-symbols'\n  | 'furati-intro'\n  | 'usul';\n\nexport type SectionSeed = Readonly<{{\n  id: SectionId;\n  title: string;\n  subtitle: string;\n  sourceStartPage: number;\n  sourceEndPage: number;\n  assetName: string;\n  featured?: boolean;\n}}>;\n\nexport const SECTIONS: readonly SectionSeed[] = [\n  {{id: 'quran', title: 'المصحف', subtitle: '', sourceStartPage: 5, sourceEndPage: 608, assetName: 'quran.pdf', featured: true}},\n  {{id: 'reading', title: {q(a['reading'])}, subtitle: '', sourceStartPage: 1, sourceEndPage: 4, assetName: 'reading.pdf'}},\n  {{id: 'index', title: 'الفهرس', subtitle: '', sourceStartPage: 609, sourceEndPage: 610, assetName: 'quran_index.pdf'}},\n  {{id: 'dua', title: 'الدعاء', subtitle: '', sourceStartPage: 611, sourceEndPage: 611, assetName: 'dua.pdf'}},\n  {{id: 'waqf-symbols', title: 'علامات الوقف ومصطلحات الضبط ودلالات الرمز والترميز اللوني للقراءات العشر في مصاحف السلسلة الفراتية', subtitle: '', sourceStartPage: 612, sourceEndPage: 616, assetName: 'waqf_symbols.pdf'}},\n  {{id: 'furati-intro', title: 'من بين يدي السلسلة الفراتية', subtitle: '', sourceStartPage: 617, sourceEndPage: 620, assetName: 'furati_intro.pdf'}},\n  {{id: 'usul', title: {q(a['usul'])}, subtitle: '', sourceStartPage: 621, sourceEndPage: {a['usulEnd']}, assetName: 'usul.pdf'}},\n] as const;\n\nexport function sectionPageCount(section: SectionSeed): number {{\n  return section.sourceEndPage - section.sourceStartPage + 1;\n}}\n'''
    (root/'src/data/sections.ts').write_text(text,encoding='utf-8')

def write_home(a):
    title=a['title']
    text=f'''import React, {{useCallback, useState}} from 'react';
import {{Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions}} from 'react-native';
import {{useFocusEffect, useNavigation}} from '@react-navigation/native';
import type {{NativeStackNavigationProp}} from '@react-navigation/native-stack';
import type {{RootStackParamList}} from '../../app/navigation';
import {{COLORS, RADIUS, SHADOW, SPACING}} from '../../app/theme';
import {{SECTIONS}} from '../../data/sections';
import {{useAppServices}} from '../../app/AppServicesContext';
import {{buildHomeCards}} from './homeModel';
import {{ContinueReadingCard}} from './ContinueReadingCard';
import {{SectionCard}} from './SectionCard';

export function HomeScreen(): React.JSX.Element {{
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const services = useAppServices();
  const {{width}} = useWindowDimensions();
  const [lastPage, setLastPage] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {{ setLastPage(services.progress.get('quran')?.logicalPage ?? null); }}, [services]));

  const horizontal = SPACING.lg;
  const gap = SPACING.md;
  const contentWidth = Math.max(0, width - horizontal * 2);
  const twoColumns = width >= 380;
  const cardWidth = twoColumns ? (contentWidth - gap) / 2 : contentWidth;
  const cards = buildHomeCards(SECTIONS);
  const featured = cards[0]!;
  const rest = cards.slice(1);

  const openSection = (id: string) => {{ if (id === 'index') navigation.navigate('Index'); else navigation.navigate('Reader', {{sectionId: id}}); }};

  return (
    <ScrollView style={{styles.screen}} contentContainerStyle={{styles.content}} showsVerticalScrollIndicator={{false}}>
      <View style={{styles.hero}}>
        <View style={{styles.heroGlow}} />
        <Image source={{require('../../../assets/branding/qurani-icon.png')}} style={{styles.logo}} resizeMode="cover" />
        <View style={{styles.heroText}}>
          <Text style={{styles.appName}}>قرآني</Text>
          <Text style={{styles.tagline}}>{title}</Text>
          <Text style={{styles.subtag}}>يعمل بالكامل دون إنترنت</Text>
        </View>
      </View>

      <Pressable accessibilityLabel="ابحث عن سورة أو آية" onPress={{() => navigation.navigate('Search')}} style={{({{pressed}}) => [styles.search, pressed && {{opacity: 0.85}}]}}>
        <View style={{styles.searchIcon}}><Text style={{styles.searchGlyph}}>⌕</Text></View>
        <Text style={{styles.searchText}}>ابحث عن سورة أو آية</Text>
        <Text style={{styles.searchHint}}>بحث مباشر</Text>
      </Pressable>

      {{lastPage ? <ContinueReadingCard page={{lastPage}} onPress={{() => navigation.navigate('Reader', {{sectionId: 'quran', logicalPage: lastPage}})}} /> : null}}

      <Text style={{styles.sectionHeading}}>ابدأ القراءة</Text>
      <Pressable accessibilityLabel="فتح المصحف" onPress={{() => openSection(featured.id)}} style={{({{pressed}}) => [styles.featured, pressed && {{opacity: 0.9}}]}}>
        <View style={{styles.featuredDecor}}><Text style={{styles.featuredDecorText}}>۞</Text></View>
        <View style={{{{flex: 1}}}}>
          <Text style={{styles.featuredEyebrow}}>المصحف الشريف</Text>
          <Text style={{styles.featuredTitle}}>{{featured.title}}</Text>
          <View style={{styles.featuredPill}}><Text style={{styles.featuredPillText}}>604 صفحة</Text></View>
        </View>
        <View style={{styles.featuredArrow}}><Text style={{styles.featuredArrowText}}>‹</Text></View>
      </Pressable>

      <Text style={{styles.sectionHeading}}>الأقسام والشروح</Text>
      <View style={{[styles.grid, {{gap}}]}}>
        {{rest.map(section => <SectionCard key={{section.id}} section={{section}} width={{cardWidth}} onPress={{() => openSection(section.id)}} />)}}
      </View>
      <Text style={{styles.footer}}>جميع الصفحات من النسخة الأصلية المحفوظة داخل التطبيق</Text>
    </ScrollView>
  );
}}

const styles = StyleSheet.create({{
  screen: {{flex: 1, backgroundColor: COLORS.ivory}},
  content: {{paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 48}},
  hero: {{...SHADOW, overflow: 'hidden', minHeight: 176, backgroundColor: COLORS.emerald900, borderRadius: RADIUS.hero, padding: SPACING.lg, flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold700}},
  heroGlow: {{position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#0B684B', opacity: 0.65, left: -50, top: -70}},
  logo: {{width: 96, height: 96, borderRadius: 24, borderWidth: 1, borderColor: COLORS.gold300}},
  heroText: {{flex: 1, paddingRight: SPACING.lg}},
  appName: {{color: COLORS.gold300, fontSize: 28, lineHeight: 36, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl'}},
  tagline: {{color: COLORS.white, fontSize: 13, lineHeight: 21, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', marginTop: 2}},
  subtag: {{color: '#D7E8E1', fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', marginTop: 4}},
  search: {{...SHADOW, minHeight: 58, marginTop: SPACING.lg, borderRadius: RADIUS.card, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: SPACING.md}},
  searchIcon: {{width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.emerald100, alignItems: 'center', justifyContent: 'center'}},
  searchGlyph: {{color: COLORS.emerald900, fontSize: 24, transform: [{{rotate: '-20deg'}}]}},
  searchText: {{flex: 1, color: COLORS.ink, fontSize: 16, fontWeight: '700', textAlign: 'right', marginHorizontal: SPACING.md}},
  searchHint: {{color: COLORS.muted, fontSize: 11}},
  sectionHeading: {{fontSize: 18, color: COLORS.emerald950, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', marginTop: SPACING.xl, marginBottom: SPACING.md}},
  featured: {{...SHADOW, minHeight: 168, backgroundColor: COLORS.emerald950, borderRadius: RADIUS.hero, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.gold500, flexDirection: 'row-reverse', alignItems: 'center', overflow: 'hidden'}},
  featuredDecor: {{position: 'absolute', left: -18, top: -24, width: 132, height: 132, borderRadius: 66, borderWidth: 1, borderColor: '#356E5D', alignItems: 'center', justifyContent: 'center'}},
  featuredDecorText: {{fontSize: 58, color: '#1E5A46', opacity: 0.9}},
  featuredEyebrow: {{color: COLORS.gold300, fontSize: 12, fontWeight: '800', textAlign: 'right'}},
  featuredTitle: {{color: COLORS.white, fontSize: 25, lineHeight: 34, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', marginTop: 4}},
  featuredPill: {{alignSelf: 'flex-end', marginTop: SPACING.md, backgroundColor: '#114E3B', borderWidth: 1, borderColor: '#3E7765', borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10}},
  featuredPillText: {{color: COLORS.gold300, fontSize: 11, fontWeight: '700'}},
  featuredArrow: {{width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.gold500, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md}},
  featuredArrowText: {{color: COLORS.emerald950, fontSize: 32, lineHeight: 34, fontWeight: '500'}},
  grid: {{flexDirection: 'row-reverse', flexWrap: 'wrap'}},
  footer: {{color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: SPACING.xl, writingDirection: 'rtl'}},
}});
'''
    (root/'src/features/home/HomeScreen.tsx').write_text(text,encoding='utf-8')

def apply_app(a):
    assert a['total']==620+(a['usulEnd']-620)
    assert 621 <= a['usulEnd']
    write_sections(a); write_home(a)
    g=re.sub(r'applicationId\s+"[^"]+"', f'applicationId "{a["package"]}"', build_gradle_template)
    g=re.sub(r'versionCode\s+\d+', 'versionCode 1', g)
    g=re.sub(r'versionName\s+"[^"]+"', 'versionName "1.0.0"', g)
    (root/'android/app/build.gradle').write_text(g,encoding='utf-8')
    c=f"export const APP_NAME = 'قرآني' as const;\nexport const PACKAGE_NAME = '{a['package']}' as const;\nexport const VERSION_NAME = '1.0.0' as const;\nexport const VERSION_CODE = 1 as const;\n"
    (root/'src/app/constants.ts').write_text(c,encoding='utf-8')
    x=re.sub(r'(<string name="app_name">).*?(</string>)', lambda m:m.group(1)+html.escape(a['title'])+m.group(2), strings_template, count=1, flags=re.S)
    (root/'android/app/src/main/res/values/strings.xml').write_text(x,encoding='utf-8')
    d=dict(app_json_template); d['displayName']=a['title']; (root/'app.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def zmap(path: Path):
    with zipfile.ZipFile(path,'r') as z:
        return {i.filename:z.read(i.filename) for i in z.infolist() if not i.is_dir()}

def ignored(name): return name.startswith('META-INF/') or name.startswith('assets/pdf/')

base=zmap(base_apk)
base_filtered={k:v for k,v in base.items() if not ignored(k)}
base_lib={k:v for k,v in base.items() if k.startswith('lib/')}
base_sha=sha256_file(base_apk)
reports=[]

for idx,a in enumerate(apps,1):
    print(f'=== [{idx}/{len(apps)}] {a["slug"]} ===', flush=True)
    apply_app(a)
    # Fast per-app contract validation before build.
    sec=(root/'src/data/sections.ts').read_text(encoding='utf-8')
    for needle in [a['reading'],a['usul'],"sourceStartPage: 5, sourceEndPage: 608",f"sourceStartPage: 621, sourceEndPage: {a['usulEnd']}"]:
        assert needle in sec, (a['slug'],needle)
    home=(root/'src/features/home/HomeScreen.tsx').read_text(encoding='utf-8'); assert a['title'] in home

    subprocess.run(['./gradlew','assembleRelease','--stacktrace','--no-daemon'], cwd=root/'android', check=True)
    apk=root/'android/app/build/outputs/apk/release/app-release.apk'
    assert apk.is_file() and apk.stat().st_size>0
    aapt=str(Path(os.environ['ANDROID_HOME'])/'build-tools/36.0.0/aapt')
    badging=subprocess.check_output([aapt,'dump','badging',str(apk)],text=True,errors='replace')
    expected=f"package: name='{a['package']}' versionCode='1' versionName='1.0.0'"
    badging_ok=expected in badging
    if not badging_ok: raise RuntimeError(f'badging mismatch for {a["slug"]}: {badging.splitlines()[0] if badging else "empty"}')

    sk=zmap(apk); skf={k:v for k,v in sk.items() if not ignored(k)}
    changed=sorted(k for k,v in skf.items() if base_filtered.get(k)!=v)
    deleted=sorted(k for k in base_filtered if k not in skf)
    added=sorted(k for k in skf if k not in base_filtered)
    od=outroot/'overlays'/a['slug']/'files'; od.mkdir(parents=True,exist_ok=True)
    for name in changed:
        p=od/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(skf[name])
    manifest={'slug':a['slug'],'package':a['package'],'title':a['title'],'versionCode':1,'versionName':'1.0.0','baseApkSha256':base_sha,
              'skeletonSha256':sha256_file(apk),'changed':changed,'deleted':deleted,'added':added,
              'files':{n:{'sha256':sha256_bytes(skf[n]),'bytes':len(skf[n])} for n in changed}}
    (outroot/'overlays'/a['slug']/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    reconstructed=dict(base_filtered)
    for n in deleted: reconstructed.pop(n,None)
    for n in changed: reconstructed[n]=skf[n]
    reconstruct_ok=(set(reconstructed)==set(skf) and all(reconstructed[n]==skf[n] for n in skf))
    sk_lib={k:v for k,v in sk.items() if k.startswith('lib/')}
    libs_ok=(set(base_lib)==set(sk_lib) and all(base_lib[n]==sk_lib[n] for n in base_lib))
    report={'slug':a['slug'],'package':a['package'],'title':a['title'],'versionCode':1,'versionName':'1.0.0','badgingOk':badging_ok,
            'nativeLibsIdenticalToBase':libs_ok,'overlayReconstructsSkeleton':reconstruct_ok,'changedEntries':changed,'deletedEntries':deleted,
            'overlayBytes':sum(len(skf[n]) for n in changed),'skeletonBytes':apk.stat().st_size,'skeletonSha256':sha256_file(apk)}
    reports.append(report)
    print(json.dumps(report,ensure_ascii=False),flush=True)

(outroot/'build-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(outroot/'apps.json').write_text(json.dumps(apps,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('all 12 overlays built', flush=True)
