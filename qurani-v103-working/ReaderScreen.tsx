import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {A4_ASPECT, COLORS, RADIUS, SPACING, TOUCH_TARGET} from '../../app/theme';
import {useAppServices} from '../../app/AppServicesContext';
import {ScreenHeader} from '../common/ScreenHeader';
import {ZoomablePdfPage} from './ZoomablePdfPage';
import {pageWidthForScreen} from './zoomModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export function ReaderScreen({route}: Props): React.JSX.Element {
  const services = useAppServices();
  const {width: screenWidth} = useWindowDimensions();
  const section = useMemo(() => services.sections.get(route.params.sectionId), [route.params.sectionId, services]);
  if (!section) throw new Error('SECTION_NOT_FOUND');
  const total = section.sourceEndPage - section.sourceStartPage + 1;
  const saved = services.progress.get(section.id);
  const initialPage = Math.min(total, Math.max(1, route.params.logicalPage ?? saved?.logicalPage ?? 1));
  const [activePage, setActivePage] = useState(initialPage);
  const [bookmarked, setBookmarked] = useState(false);
  const [pageZoomed, setPageZoomed] = useState(false);
  const listRef = useRef<FlatList<number>>(null);
  const pageWidth = pageWidthForScreen(screenWidth);
  const pageHeight = pageWidth * A4_ASPECT;
  const rowLength = pageHeight + SPACING.md;
  const pages = useMemo(() => Array.from({length: total}, (_, i) => i + 1), [total]);

  useEffect(() => {
    setBookmarked(Boolean(services.bookmarks.findByPage(section.id, activePage)));
  }, [activePage, section.id, services]);

  const persist = useCallback((logicalPage: number) => {
    const source = section.sourceStartPage + logicalPage - 1;
    services.progress.save(section.id, logicalPage, source, 0);
    services.settings.setLastSection(section.id);
  }, [section, services]);

  useEffect(() => { persist(initialPage); }, [initialPage, persist]);

  const pageFromOffset = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(total - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.y / rowLength)));
    return index + 1;
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => setActivePage(pageFromOffset(event));
  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => persist(pageFromOffset(event));

  const toggleBookmark = () => {
    const existing = services.bookmarks.findByPage(section.id, activePage);
    if (existing) services.bookmarks.remove(existing.id);
    else services.bookmarks.create({sectionId: section.id, logicalPage: activePage, sourcePdfPage: section.sourceStartPage + activePage - 1, label: section.id === 'quran' ? `صفحة ${activePage}` : `${section.title} – ${activePage}`});
    setBookmarked(!existing);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={section.title} right={
        <Pressable onPress={toggleBookmark} accessibilityLabel="علامة مرجعية" style={styles.bookmark}>
          <Text style={[styles.bookmarkGlyph, bookmarked && styles.bookmarkActive]}>{bookmarked ? '★' : '☆'}</Text>
        </Pressable>
      } />
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={item => String(item)}
        renderItem={({item}) => <View style={{height: rowLength, justifyContent: 'flex-start'}}><ZoomablePdfPage assetName={section.assetName} pageIndex={item - 1} width={pageWidth} onZoomStateChange={setPageZoomed} /></View>}
        initialScrollIndex={initialPage - 1}
        getItemLayout={(_, index) => ({length: rowLength, offset: rowLength * index, index})}
        onScroll={onScroll}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEnabled={!pageZoomed}
        scrollEventThrottle={100}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={({index}) => setTimeout(() => listRef.current?.scrollToOffset({offset: index * rowLength, animated: false}), 50)}
      />
      <View pointerEvents="none" style={styles.pageChip}><Text style={styles.pageChipText}>صفحة {activePage} من {total}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.ivoryDeep},
  list: {paddingTop: SPACING.md, paddingBottom: 78},
  bookmark: {width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center'},
  bookmarkGlyph: {fontSize: 27, color: COLORS.gold300},
  bookmarkActive: {color: COLORS.gold500},
  pageChip: {position: 'absolute', bottom: 18, alignSelf: 'center', backgroundColor: COLORS.emerald950, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.gold500, paddingVertical: 9, paddingHorizontal: 18},
  pageChipText: {color: COLORS.white, fontSize: 12, fontWeight: '800', writingDirection: 'rtl'},
});
