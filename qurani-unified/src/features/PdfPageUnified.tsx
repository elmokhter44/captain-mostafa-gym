import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, PixelRatio, Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppServices} from '../../app/AppServicesContext';
import {A4_ASPECT, COLORS, RADIUS, SPACING} from '../../app/theme';
import {scopedPdfAsset} from '../../app/ActiveMushaf';

export function PdfPage({assetName,pageIndex,width,height,overlay}:{assetName:string;pageIndex:number;width:number;height?:number;overlay?:React.ReactNode}):React.JSX.Element {
  const {pdf}=useAppServices();
  const [uri,setUri]=useState<string|null>(null); const [error,setError]=useState(false); const [retry,setRetry]=useState(0);
  const resolvedHeight=height??width*A4_ASPECT;
  const selectedAsset=scopedPdfAsset(assetName);
  useEffect(()=>{
    let active=true; setUri(null); setError(false);
    const renderWidth=Math.min(2000,Math.max(640,Math.round(width*PixelRatio.get()*1.35)));
    pdf.renderPage(selectedAsset,pageIndex,renderWidth).then(v=>{console.log('[QURANI] PDF_RENDER_OK='+selectedAsset+' page='+pageIndex);if(active)setUri(v);}).catch(e=>{console.log('[QURANI] PDF_RENDER_ERROR='+selectedAsset+' '+String(e));if(active)setError(true);});
    return()=>{active=false;};
  },[selectedAsset,pageIndex,pdf,retry,width]);
  return <View style={[styles.page,{width,height:resolvedHeight}]}>{uri?<Image source={{uri}} style={StyleSheet.absoluteFill} resizeMode="stretch"/>:error?<View style={styles.center}><Text style={styles.errorTitle}>تعذر عرض هذه الصفحة</Text><Pressable onPress={()=>setRetry(v=>v+1)} style={styles.retry}><Text style={styles.retryText}>إعادة المحاولة</Text></Pressable></View>:<View style={styles.center}><ActivityIndicator color={COLORS.gold700} size="large"/><Text style={styles.loading}>جارٍ تجهيز الصفحة...</Text></View>}{uri?overlay:null}</View>;
}
const styles=StyleSheet.create({page:{backgroundColor:'#FFFEFA',borderRadius:0,overflow:'hidden',alignSelf:'center'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:SPACING.lg,backgroundColor:'#FFFEFA'},loading:{marginTop:SPACING.md,color:COLORS.muted,fontSize:12},errorTitle:{color:COLORS.danger,fontSize:14,fontWeight:'800',textAlign:'center'},retry:{marginTop:SPACING.md,paddingVertical:10,paddingHorizontal:18,borderRadius:RADIUS.pill,backgroundColor:COLORS.emerald900},retryText:{color:COLORS.white,fontSize:12,fontWeight:'800'}});
