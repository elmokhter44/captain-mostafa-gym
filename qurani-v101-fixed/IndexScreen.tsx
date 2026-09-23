import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {A4_ASPECT, COLORS, SPACING} from '../../app/theme';
import {useAppServices} from '../../app/AppServicesContext';
import {toSurahTarget} from '../../services/ReaderNavigationService';
import {ScreenHeader} from '../common/ScreenHeader';
import {ZoomablePdfPage} from '../reader/ZoomablePdfPage';

export function IndexScreen():React.JSX.Element {
  const navigation=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const services=useAppServices();
  const {width:screenWidth}=useWindowDimensions();
  const [pageZoomed,setPageZoomed]=useState(false);
  const pageWidth=screenWidth; const pageHeight=pageWidth*A4_ASPECT;
  const sourcePages=useMemo(()=>[609,610],[]);
  const hotspotPages=useMemo(()=>[621,622],[]);
  const overlaysFor=(index:number)=>{
    const hotspots=services.hotspots.forSourcePage(hotspotPages[index]!);
    return hotspots.map(hotspot=>{const surah=services.surahs.get(hotspot.surahId);if(!surah)return null;return <Pressable key={hotspot.id} accessibilityRole="button" accessibilityLabel={`الانتقال إلى سورة ${surah.nameArabic}`} onPress={()=>navigation.push('Reader',toSurahTarget(surah))} style={{position:'absolute',left:hotspot.x*pageWidth,top:hotspot.y*pageHeight,width:hotspot.width*pageWidth,height:hotspot.height*pageHeight}}/>;});
  };
  return <View style={styles.root}>
    <ScreenHeader title="تعريف وفهرس المصحف"/>
    <View style={styles.notice}><Text style={styles.noticeText}>صفحتا الفهرس 609–610 تفاعليتان — اضغط على اسم أي سورة للانتقال إليها.</Text></View>
    <FlatList data={sourcePages} horizontal pagingEnabled snapToInterval={screenWidth} decelerationRate="fast" keyExtractor={item=>String(item)}
      renderItem={({index})=><View style={{width:screenWidth,alignItems:'center'}}><ZoomablePdfPage assetName="quran_index.pdf" pageIndex={index} width={pageWidth} height={pageHeight} overlay={overlaysFor(index)} onZoomStateChange={setPageZoomed}/></View>}
      getItemLayout={(_,index)=>({length:screenWidth,offset:screenWidth*index,index})} scrollEnabled={!pageZoomed} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} showsHorizontalScrollIndicator={false}/>
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:COLORS.ivoryDeep},notice:{backgroundColor:COLORS.emerald100,borderBottomWidth:1,borderBottomColor:'#C5DCD3',paddingVertical:8,paddingHorizontal:SPACING.lg},noticeText:{fontSize:11,lineHeight:18,color:COLORS.emerald900,fontWeight:'700',textAlign:'center',writingDirection:'rtl'}});
