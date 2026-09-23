import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {COLORS} from '../../app/theme';
import {useAppServices} from '../../app/AppServicesContext';
import {toSurahTarget} from '../../services/ReaderNavigationService';
import {ZoomablePdfPage} from '../reader/ZoomablePdfPage';

type ZoneGroup = Readonly<{
  start: number;
  end: number;
  x: number;
  width: number;
  top: number;
  bottom: number;
}>;

// Exact interactive rows for the two printed index sheets.
// First sheet: surahs 1–28 in the right table, 29–56 in the left table.
// Second sheet: surahs 57–85 in the right table, 86–114 in the left table.
const INDEX_ZONE_GROUPS: readonly (readonly ZoneGroup[])[] = [
  [
    {start: 1, end: 28, x: 0.615, width: 0.19, top: 0.149, bottom: 0.961},
    {start: 29, end: 56, x: 0.235, width: 0.18, top: 0.149, bottom: 0.961},
  ],
  [
    {start: 57, end: 85, x: 0.615, width: 0.19, top: 0.149, bottom: 0.961},
    {start: 86, end: 114, x: 0.235, width: 0.18, top: 0.149, bottom: 0.961},
  ],
] as const;

export function IndexScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const services = useAppServices();
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const [pageZoomed, setPageZoomed] = useState(false);
  const sourcePages = useMemo(() => [609, 610], []);

  const overlaysFor = (pageIndex: number) => {
    const groups = INDEX_ZONE_GROUPS[pageIndex] ?? [];
    return groups.flatMap(group => {
      const rowCount = group.end - group.start + 1;
      const rowHeight = (group.bottom - group.top) / rowCount;
      return Array.from({length: rowCount}, (_, row) => {
        const surahNumber = group.start + row;
        const surah = services.surahs.get(surahNumber);
        if (!surah) return null;
        return (
          <Pressable
            key={`index-${pageIndex}-${surahNumber}`}
            accessibilityRole="button"
            accessibilityLabel={`الانتقال إلى سورة ${surah.nameArabic}`}
            onPress={() => navigation.push('Reader', toSurahTarget(surah))}
            style={{
              position: 'absolute',
              left: group.x * screenWidth,
              top: (group.top + row * rowHeight) * screenHeight,
              width: group.width * screenWidth,
              height: rowHeight * screenHeight,
            }}
          />
        );
      });
    });
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={sourcePages}
        horizontal
        inverted
        pagingEnabled
        snapToInterval={screenWidth}
        decelerationRate="fast"
        keyExtractor={item => String(item)}
        renderItem={({index}) => (
          <View style={{width: screenWidth, height: screenHeight}}>
            <ZoomablePdfPage
              assetName="quran_index.pdf"
              pageIndex={index}
              width={screenWidth}
              height={screenHeight}
              overlay={overlaysFor(index)}
              onZoomStateChange={setPageZoomed}
            />
          </View>
        )}
        getItemLayout={(_, index) => ({length: screenWidth, offset: screenWidth * index, index})}
        scrollEnabled={!pageZoomed}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.ivoryDeep},
});
