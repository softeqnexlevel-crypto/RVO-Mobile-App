// src/components/RingGauge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { TONE_HEX, InstrumentTone } from './InstrumentCard';

type Props = { value: number | null; label: string; status: string; tone: InstrumentTone; size?: number };

export default function RingGauge({ value, label, status, tone, size = 84 }: Props) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const color = TONE_HEX[tone];
  return (
    <View style={styles.wrap} accessibilityLabel={`${label} ${value === null ? 'no data' : Math.round(pct) + ' percent'}, ${status}`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#262626" strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`}
            rotation={-90} origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.value, { color }]}>{value === null ? '--' : `${Math.round(pct)}%`}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.status, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 18, fontWeight: '700' },
  label: { color: colors.onSurfaceVariant, fontSize: 10 },
  status: { fontSize: 11, fontWeight: '700' },
});