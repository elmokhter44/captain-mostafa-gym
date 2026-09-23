#!/usr/bin/env python3
from pathlib import Path
import sys, re
root=Path(sys.argv[1]).resolve()

def write(rel, text):
    p=root/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text,encoding='utf-8')

write('src/features/reader/readerModel.ts', r'''type PageSection = Readonly<{sourceStartPage: number; sourceEndPage: number}>;

export type ReaderPageMeta = Readonly<{
  logicalPage: number;
  sourcePdfPage: number;
  displayPage: number;
  totalPages: number;
}>;

export function readerPageMeta(section: PageSection, logicalPage: number): ReaderPageMeta {
  const totalPages = section.sourceEndPage - section.sourceStartPage + 1;
  if (!Number.isInteger(logicalPage) || logicalPage < 1 || logicalPage > totalPages) throw new RangeError('Invalid logical page');
  return {logicalPage, sourcePdfPage: section.sourceStartPage + logicalPage - 1, displayPage: logicalPage, totalPages};
}

export function pageFromHorizontalOffset(offsetX: number, pageWidth: number, totalPages: number): number {
  if (!Number.isFinite(offsetX) || !Number.isFinite(pageWidth) || pageWidth <= 0 || !Number.isInteger(totalPages) || totalPages < 1) {
    throw new RangeError('Invalid horizontal paging input');
  }
  const index = Math.round(Math.max(0, offsetX) / pageWidth);
  return Math.min(totalPages, Math.max(1, index + 1));
}
''')

write('src/repositories/SettingsRepository.ts', r'''import Realm from 'realm';

export class SettingsRepository {
  constructor(private readonly realm: Realm) {}
  get(): {lastSectionId?: string; theme: string} {
    const v = this.realm.objectForPrimaryKey<any>('AppSettings', 'main');
    return {lastSectionId: v?.lastSectionId ?? undefined, theme: v?.theme ?? 'light'};
  }
  setLastSection(sectionId: string): void {
    this.realm.write(() => this.realm.create('AppSettings', {id: 'main', lastSectionId: sectionId, theme: this.get().theme}, Realm.UpdateMode.Modified));
  }
  setTheme(theme: 'light' | 'dark'): void {
    const current = this.get();
    this.realm.write(() => this.realm.create('AppSettings', {id: 'main', lastSectionId: current.lastSectionId ?? null, theme}, Realm.UpdateMode.Modified));
  }
}
''')

write('src/features/home/SectionCard.tsx', r'''import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {SectionSeed} from '../../data/sections';
import {COLORS, RADIUS, SHADOW, SPACING, TOUCH_TARGET} from '../../app/theme';

export function SectionCard({section, width, onPress}: {section: SectionSeed; width: number; onPress: () => void}): React.JSX.Element {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`فتح ${section.title}`} style={({pressed}) => [styles.card, {width}, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.marker}><Text style={styles.markerText}>◆</Text></View>
      <View style={styles.textWrap}><Text style={styles.title}>{section.title}</Text></View>
      <Text style={styles.arrow}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {...SHADOW, minHeight: 124, backgroundColor: COLORS.paper, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.line, padding: SPACING.lg, justifyContent: 'space-between'},
  pressed: {opacity: 0.82, transform: [{scale: 0.985}]},
  marker: {width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.emerald100, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end'},
  markerText: {color: COLORS.gold700, fontSize: 12},
  textWrap: {marginTop: SPACING.md, paddingLeft: 28},
  title: {fontSize: 16, lineHeight: 24, color: COLORS.emerald950, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl'},
  arrow: {position: 'absolute', left: SPACING.md, bottom: SPACING.sm, color: COLORS.gold700, fontSize: 26, minWidth: TOUCH_TARGET, textAlign: 'center'},
});
''')

