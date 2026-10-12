// components/StatusPill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, type, toneColor, Tone } from '../theme/tokens';

type Props = {
  label: string;
  tone: Tone;
  dot?: boolean;
};

export default function StatusPill({ label, tone, dot = true }: Props) {
  const color = toneColor(tone);
  return (
    <View style={[styles.pill, { backgroundColor: `${color}26`, borderColor: `${color}59` }]}>
      {dot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[type.labelUppercase, { color, includeFontPadding: false }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
