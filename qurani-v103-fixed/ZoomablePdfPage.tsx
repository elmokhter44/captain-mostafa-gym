import React, {useMemo, useRef} from 'react';
import {Animated, PanResponder, StyleSheet, View} from 'react-native';
import {A4_ASPECT} from '../../app/theme';
import {PdfPage} from './PdfPage';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4.5;

function touchDistance(touches: readonly {pageX:number;pageY:number}[]):number{
  if(touches.length<2)return 0;
  const a=touches[0]!;const b=touches[1]!;
  return Math.hypot(b.pageX-a.pageX,b.pageY-a.pageY);
}
function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}
function clampOffset(x:number,y:number,scale:number,width:number,height:number){
  const maxX=Math.max(0,(scale-1)*width/2);
  const maxY=Math.max(0,(scale-1)*height/2);
  return {x:clamp(x,-maxX,maxX),y:clamp(y,-maxY,maxY)};
}

export function ZoomablePdfPage({assetName,pageIndex,width,height,overlay,onZoomStateChange}:{
  assetName:string;pageIndex:number;width:number;height?:number;overlay?:React.ReactNode;onZoomStateChange?:(zoomed:boolean)=>void;
}):React.JSX.Element{
  const resolvedHeight=height??width*A4_ASPECT;
  const scale=useRef(new Animated.Value(MIN_ZOOM)).current;
  const translateX=useRef(new Animated.Value(0)).current;
  const translateY=useRef(new Animated.Value(0)).current;
  const scaleRef=useRef(MIN_ZOOM);
  const offsetRef=useRef({x:0,y:0});
  const pinchStart=useRef({distance:0,scale:MIN_ZOOM,x:0,y:0});
  const panStart=useRef({x:0,y:0});

  const apply=(nextScale:number,x:number,y:number)=>{
    const safeScale=clamp(nextScale,MIN_ZOOM,MAX_ZOOM);
    const safeOffset=clampOffset(x,y,safeScale,width,resolvedHeight);
    scaleRef.current=safeScale;offsetRef.current=safeOffset;
    scale.setValue(safeScale);translateX.setValue(safeOffset.x);translateY.setValue(safeOffset.y);
    onZoomStateChange?.(safeScale>1.02);
  };
  const reset=()=>{
    scaleRef.current=MIN_ZOOM;offsetRef.current={x:0,y:0};
    Animated.parallel([
      Animated.spring(scale,{toValue:MIN_ZOOM,useNativeDriver:true,bounciness:0,speed:22}),
      Animated.spring(translateX,{toValue:0,useNativeDriver:true,bounciness:0,speed:22}),
      Animated.spring(translateY,{toValue:0,useNativeDriver:true,bounciness:0,speed:22}),
    ]).start();
    onZoomStateChange?.(false);
  };

  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:e=>e.nativeEvent.touches.length>=2||scaleRef.current>1.02,
    onStartShouldSetPanResponderCapture:e=>e.nativeEvent.touches.length>=2,
    onMoveShouldSetPanResponder:(e,g)=>e.nativeEvent.touches.length>=2||(scaleRef.current>1.02&&(Math.abs(g.dx)>1||Math.abs(g.dy)>1)),
    onMoveShouldSetPanResponderCapture:e=>e.nativeEvent.touches.length>=2||scaleRef.current>1.02,
    onPanResponderGrant:e=>{
      const touches=e.nativeEvent.touches;
      if(touches.length>=2){
        pinchStart.current={distance:touchDistance(touches),scale:scaleRef.current,x:offsetRef.current.x,y:offsetRef.current.y};
        onZoomStateChange?.(true);
      }else{
        panStart.current={...offsetRef.current};
      }
    },
    onPanResponderMove:(e,g)=>{
      const touches=e.nativeEvent.touches;
      if(touches.length>=2){
        const d=touchDistance(touches);
        if(pinchStart.current.distance>0){
          const next=pinchStart.current.scale*(d/pinchStart.current.distance);
          apply(next,pinchStart.current.x,pinchStart.current.y);
        }
      }else if(scaleRef.current>1.02){
        apply(scaleRef.current,panStart.current.x+g.dx,panStart.current.y+g.dy);
      }
    },
    onPanResponderRelease:()=>{
      if(scaleRef.current<=1.04)reset(); else apply(scaleRef.current,offsetRef.current.x,offsetRef.current.y);
    },
    onPanResponderTerminate:()=>{
      if(scaleRef.current<=1.04)reset(); else apply(scaleRef.current,offsetRef.current.x,offsetRef.current.y);
    },
    onPanResponderTerminationRequest:()=>false,
    onShouldBlockNativeResponder:()=>true,
  }),[onZoomStateChange,resolvedHeight,scale,translateX,translateY,width]);

  return <View accessible accessibilityLabel="صفحة قابلة للتكبير بإصبعين" style={[styles.viewport,{width,height:resolvedHeight}]} {...responder.panHandlers}>
    <Animated.View style={{width,height:resolvedHeight,transform:[{translateX},{translateY},{scale}]}}>
      <PdfPage assetName={assetName} pageIndex={pageIndex} width={width} height={resolvedHeight} overlay={overlay}/>
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({viewport:{alignSelf:'center',overflow:'hidden'}});
