import React, {useMemo, useRef} from 'react';
import {Animated, PanResponder, StyleSheet, View} from 'react-native';
import {A4_ASPECT} from '../../app/theme';
import {PdfPage} from './PdfPage';
import {clampTranslation, clampZoom, MIN_ZOOM} from './zoomModel';

function touchDistance(touches: readonly {pageX: number; pageY: number}[]): number {
  if (touches.length < 2) return 0;
  const first = touches[0]!;
  const second = touches[1]!;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

export function ZoomablePdfPage({
  assetName,
  pageIndex,
  width,
  overlay,
  onZoomStateChange,
}: {
  assetName: string;
  pageIndex: number;
  width: number;
  overlay?: React.ReactNode;
  onZoomStateChange?: (zoomed: boolean) => void;
}): React.JSX.Element {
  const height = width * A4_ASPECT;
  const scale = useRef(new Animated.Value(MIN_ZOOM)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleRef = useRef(MIN_ZOOM);
  const offsetRef = useRef({x: 0, y: 0});
  const pinchStart = useRef({distance: 0, scale: MIN_ZOOM});
  const panStart = useRef({x: 0, y: 0});

  const setTransform = (nextScale: number, x: number, y: number) => {
    const safeScale = clampZoom(nextScale);
    const safeOffset = clampTranslation(x, y, safeScale, width, height);
    scaleRef.current = safeScale;
    offsetRef.current = safeOffset;
    scale.setValue(safeScale);
    translateX.setValue(safeOffset.x);
    translateY.setValue(safeOffset.y);
  };

  const reset = () => {
    scaleRef.current = MIN_ZOOM;
    offsetRef.current = {x: 0, y: 0};
    Animated.parallel([
      Animated.spring(scale, {toValue: MIN_ZOOM, useNativeDriver: true, bounciness: 0, speed: 20}),
      Animated.spring(translateX, {toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20}),
      Animated.spring(translateY, {toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20}),
    ]).start();
    onZoomStateChange?.(false);
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: event => event.nativeEvent.touches.length >= 2 || scaleRef.current > MIN_ZOOM,
    onMoveShouldSetPanResponder: (event, gesture) => event.nativeEvent.touches.length >= 2 || (scaleRef.current > MIN_ZOOM && (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2)),
    onPanResponderGrant: event => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        pinchStart.current = {distance: touchDistance(touches), scale: scaleRef.current};
        onZoomStateChange?.(true);
      } else {
        panStart.current = offsetRef.current;
      }
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = touchDistance(touches);
        if (pinchStart.current.distance > 0) {
          const nextScale = pinchStart.current.scale * (distance / pinchStart.current.distance);
          setTransform(nextScale, offsetRef.current.x, offsetRef.current.y);
        }
      } else if (scaleRef.current > MIN_ZOOM) {
        setTransform(scaleRef.current, panStart.current.x + gesture.dx, panStart.current.y + gesture.dy);
      }
    },
    onPanResponderRelease: () => {
      if (scaleRef.current <= 1.04) reset();
      else {
        setTransform(scaleRef.current, offsetRef.current.x, offsetRef.current.y);
        onZoomStateChange?.(true);
      }
    },
    onPanResponderTerminate: () => {
      if (scaleRef.current <= 1.04) reset();
      else onZoomStateChange?.(true);
    },
    onPanResponderTerminationRequest: () => scaleRef.current <= MIN_ZOOM,
  }), [height, onZoomStateChange, scale, translateX, translateY, width]);

  return (
    <View accessible accessibilityLabel="صفحة قابلة للتكبير" style={[styles.viewport, {width, height}]} {...responder.panHandlers}>
      <Animated.View style={{width, height, transform: [{translateX}, {translateY}, {scale}]}}>
        <PdfPage assetName={assetName} pageIndex={pageIndex} width={width} overlay={overlay} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {alignSelf: 'center', overflow: 'hidden'},
});
