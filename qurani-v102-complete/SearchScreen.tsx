import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {COLORS, RADIUS, SHADOW, SPACING, TOUCH_TARGET} from '../../app/theme';
import {VERSE_INDEX} from '../../data/verses.generated';
import {useAppServices} from '../../app/AppServicesContext';
import {searchSurahs} from '../../services/SurahSearchService';
import {searchVerses} from '../../services/VerseSearchService';
import {toSurahTarget} from '../../services/ReaderNavigationService';
import {ScreenHeader} from '../common/ScreenHeader';

type SearchResult =
  | Readonly<{kind: 'surah'; key: string; id: number; nameArabic: string; mushafStartPage: number; sourcePdfPage: number}>
  | Readonly<{kind: 'text'; key: string; mushafPage: number; text: string}>;

export function SearchScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const services = useAppServices();
  const [query, setQuery] = useState('');
  const all = useMemo(() => services.surahs.list().map(({id, nameArabic, mushafStartPage, sourcePdfPage}) => ({id, nameArabic, mushafStartPage, sourcePdfPage})), [services]);
  const surahResults = useMemo(() => searchSurahs(query, all), [query, all]);
  const textResults = useMemo(() => searchVerses(query, VERSE_INDEX), [query]);
  const results = useMemo<readonly SearchResult[]>(() => [
    ...surahResults.map(item => ({kind: 'surah' as const, key: `s-${item.id}`, ...item})),
    ...textResults.map(item => ({kind: 'text' as const, key: `p-${item.mushafPage}`, ...item})),
  ], [surahResults, textResults]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="البحث في المصحف" />
      <View style={styles.searchWrap}>
        <TextInput value={query} onChangeText={setQuery} autoFocus accessibilityLabel="حقل البحث عن سورة أو نص آية" placeholder="اكتب اسم سورة أو كلمات من آية..." placeholderTextColor={COLORS.muted} style={styles.input} textAlign="right" selectionColor={COLORS.gold500} returnKeyType="search" />
        <View style={styles.icon}><Text style={styles.iconText}>⌕</Text></View>
      </View>
      <View style={styles.counterRow}><Text style={styles.counter}>{results.length} نتيجة</Text><Text style={styles.hint}>البحث النصي يعمل دون إنترنت ويفتح الصفحة المطابقة مباشرة</Text></View>
      <FlatList data={results} keyExtractor={item => item.key} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
        renderItem={({item}) => item.kind === 'surah' ? (
          <Pressable accessibilityLabel={`فتح سورة ${item.nameArabic}`} style={({pressed}) => [styles.row, pressed && styles.pressed]} onPress={() => navigation.push('Reader', toSurahTarget(item))}>
            <View style={styles.number}><Text style={styles.numberText}>{item.id}</Text></View><View style={styles.rowText}><Text style={styles.name}>سورة {item.nameArabic}</Text><Text style={styles.page}>تبدأ من صفحة {item.mushafStartPage}</Text></View><Text style={styles.arrow}>‹</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityLabel={`فتح نتيجة البحث في الصفحة ${item.mushafPage}`} style={({pressed}) => [styles.row, styles.textRow, pressed && styles.pressed]} onPress={() => navigation.push('Reader', {sectionId: 'quran', logicalPage: item.mushafPage})}>
            <View style={styles.pageBadge}><Text style={styles.pageBadgeText}>{item.mushafPage}</Text></View><View style={styles.rowText}><Text style={styles.matchTitle}>نتيجة مطابقة لنص البحث</Text><Text style={styles.page}>اضغط للانتقال إلى الصفحة مباشرة</Text></View><Text style={styles.arrow}>‹</Text>
          </Pressable>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>لا توجد نتيجة مطابقة</Text><Text style={styles.emptyBody}>جرّب كتابة كلمتين أو أكثر من الآية بدون تشكيل.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.ivory}, searchWrap: {...SHADOW, margin: SPACING.lg, minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.paper, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.gold300, paddingHorizontal: SPACING.md}, input: {flex: 1, minHeight: TOUCH_TARGET, color: COLORS.ink, fontSize: 17, fontWeight: '600', writingDirection: 'rtl'}, icon: {width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.emerald100, alignItems: 'center', justifyContent: 'center'}, iconText: {fontSize: 23, color: COLORS.emerald900}, counterRow: {paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm}, counter: {fontSize: 12, color: COLORS.gold700, fontWeight: '800'}, hint: {flex: 1, fontSize: 11, color: COLORS.muted, textAlign: 'right', writingDirection: 'rtl'}, list: {paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.sm}, row: {minHeight: 76, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.paper, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm}, textRow: {minHeight: 82}, number: {width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.emerald900, alignItems: 'center', justifyContent: 'center'}, numberText: {color: COLORS.gold300, fontSize: 13, fontWeight: '800'}, pageBadge: {minWidth: 46, height: 42, borderRadius: 21, paddingHorizontal: 8, backgroundColor: COLORS.emerald900, alignItems: 'center', justifyContent: 'center'}, pageBadgeText: {color: COLORS.gold300, fontSize: 11, fontWeight: '900'}, rowText: {flex: 1, paddingHorizontal: SPACING.md}, name: {fontSize: 16, color: COLORS.emerald950, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl'}, matchTitle: {fontSize: 15, lineHeight: 23, color: COLORS.emerald950, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl'}, page: {fontSize: 11, color: COLORS.muted, marginTop: 3, textAlign: 'right', writingDirection: 'rtl'}, arrow: {width: TOUCH_TARGET, color: COLORS.gold700, textAlign: 'center', fontSize: 28}, pressed: {opacity: 0.82}, empty: {padding: 40, alignItems: 'center'}, emptyTitle: {fontSize: 17, fontWeight: '800', color: COLORS.emerald950, textAlign: 'center'}, emptyBody: {fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6},
});
