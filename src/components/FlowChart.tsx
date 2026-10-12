// components/FlowChart.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Polygon, Circle } from 'react-native-svg';
import { colors, radii, spacing, type } from '../theme/tokens';

const RANGES = ['1H', '6H', '24H', '7D'] as const;
type Range = (typeof RANGES)[number];

// Demo series per range — swap for live telemetry once wired to your API.
const SERIES: Record<Range, { feed: number[]; permeate: number[] }> = {
  '1H': { feed: [35, 32, 30, 25, 20, 18, 22, 24, 22], permeate: [45, 48, 52, 50, 75, 100, 100, 100, 100] },
  '6H': { feed: [50, 45, 30, 22, 18, 20, 22, 24, 22], permeate: [20, 25, 40, 55, 75, 90, 100, 100, 100] },
  '24H': { feed: [60, 40, 25, 20, 18, 15, 18, 20, 22], permeate: [10, 15, 30, 50, 70, 85, 95, 100, 100] },
  '7D': { feed: [55, 50, 45, 35, 25, 20, 18, 20, 22], permeate: [15, 20, 30, 45, 60, 80, 95, 100, 100] },
};

const CHART_W = 320;
const CHART_H = 100;

function toPath(values: number[]) {
  const step = CHART_W / (values.length - 1);
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${v}`).join(' ');
}

function toPolygon(values: number[]) {
  const step = CHART_W / (values.length - 1);
  const top = values.map((v, i) => `${i * step},${v}`).join(' ');
  return `0,${CHART_H} ${top} ${CHART_W},${CHART_H}`;
}

export default function FlowChart() {
  const [range, setRange] = useState<Range>('1H');
  const data = SERIES[range];

  const feedPath = useMemo(() => toPath(data.feed), [data]);
  const permPath = useMemo(() => toPath(data.permeate), [data]);
  const feedPoly = useMemo(() => toPolygon(data.feed), [data]);
  const permPoly = useMemo(() => toPolygon(data.permeate), [data]);

  const feedLast = data.feed[data.feed.length - 1];
  const permLast = data.permeate[data.permeate.length - 1];

  const avg = (data.feed.reduce((a, b) => a + b, 0) / data.feed.length).toFixed(1);
  const min = Math.min(...data.feed).toFixed(1);
  const max = Math.max(...data.feed).toFixed(1);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[type.headlineSm, { color: colors.onSurface, fontWeight: '700' as any }]}>Flow Analysis</Text>
        <View style={styles.tabs}>
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[styles.tab, active && { backgroundColor: colors.primary }]}
                hitSlop={6}
              >
                <Text
                  style={[
                    type.labelUppercase,
                    { fontSize: 10, color: active ? colors.onPrimary : colors.onSurfaceVariant },
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
          <Text style={[type.labelTabular, { fontSize: 11, color: colors.onSurfaceVariant }]}>Feed Flow</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.tertiary }]} />
          <Text style={[type.labelTabular, { fontSize: 11, color: colors.onSurfaceVariant }]}>Permeate Flow</Text>
        </View>
      </View>

      <View style={styles.chartBox}>
        <Svg width="100%" height={130} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="feedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="permGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.tertiary} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={colors.tertiary} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          <Polygon points={feedPoly} fill="url(#feedGrad)" />
          <Path d={feedPath} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" />

          <Polygon points={permPoly} fill="url(#permGrad)" />
          <Path
            d={permPath}
            stroke={colors.tertiary}
            strokeWidth={2}
            fill="none"
            strokeDasharray="3,3"
          />

          <Circle cx={CHART_W} cy={feedLast} r={3.5} fill={colors.primary} />
          <Circle cx={CHART_W} cy={permLast} r={3.5} fill={colors.tertiary} />
        </Svg>
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>-60m</Text>
          <Text style={styles.axisLabel}>-45m</Text>
          <Text style={styles.axisLabel}>-30m</Text>
          <Text style={styles.axisLabel}>-15m</Text>
          <Text style={[styles.axisLabel, { color: colors.primary, fontWeight: '700' as any }]}>Now</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>MIN FLOW</Text>
          <Text style={[type.labelTabular, { color: colors.onSurface, fontWeight: '700' as any }]}>
            {min} <Text style={styles.statUnit}>m³/h</Text>
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>AVG FLOW</Text>
          <Text style={[type.labelTabular, { color: colors.primary, fontWeight: '700' as any }]}>
            {avg} <Text style={styles.statUnit}>m³/h</Text>
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>MAX FLOW</Text>
          <Text style={[type.labelTabular, { color: colors.tertiary, fontWeight: '700' as any }]}>
            {max} <Text style={styles.statUnit}>m³/h</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: 2,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 2,
    borderRadius: 2,
  },
  chartBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.lg,
    padding: spacing.xs,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  axisLabel: {
    fontSize: 10,
    fontFamily: undefined,
    color: colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 9,
    color: colors.outline,
  },
});
