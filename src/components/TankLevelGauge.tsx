// src/components/TankLevelGauge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export const TANK_BANDS = [
  { key: 'low', label: 'Low', min: 0, max: 25, color: '#ef4444', top: '#f87171', bottom: '#b91c1c', statusLabel: 'Low' },
  { key: 'mid', label: 'Warning', min: 25, max: 50, color: '#eab308', top: '#facc15', bottom: '#a16207', statusLabel: 'Warning' },
  { key: 'top', label: 'Normal', min: 50, max: 100, color: '#22c55e', top: '#4ade80', bottom: '#15803d', statusLabel: 'Normal' },
] as const;

export function classifyTankLevel(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v < 25 ? TANK_BANDS[0] : v < 50 ? TANK_BANDS[1] : TANK_BANDS[2];
}

// Default dimensions reduced for mobile
type Props = { value: number | null; width?: number; height?: number };

export default function TankLevelGauge({ value, width = 80, height = 140 }: Props) {
  const has = typeof value === 'number' && Number.isFinite(value);
  const pct = has ? Math.max(0, Math.min(100, value as number)) : 0;
  const band = has ? classifyTankLevel(pct) : null;
  const color = band?.color ?? '#64748b';
  const top = band?.top ?? '#94a3b8';
  const bottom = band?.bottom ?? '#475569';
  const fillH = (pct / 100) * height;

  return (
    <View style={[styles.shell, { width, height, borderRadius: 10, backgroundColor: `${color}38` }]} accessibilityLabel={has ? `Tank level ${pct.toFixed(1)} percent` : 'Tank level: no data'}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="tank-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={height - fillH} width={width} height={fillH} fill="url(#tank-fill)" />
      </Svg>
      <Text style={[styles.value, { fontSize: Math.max(10, Math.round(width * 0.24)) }]} numberOfLines={1}>
        {has ? `${pct.toFixed(1)}%` : '--'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden', borderWidth: 2, borderColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  value: { color: '#fff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});