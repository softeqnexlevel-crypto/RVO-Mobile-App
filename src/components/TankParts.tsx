// src/components/TankParts.tsx  — StatusBadge, HealthBar, simple bar/line charts for the Tanks screen.
import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { monotonePath, niceTicks } from '../lib/trendMath';

const BADGES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Maintenance: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  Standby: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9' },
  Offline: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  Warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Empty: { bg: 'rgba(239,68,68,0.18)', color: '#ef4444' },
  Refilling: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9' },
};

export function StatusBadge({ status }: { status: string }) {
  const c = BADGES[status] ?? { bg: 'rgba(77,122,158,0.12)', color: '#4d7a9e' };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]} accessibilityLabel={`Status ${status}`}>
      <View style={[s.badgeDot, { backgroundColor: c.color }]} />
      <Text style={[s.badgeText, { color: c.color }]}>{status}</Text>
    </View>
  );
}

export function HealthBar({ value }: { value: number }) {
  const v = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const color = v >= 80 ? '#22c55e' : v >= 60 ? '#eab308' : '#ef4444';
  return (
    <View style={s.healthRow} accessibilityLabel={`Health ${Math.round(v)} percent`}>
      <View style={s.healthTrack}><View style={{ width: `${v}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} /></View>
      <Text style={[s.healthText, { color }]}>{Math.round(v)}%</Text>
    </View>
  );
}

type Datum = { label: string; value: number };

export function MiniBarChart({ data, color = '#06b6d4', height = 130, unit = '' }: { data: Datum[]; color?: string; height?: number; unit?: string }) {
  const [w, setW] = useState(0);
  const PAD = { l: 46, r: 6, t: 14, b: 20 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = niceTicks(0, max, 4);
  const top = ticks[ticks.length - 1] || 1;
  const pw = Math.max(0, w - PAD.l - PAD.r), ph = height - PAD.t - PAD.b;
  const bw = pw / Math.max(data.length, 1);
  return (
    <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setW(Math.floor(e.nativeEvent.layout.width))}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {ticks.map((t) => {
            const y = PAD.t + ph - (t / top) * ph;
            return (
              <React.Fragment key={t}>
                <Line x1={PAD.l} x2={PAD.l + pw} y1={y} y2={y} stroke="rgba(14,165,233,0.1)" strokeDasharray="3 3" />
                <SvgText x={PAD.l - 6} y={y + 3} fontSize={9} fill="#4d7a9e" textAnchor="end" fontFamily={FONT.mono}>{t}{unit}</SvgText>
              </React.Fragment>
            );
          })}
          {data.map((d, i) => {
            const h = (d.value / top) * ph;
            const bwid = Math.min(48, bw * 0.55);
            const x = PAD.l + i * bw + (bw - bwid) / 2;
            return (
              <React.Fragment key={d.label}>
                <Rect x={x} y={PAD.t + ph - h} width={bwid} height={h} rx={3} fill={color} />
                <SvgText x={x + bwid / 2} y={PAD.t + ph - h - 4} fontSize={9} fill="#e5e7eb" textAnchor="middle" fontFamily={FONT.mono}>{Math.round(d.value)}</SvgText>
                <SvgText x={x + bwid / 2} y={height - 5} fontSize={9} fill="#4d7a9e" textAnchor="middle">{d.label}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

export function MiniLineChart({ data, color = '#06b6d4', height = 100, domain, fmt = (v: number) => String(Math.round(v)) }: { data: Datum[]; color?: string; height?: number; domain?: [number, number]; fmt?: (v: number) => string }) {
  const [w, setW] = useState(0);
  const PAD = { l: 30, r: 8, t: 8, b: 18 };
  const vals = data.map((d) => d.value);
  const lo = domain ? domain[0] : Math.min(...vals), hi = domain ? domain[1] : Math.max(...vals);
  const ticks = niceTicks(lo, hi, 3);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const pw = Math.max(0, w - PAD.l - PAD.r), ph = height - PAD.t - PAD.b;
  const X = (i: number) => PAD.l + (data.length <= 1 ? pw / 2 : (i / (data.length - 1)) * pw);
  const Y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * ph;
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.value) }));
  return (
    <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setW(Math.floor(e.nativeEvent.layout.width))}>
      {w > 0 && data.length > 0 && (
        <Svg width={w} height={height}>
          {ticks.map((t) => (
            <SvgText key={t} x={PAD.l - 5} y={Y(t) + 3} fontSize={8} fill="#4d7a9e" textAnchor="end">{fmt(t)}</SvgText>
          ))}
          <Path d={monotonePath(pts)} stroke={color} strokeWidth={1.5} fill="none" />
          {pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />)}
          {data.map((d, i) => (
            <SvgText key={d.label + i} x={X(i)} y={height - 4} fontSize={8} fill="#4d7a9e" textAnchor="middle">{d.label}</SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontFamily: FONT.medium },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthTrack: { width: 60, height: 4, backgroundColor: colors.surfaceContainerHigh, borderRadius: 2, overflow: 'hidden' },
  healthText: { fontSize: 10, fontFamily: FONT.mono, minWidth: 28 },
});