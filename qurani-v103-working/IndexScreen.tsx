import React, {useMemo} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {A4_ASPECT, COLORS, SPACING} from '../../app/theme';
import {useAppServices} from '../../app/AppServicesContext';
import {toSurahTarget} from '../../services/ReaderNavigationService';
import {ScreenHeader} from '../common/ScreenHeader';
import {PdfPage} from '../reader/PdfPage';

export function IndexScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const services = useAppServices();
  const {width: screenWidth} = useWindowDimensions();
  const pageWidth = Math.max(280, screenWidth - SPACING.md * 2);
  const pageHeight = pageWidth * A4_ASPECT;
  const rowLength = pageHeight + SPACING.md;
  const pages = useMemo(() => [617, 618, 619, 620, 621, 622], []);

  const overlaysFor = (sourcePage: number) => {
    if (sourcePage !== 621 && sourcePage !== 622) return undefined;
    const hotspots = services.hotspots.forSourcePage(sourcePage);
    return hotspots.map(hotspot => {
      const surah = services.surahs.get(hotspot.surahId);
      if (!surah) return null;
      return (
        <Pressable
          key={hotspot.id}
          accessibilityRole="button"
          accessibilityLabel={`الانتقال إلى سورة ${surah.nameArabic}`}
          onPress={() => navigation.navigate('Reader', toSurahTarget(surah))}
          style={{position: 'absolute', left: hotspot.x * pageWidth, top: hotspot.y * pageHeight, width: hotspot.width * pageWidth, height: hotspot.height * pageHeight}}
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="تعريف وفهرس المصحف" />
      <View style={styles.notice}><Text style={styles.noticeText}>صفحات الفهرس الأصلية تفاعلية — اضغط على اسم أي سورة للانتقال إليها.</Text></View>
      <FlatList
        data={pages}
        keyExtractor={item => String(item)}
        renderItem={({item, index}) => (
          <View style={{height: rowLength}}>
            <PdfPage assetName="quran_index.pdf" pageIndex={index} width={pageWidth} overlay={overlaysFor(item)} />
          </View>
        )}
        getItemLayout={(_, index) => ({length: rowLength, offset: rowLength * index, index})}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={4}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.ivoryDeep},
  notice: {backgroundColor: COLORS.emerald100, borderBottomWidth: 1, borderBottomColor: '#C5DCD3', paddingVertical: 8, paddingHorizontal: SPACING.lg},
  noticeText: {fontSize: 11, lineHeight: 18, color: COLORS.emerald900, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl'},
  list: {paddingTop: SPACING.md, paddingBottom: 30},
});