write('src/features/reader/PdfPage.tsx', r'''import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, Text, View, PixelRatio} from 'react-native';
import {useAppServices} from '../../app/AppServicesContext';
import {A4_ASPECT, COLORS, RADIUS, SHADOW, SPACING} from '../../app/theme';

export function PdfPage({assetName, pageIndex, width, overlay}: {assetName: string; pageIndex: number; width: number; overlay?: React.ReactNode}): React.JSX.Element {
  const {pdf} = useAppServices();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const height = width * A4_ASPECT;

  useEffect(() => {
    let active = true;
    setUri(null); setError(false);
    const renderWidth = Math.min(2000, Math.max(640, Math.round(width * PixelRatio.get() * 1.35)));
    pdf.renderPage(assetName, pageIndex, renderWidth)
      .then(value => { if (active) setUri(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [assetName, pageIndex, pdf, retry, width]);

  return (
    <View style={[styles.page, {width, height}]}>
      {uri ? <Image source={{uri}} style={StyleSheet.absoluteFill} resizeMode="contain" /> : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>تعذر عرض هذه الصفحة</Text>
          <Pressable onPress={() => setRetry(v => v + 1)} style={styles.retry}><Text style={styles.retryText}>إعادة المحاولة</Text></Pressable>
        </View>
      ) : <View style={styles.center}><ActivityIndicator color={COLORS.gold700} size="large" /><Text style={styles.loading}>جارٍ تجهيز الصفحة...</Text></View>}
      {uri ? overlay : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {...SHADOW, backgroundColor: COLORS.paper, borderRadius: 0, overflow: 'hidden', alignSelf: 'center'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, backgroundColor: '#FFFEFA'},
  loading: {marginTop: SPACING.md, color: COLORS.muted, fontSize: 12},
  errorTitle: {color: COLORS.danger, fontSize: 14, fontWeight: '800', textAlign: 'center'},
  retry: {marginTop: SPACING.md, paddingVertical: 10, paddingHorizontal: 18, borderRadius: RADIUS.pill, backgroundColor: COLORS.emerald900},
  retryText: {color: COLORS.white, fontSize: 12, fontWeight: '800'},
});
''')

