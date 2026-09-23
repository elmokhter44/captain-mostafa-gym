import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, FlatList, Modal, NativeScrollEvent, NativeSyntheticEvent, PixelRatio, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../app/navigation';
import {COLORS} from '../../app/theme';
import {useAppServices} from '../../app/AppServicesContext';
import {ZoomablePdfPage} from './ZoomablePdfPage';
import {pageFromHorizontalOffset} from './readerModel';

type Props=NativeStackScreenProps<RootStackParamList,'Reader'>;
type MenuMode='primary'|'more'|null;
const GLYPHS:Record<string,string>={reading:'◈',dua:'♡','waqf-symbols':'۞','furati-intro':'❖',usul:'▤',index:'☷'};

export function ReaderScreen({route,navigation}:Props):React.JSX.Element {
  const services=useAppServices();
  const {width:screenWidth,height:screenHeight}=useWindowDimensions();
  const section=useMemo(()=>services.sections.get(route.params.sectionId),[route.params.sectionId,services]);
  if(!section) throw new Error('SECTION_NOT_FOUND');
  const total=section.sourceEndPage-section.sourceStartPage+1;
  const saved=services.progress.get(section.id);
  const initialPage=Math.min(total,Math.max(1,route.params.logicalPage??saved?.logicalPage??1));
  const [activePage,setActivePage]=useState(initialPage);
  const [bookmarked,setBookmarked]=useState(false);
  const [pageZoomed,setPageZoomed]=useState(false);
  const [menuMode,setMenuMode]=useState<MenuMode>(null);
  const [theme,setTheme]=useState<'light'|'dark'>(services.settings.get().theme==='dark'?'dark':'light');
  const [viewportHeight,setViewportHeight]=useState(screenHeight);
  const listRef=useRef<FlatList<number>>(null);
  const pageWidth=screenWidth;
  const pageHeight=Math.max(1,viewportHeight);
  const pages=useMemo(()=>Array.from({length:total},(_,i)=>i+1),[total]);
  const extraSections=useMemo(()=>services.sections.list().filter(item=>item.id!=='quran'&&item.id!=='index'&&item.id!==section.id),[section.id,services]);

  useEffect(()=>setBookmarked(Boolean(services.bookmarks.findByPage(section.id,activePage))),[activePage,section.id,services]);
  useEffect(()=>setViewportHeight(screenHeight),[screenHeight]);
  const persist=useCallback((logicalPage:number)=>{const source=section.sourceStartPage+logicalPage-1;services.progress.save(section.id,logicalPage,source,0);services.settings.setLastSection(section.id);},[section,services]);
  useEffect(()=>{persist(initialPage);},[initialPage,persist]);

  useEffect(()=>{
    const renderWidth=Math.min(1600,Math.max(640,Math.round(screenWidth*PixelRatio.get()*1.15)));
    extraSections.forEach(item=>{void services.pdf.renderPage(item.assetName,0,renderWidth).catch(()=>undefined);});
  },[extraSections,screenWidth,services]);

  const pageFromOffset=(event:NativeSyntheticEvent<NativeScrollEvent>)=>pageFromHorizontalOffset(event.nativeEvent.contentOffset.x,screenWidth,total);
  const onScroll=(event:NativeSyntheticEvent<NativeScrollEvent>)=>setActivePage(pageFromOffset(event));
  const onScrollEnd=(event:NativeSyntheticEvent<NativeScrollEvent>)=>persist(pageFromOffset(event));
  const saveBookmark=()=>{const existing=services.bookmarks.findByPage(section.id,activePage);if(!existing)services.bookmarks.create({sectionId:section.id,logicalPage:activePage,sourcePdfPage:section.sourceStartPage+activePage-1,label:section.id==='quran'?`صفحة ${activePage}`:`${section.title} – ${activePage}`});setBookmarked(true);setMenuMode(null);};
  const jumpToBookmark=()=>{const target=services.bookmarks.list(section.id)[0];if(!target){setMenuMode(null);Alert.alert('العلامة المرجعية','لا توجد علامة محفوظة في هذا القسم.');return;}setMenuMode(null);setActivePage(target.logicalPage);listRef.current?.scrollToOffset({offset:(target.logicalPage-1)*screenWidth,animated:true});persist(target.logicalPage);};
  const toggleTheme=()=>{const next=theme==='dark'?'light':'dark';setTheme(next);services.settings.setTheme(next);setMenuMode(null);};
  const goSearch=()=>{setMenuMode(null);navigation.navigate('Search');};
  const goIndex=()=>{setMenuMode(null);navigation.push('Index');};
  const openExtra=(id:string)=>{setMenuMode(null);navigation.push('Reader',{sectionId:id,logicalPage:1});};
  const dark=theme==='dark';
  const primaryItems=[
    {key:'search',label:'البحث',glyph:'⌕',action:goSearch},
    {key:'save',label:bookmarked?'العلامة محفوظة':'حفظ علامة',glyph:bookmarked?'✓':'▮',action:saveBookmark},
    {key:'jump',label:'الانتقال إلى العلامة',glyph:'↪',action:jumpToBookmark},
    {key:'theme',label:dark?'الوضع الفاتح':'الوضع الداكن',glyph:dark?'☀':'☾',action:toggleTheme},
    {key:'index',label:'الفهرس',glyph:'☷',action:goIndex},
    {key:'more',label:'المزيد',glyph:'•••',action:()=>setMenuMode('more')},
  ] as const;

  return (
    <View style={[styles.root,dark&&styles.rootDark]} onLayout={e=>setViewportHeight(e.nativeEvent.layout.height)}>
      <FlatList ref={listRef} data={pages} horizontal pagingEnabled snapToInterval={screenWidth} decelerationRate="fast"
        keyExtractor={item=>String(item)}
        renderItem={({item})=>(
          <View style={[styles.pageSlot,{width:screenWidth,height:pageHeight}]}>
            <Pressable accessibilityLabel={`صفحة ${item} من ${total}`} onPress={()=>{if(!pageZoomed)setMenuMode('primary');}} style={{width:pageWidth,height:pageHeight}}>
              <ZoomablePdfPage assetName={section.assetName} pageIndex={item-1} width={pageWidth} height={pageHeight} onZoomStateChange={setPageZoomed} />
            </Pressable>
          </View>
        )}
        initialScrollIndex={initialPage-1} getItemLayout={(_,index)=>({length:screenWidth,offset:screenWidth*index,index})}
        onScroll={onScroll} onMomentumScrollEnd={onScrollEnd} onScrollEndDrag={onScrollEnd} scrollEnabled={!pageZoomed} scrollEventThrottle={80}
        initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3} removeClippedSubviews showsHorizontalScrollIndicator={false}
        onScrollToIndexFailed={({index})=>setTimeout(()=>listRef.current?.scrollToOffset({offset:index*screenWidth,animated:false}),50)} />
      <Modal transparent visible={menuMode!==null} animationType="fade" onRequestClose={()=>setMenuMode(null)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={()=>setMenuMode(null)}>
          <Pressable style={[styles.sheet,dark&&styles.sheetDark]} onPress={event=>event.stopPropagation()}>
            {menuMode==='primary' ? <View style={styles.menuGrid}>{primaryItems.map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.action} style={({pressed})=>[styles.menuItem,dark&&styles.menuItemDark,pressed&&styles.pressed]}><Text style={[styles.menuGlyph,dark&&styles.menuGlyphDark]}>{item.glyph}</Text><Text style={[styles.menuLabel,dark&&styles.menuLabelDark]}>{item.label}</Text></Pressable>)}</View> :
              <View><Text style={[styles.moreTitle,dark&&styles.menuLabelDark]}>الأقسام والشروح</Text><View style={styles.menuGrid}>{extraSections.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`فتح ${item.title}`} onPress={()=>openExtra(item.id)} style={({pressed})=>[styles.moreItem,dark&&styles.menuItemDark,pressed&&styles.pressed]}><Text style={[styles.moreGlyph,dark&&styles.menuGlyphDark]}>{GLYPHS[item.id]??'◆'}</Text><Text numberOfLines={3} style={[styles.moreLabel,dark&&styles.menuLabelDark]}>{item.title}</Text></Pressable>)}</View></View>}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F2EAD9'},rootDark:{backgroundColor:'#050505'},pageSlot:{alignItems:'stretch',justifyContent:'flex-start',overflow:'hidden'},
  backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.28)'},sheet:{backgroundColor:'rgba(250,247,239,0.98)',borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden',paddingBottom:12,borderTopWidth:1,borderColor:'#D6A933'},sheetDark:{backgroundColor:'rgba(12,12,12,0.98)',borderColor:'#3A3A3A'},menuGrid:{flexDirection:'row-reverse',flexWrap:'wrap'},
  menuItem:{width:'33.333%',minHeight:92,alignItems:'center',justifyContent:'center',borderLeftWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#CFC6B5',paddingHorizontal:6},menuItemDark:{borderColor:'#3C3C3C'},menuGlyph:{fontSize:30,lineHeight:36,color:COLORS.emerald950,fontWeight:'500'},menuGlyphDark:{color:'#FFFFFF'},menuLabel:{marginTop:4,fontSize:13,lineHeight:19,textAlign:'center',writingDirection:'rtl',color:'#1A201D',fontWeight:'700'},menuLabelDark:{color:'#FFFFFF'},moreTitle:{fontSize:16,fontWeight:'900',color:COLORS.emerald950,textAlign:'right',writingDirection:'rtl',paddingHorizontal:18,paddingVertical:14},moreItem:{width:'33.333%',minHeight:118,alignItems:'center',justifyContent:'center',borderLeftWidth:StyleSheet.hairlineWidth,borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#CFC6B5',paddingHorizontal:8,paddingVertical:10},moreGlyph:{fontSize:27,color:COLORS.gold700},moreLabel:{marginTop:7,fontSize:12,lineHeight:18,textAlign:'center',writingDirection:'rtl',color:'#1A201D',fontWeight:'700'},pressed:{opacity:0.55},
});
