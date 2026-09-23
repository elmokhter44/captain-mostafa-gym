import React from 'react';
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
  card: {...SHADOW, minHeight: 118, backgroundColor: COLORS.paper, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.line, padding: SPACING.lg, justifyContent: 'space-between'},
  pressed: {opacity: 0.82, transform: [{scale: 0.985}]},
  marker: {width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.emerald100, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end'},
  markerText: {color: COLORS.gold700, fontSize: 12},
  textWrap: {marginTop: SPACING.md},
  title: {fontSize: 16, lineHeight: 24, color: COLORS.emerald950, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl'},
  arrow: {position: 'absolute', left: SPACING.md, bottom: SPACING.sm, color: COLORS.gold700, fontSize: 26, minWidth: TOUCH_TARGET, textAlign: 'center'},
});