write('src/features/reader/ReaderScreen.tsx', r'''import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, FlatList, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {A4_ASPECT, COLORS} from '../../app/theme';
import {useAppServices} from '../../app/AppServicesContext';
import {ZoomablePdfPage} from './ZoomablePdfPage';
import {pageFromHorizontalOffset} from './readerModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;
type MenuMode = 'primary' | 'more' | null;

const GLYPHS: Record<string, string> = {
  reading: '◈', dua: '♡', 'waqf-symbols': '۞', 'furati-intro': '❖', usul: '▤', index: '☷',
};

export function ReaderScreen({route, navigation}: Props): React.JSX.Element {
  const services = useAppServices();
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const section = useMemo(() => services.sections.get(route.params.sectionId), [route.params.sectionId, services]);
  if (!section) throw new Error('SECTION_NOT_FOUND');

  const total = section.sourceEndPage - section.sourceStartPage + 1;
  const saved = services.progress.get(section.id);
  const initialPage = Math.min(total, Math.max(1, route.params.logicalPage ?? saved?.logicalPage ?? 1));
  const [activePage, setActivePage] = useState(initialPage);
  const [bookmarked, setBookmarked] = useState(false);
  const [pageZoomed, setPageZoomed] = useState(false);
  const [menuMode, setMenuMode] = useState<MenuMode>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(services.settings.get().theme === 'dark' ? 'dark' : 'light');
  const listRef = useRef<FlatList<number>>(null);
  const pageWidth = Math.min(screenWidth, Math.max(1, screenHeight / A4_ASPECT));
  const pages = useMemo(() => Array.from({length: total}, (_, i) => i + 1), [total]);
  const extraSections = useMemo(() => services.sections.list().filter(item => item.id !== 'quran' && item.id !== 'index'), [services]);

  useEffect(() => setBookmarked(Boolean(services.bookmarks.findByPage(section.id, activePage))), [activePage, section.id, services]);

  const persist = useCallback((logicalPage: number) => {
    const source = section.sourceStartPage + logicalPage - 1;
    services.progress.save(section.id, logicalPage, source, 0);
    services.settings.setLastSection(section.id);
  }, [section, services]);

  useEffect(() => { persist(initialPage); }, [initialPage, persist]);

  const pageFromOffset = (event: NativeSyntheticEvent<NativeScrollEvent>) => pageFromHorizontalOffset(event.nativeEvent.contentOffset.x, screenWidth, total);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => setActivePage(pageFromOffset(event));
  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => persist(pageFromOffset(event));

  const saveBookmark = () => {
    const existing = services.bookmarks.findByPage(section.id, activePage);
    if (!existing) services.bookmarks.create({sectionId: section.id, logicalPage: activePage, sourcePdfPage: section.sourceStartPage + activePage - 1, label: section.id === 'quran' ? `صفحة ${activePage}` : `${section.title} – ${activePage}`});
    setBookmarked(true); setMenuMode(null);
  };

  const jumpToBookmark = () => {
    const target = services.bookmarks.list(section.id)[0];
    if (!target) {
      setMenuMode(null);
      Alert.alert('العلامة المرجعية', 'لا توجد علامة محفوظة في هذا القسم.');
      return;
    }
    setMenuMode(null);
    setActivePage(target.logicalPage);
    listRef.current?.scrollToOffset({offset: (target.logicalPage - 1) * screenWidth, animated: true});
    persist(target.logicalPage);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); services.settings.setTheme(next); setMenuMode(null);
  };

  const goSearch = () => { setMenuMode(null); navigation.navigate('Search'); };
  const goIndex = () => { setMenuMode(null); navigation.navigate('Index'); };
  const openExtra = (id: string) => { setMenuMode(null); navigation.navigate('Reader', {sectionId: id}); };
  const dark = theme === 'dark';

  const primaryItems = [
    {key: 'search', label: 'البحث', glyph: '⌕', action: goSearch},
    {key: 'save', label: bookmarked ? 'العلامة محفوظة' : 'حفظ علامة', glyph: bookmarked ? '✓' : '▮', action: saveBookmark},
    {key: 'jump', label: 'الانتقال إلى العلامة', glyph: '↪', action: jumpToBookmark},
    {key: 'theme', label: dark ? 'الوضع الفاتح' : 'الوضع الداكن', glyph: dark ? '☀' : '☾', action: toggleTheme},
    {key: 'index', label: 'الفهرس', glyph: '☷', action: goIndex},
    {key: 'more', label: 'المزيد', glyph: '•••', action: () => setMenuMode('more')},
  ] as const;

  return (
    <View style={[styles.root, dark && styles.rootDark]}>
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        snapToInterval={screenWidth}
        decelerationRate="fast"
        keyExtractor={item => String(item)}
        renderItem={({item}) => (
          <View style={[styles.pageSlot, {width: screenWidth}]}>
            <Pressable accessibilityLabel={`صفحة ${item} من ${total}`} onPress={() => setMenuMode('primary')} style={{width: pageWidth, height: pageWidth * A4_ASPECT}}>
              <ZoomablePdfPage assetName={section.assetName} pageIndex={item - 1} width={pageWidth} onZoomStateChange={setPageZoomed} />
            </Pressable>
          </View>
        )}
        initialScrollIndex={initialPage - 1}
        getItemLayout={(_, index) => ({length: screenWidth, offset: screenWidth * index, index})}
        onScroll={onScroll}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEnabled={!pageZoomed}
        scrollEventThrottle={80}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
        onScrollToIndexFailed={({index}) => setTimeout(() => listRef.current?.scrollToOffset({offset: index * screenWidth, animated: false}), 50)}
      />

      <Modal transparent visible={menuMode !== null} animationType="fade" onRequestClose={() => setMenuMode(null)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setMenuMode(null)}>
          <Pressable style={[styles.sheet, dark && styles.sheetDark]} onPress={event => event.stopPropagation()}>
            {menuMode === 'primary' ? (
              <View style={styles.menuGrid}>
                {primaryItems.map(item => (
                  <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.action} style={({pressed}) => [styles.menuItem, dark && styles.menuItemDark, pressed && styles.pressed]}>
                    <Text style={[styles.menuGlyph, dark && styles.menuGlyphDark]}>{item.glyph}</Text>
                    <Text style={[styles.menuLabel, dark && styles.menuLabelDark]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View>
                <Text style={[styles.moreTitle, dark && styles.menuLabelDark]}>الأقسام والشروح</Text>
                <View style={styles.menuGrid}>
                  {extraSections.map(item => (
                    <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`فتح ${item.title}`} onPress={() => openExtra(item.id)} style={({pressed}) => [styles.moreItem, dark && styles.menuItemDark, pressed && styles.pressed]}>
                      <Text style={[styles.moreGlyph, dark && styles.menuGlyphDark]}>{GLYPHS[item.id] ?? '◆'}</Text>
                      <Text numberOfLines={3} style={[styles.moreLabel, dark && styles.menuLabelDark]}>{item.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F2EAD9'},
  rootDark: {backgroundColor: '#050505'},
  pageSlot: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  backdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)'},
  sheet: {backgroundColor: 'rgba(250,247,239,0.98)', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingBottom: 12, borderTopWidth: 1, borderColor: '#D6A933'},
  sheetDark: {backgroundColor: 'rgba(12,12,12,0.98)', borderColor: '#3A3A3A'},
  menuGrid: {flexDirection: 'row-reverse', flexWrap: 'wrap'},
  menuItem: {width: '33.333%', minHeight: 92, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#CFC6B5', paddingHorizontal: 6},
  menuItemDark: {borderColor: '#3C3C3C'},
  menuGlyph: {fontSize: 30, lineHeight: 36, color: COLORS.emerald950, fontWeight: '500'},
  menuGlyphDark: {color: '#FFFFFF'},
  menuLabel: {marginTop: 4, fontSize: 13, lineHeight: 19, textAlign: 'center', writingDirection: 'rtl', color: '#1A201D', fontWeight: '700'},
  menuLabelDark: {color: '#FFFFFF'},
  moreTitle: {fontSize: 16, fontWeight: '900', color: COLORS.emerald950, textAlign: 'right', writingDirection: 'rtl', paddingHorizontal: 18, paddingVertical: 14},
  moreItem: {width: '33.333%', minHeight: 118, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#CFC6B5', paddingHorizontal: 8, paddingVertical: 10},
  moreGlyph: {fontSize: 27, color: COLORS.gold700},
  moreLabel: {marginTop: 7, fontSize: 12, lineHeight: 18, textAlign: 'center', writingDirection: 'rtl', color: '#1A201D', fontWeight: '700'},
  pressed: {opacity: 0.55},
});
''')

# Correct page geometry for these Farati mushaf PDFs.
p=root/'src/app/theme.ts'
s=p.read_text(encoding='utf-8')
s=re.sub(r'export const A4_ASPECT\s*=\s*[^;]+;', 'export const A4_ASPECT = 652.68 / 512.402;', s)
p.write_text(s,encoding='utf-8')

# Preserve theme / last section instead of resetting settings on every app launch.
p=root/'src/database/seed.ts'
s=p.read_text(encoding='utf-8')
s=s.replace("    realm.create('AppSettings', {id: 'main', lastSectionId: null, theme: 'light'}, Realm.UpdateMode.Modified);",
            "    if (!realm.objectForPrimaryKey('AppSettings', 'main')) realm.create('AppSettings', {id: 'main', lastSectionId: null, theme: 'light'});")
p.write_text(s,encoding='utf-8')
