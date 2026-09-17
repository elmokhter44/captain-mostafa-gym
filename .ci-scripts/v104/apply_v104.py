from pathlib import Path

def r(f,a,b):
    p=Path(f); s=p.read_text(); assert a in s,(f,a); p.write_text(s.replace(a,b))

r('android/app/build.gradle','versionCode 2\n        versionName "1.0.1"','versionCode 5\n        versionName "1.0.4"')
Path('android/app/src/main/res/values/strings.xml').write_text('<resources><string name="app_name">المصحف المعلم\\nبقراءة الامام نافع</string></resources>\n')
Path('app.json').write_text('{"name":"Qurani","displayName":"المصحف المعلم بقراءة الامام نافع"}\n')
f='src/data/sections.ts'
r(f,"assetName: 'warsh_summary.pdf'","assetName: 'warsh_summary_v104.pdf'")
r(f,"subtitle: 'الأصول كما وردت في المصدر'","subtitle: 'الأصول كما وردت في مصاحف السلسلة الفراتية'")
r(f,"subtitle: 'يشمل الصفحات 639 إلى 649'","subtitle: 'الأصول كما وردت في مصاحف السلسلة الفراتية'")
r(f,"title: 'أصول وفروش ورش وقالون بخط اليد', subtitle: 'أصول وفروش قراءة الإمام نافع المدني'","title: 'أصول وفروش قراءة الامام نافع المدني برواية (ورش وقالون) بخط الايد', subtitle: ''")
p=Path('src/features/home/SectionCard.tsx'); s=p.read_text(); s=s.replace('  return (','  const isHandwritten = section.id === \'handwritten\';\n  return (',1).replace("[styles.card, {width}, pressed && styles.pressed]","[styles.card, {width}, isHandwritten && styles.handwrittenCard, pressed && styles.pressed]").replace('<Text style={styles.title}>{section.title}</Text>\n        <Text style={styles.subtitle} numberOfLines={2}>{section.subtitle}</Text>', '<Text style={[styles.title, isHandwritten && styles.handwrittenTitle]}>{section.title}</Text>\n        {section.subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{section.subtitle}</Text> : null}').replace('  pressed:', '  handwrittenCard: {minHeight: 168},\n  handwrittenTitle: {fontSize: 17, lineHeight: 27},\n  pressed:'); p.write_text(s)
p=Path('src/features/index/IndexScreen.tsx'); s=p.read_text().replace("import React, {useMemo} from 'react';","import React, {useMemo, useState} from 'react';").replace("import {PdfPage} from '../reader/PdfPage';","import {ZoomablePdfPage} from '../reader/ZoomablePdfPage';\nimport {pageWidthForScreen} from '../reader/zoomModel';").replace('  const pageWidth = Math.max(280, screenWidth - SPACING.md * 2);','  const [pageZoomed, setPageZoomed] = useState(false);\n  const pageWidth = pageWidthForScreen(screenWidth);').replace('<PdfPage assetName="quran_index.pdf" pageIndex={index} width={pageWidth} overlay={overlaysFor(item)} />','<ZoomablePdfPage assetName="quran_index.pdf" pageIndex={index} width={pageWidth} overlay={overlaysFor(item)} onZoomStateChange={setPageZoomed} />').replace('        windowSize={4}\n','        windowSize={4}\n        scrollEnabled={!pageZoomed}\n'); p.write_text(s)
p=Path('android/app/build.gradle'); s=p.read_text().replace('targetSdkVersion rootProject.ext.targetSdkVersion','targetSdkVersion rootProject.ext.targetSdkVersion\n        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"').replace('dependencies {','dependencies {\n    androidTestImplementation("androidx.test:runner:1.6.2")\n    androidTestImplementation("androidx.test.ext:junit:1.2.1")\n    androidTestImplementation("junit:junit:4.13.2")'); p.write_text(s)
