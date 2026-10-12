// src/components/FlowBalanceChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { CHART_COLORS } from '../data/sensors';
import { niceTicks } from '../lib/trendMath';

type Props = { feed: number | null; permeate: number | null; concentrate: number | null; recovery: number | null };

export default function FlowBalanceChart({ feed, permeate, concentrate, recovery }: Props) {
  const f = feed ?? 0, p = permeate ?? 0, c = concentrate ?? 0;
  const balance = f - (p + c);
  const balanced = Math.abs(balance) < 0.5;

  if (f === 0 && p === 0 && c === 0) {
    return (
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Text style={styles.title}>Flow Balance</Text>
        <Text style={styles.empty}>Waiting for flow data…</Text>
      </View>
    );
  }

  const ticks = niceTicks(0, Math.max(f, p, c), 5);
  const top = ticks[ticks.length - 1] || 1;
  const rows = [
    { name: 'Feed', v: f, color: CHART_COLORS.primary },
    { name: 'Permeate', v: p, color: CHART_COLORS.success },
    { name: 'Concentrate', v: c, color: CHART_COLORS.warning },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Flow Balance</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.small}>Recovery: <Text style={{ color: CHART_COLORS.success, fontWeight: '700' }}>{recovery === null ? '--' : `${recovery.toFixed(1)}%`}</Text></Text>
          <Text style={{ fontSize: 10, color: balanced ? CHART_COLORS.success : CHART_COLORS.danger }}>
            {balanced ? '✓ Balanced' : `⚠ ${balance.toFixed(2)} m³/h off`}
          </Text>
        </View>
      </View>

      {rows.map((r) => (
        <View key={r.name} style={styles.row} accessibilityLabel={`${r.name} ${r.v.toFixed(2)} cubic metres per hour, ${((r.v / (f || 1)) * 100).toFixed(1)} percent of feed`}>
          <Text style={styles.rowLabel} numberOfLines={1}>{r.name}</Text>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.min(100, (r.v / top) * 100)}%`, backgroundColor: r.color }]} />
          </View>
          <Text style={styles.rowVal}>{r.v.toFixed(1)}</Text>
        </View>
      ))}

      <View style={[styles.row, { marginTop: 2 }]}>
        <View style={{ width: 76 }} />
        <View style={styles.axis}>
          {ticks.map((t) => <Text key={t} style={styles.tick}>{t}</Text>)}
        </View>
        <View style={{ width: 34 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { color: colors.onSurface, fontSize: 15, fontWeight: '700' },
  small: { color: colors.onSurfaceVariant, fontSize: 12 },
  empty: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 68, color: colors.onSurfaceVariant, fontSize: 10, textAlign: 'right' },
  track: { flex: 1, height: 36 },
  bar: { height: '100%', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  rowVal: { width: 34, color: colors.onSurface, fontSize: 11, fontWeight: '600' },
  axis: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  tick: { color: colors.onSurfaceVariant, fontSize: 9 },
});