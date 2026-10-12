// src/app/ProductionScreen.tsx
//
// Answers one question fast: "Are we on target, and is flow healthy right now?"
// Totals come from the backend (GET /api/production-summary), the same source as the website.
// No sample numbers: if the totals can't be loaded, the screen shows "--" and an error banner.
//
//   1. Range selector (Today / Week / Month / Year)
//   2. Hero: produced vs target, expected-pace marker, pace status, and required flow (today)
//   3. Three tiles: permeate flow now, recovery, feed flow now
//   4. One chart: permeate flow over time (recorded history)

import React, { useContext, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';

import { colors, radii, spacing, toneColor, type Tone } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import StatusPill from '../components/StatusPill';
import FlowAreaChart from '../components/FlowAreaChart';
import { useTags } from '../state/useTags';

import { useProductionTotals } from '../state/useProductionTotals';
import { toPts } from '../lib/trendMath';

type Range = 'today' | 'week' | 'month' | 'year';
type ChartRange = '1h' | '24h';

const RANGES: { key: Range; label: string; noun: string }[] = [
  { key: 'today', label: 'Today', noun: 'today' },
  { key: 'week', label: 'Week', noun: 'this week' },
  { key: 'month', label: 'Month', noun: 'this month' },
  { key: 'year', label: 'Year', noun: 'this year' },
];

const RECOVERY_TARGET = 75;
const CHART_TAG = 'RO5-Permeateflow'; // production = permeate

// Same targets as the website: daily 1100 m³; week = x7, month = x30, year = x365.
const DAILY_TARGET = 1100;
const TARGETS: Record<Range, number> = {
  today: DAILY_TARGET,
  week: DAILY_TARGET * 7,
  month: DAILY_TARGET * 30,
  year: DAILY_TARGET * 365,
};

const fmt = (n: number) => Math.round(n).toLocaleString();

/** How far through the period we are (0..1) and how many days remain. */
function periodProgress(range: Range, now = new Date()) {
  const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
  if (range === 'today') return { frac: dayFrac, daysLeft: 1 - dayFrac };
  if (range === 'week') {
    const dow = (now.getDay() + 6) % 7; // Monday = 0
    return { frac: (dow + dayFrac) / 7, daysLeft: 7 - (dow + dayFrac) };
  }
  if (range === 'month') {
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsed = now.getDate() - 1 + dayFrac;
    return { frac: elapsed / dim, daysLeft: dim - elapsed };
  }
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const frac = (now.getTime() - start) / (end - start);
  const days = (end - start) / 86_400_000;
  return { frac, daysLeft: days * (1 - frac) };
}

export default function ProductionScreen() {
  const tabBarH = useContext(BottomTabBarHeightContext) ?? 0;
  const { num, history } = useTags();
  const totals = useProductionTotals();

  const [range, setRange] = useState<Range>('today');
  const [chartRange, setChartRange] = useState<ChartRange>('24h');

  const meta = RANGES.find((r) => r.key === range)!;
  const target = TARGETS[range];

  /* ---- backend totals (null = not loaded yet / no data) ---- */
  const p = totals.data?.permeate;
  const produced: number | null =
    !p ? null : range === 'today' ? p.daily : range === 'week' ? p.weekly : range === 'month' ? p.monthly : p.yearly;

  /* ---- live values (null = no signal) ---- */
  const permeateFlow = num(CHART_TAG);
  const feedFlow = num('RO5-FEEDFlow');
  const recovery = num('RO5-SystemRecovery');

  /* ---- progress vs target, judged against expected pace ---- */
  const { frac, daysLeft } = periodProgress(range);
  const hasTotal = produced !== null;
  const pct = hasTotal ? (produced / target) * 100 : 0;
  const toGo = hasTotal ? Math.max(0, target - produced) : 0;
  const paceRatio = hasTotal ? produced / (target * Math.max(frac, 0.05)) : 0;

  const pace: { label: string; tone: Tone } = !hasTotal
    ? { label: totals.loading ? 'Loading' : 'No data', tone: 'neutral' }
    : produced >= target
      ? { label: 'Target reached', tone: 'nominal' }
      : paceRatio >= 0.95
        ? { label: 'On pace', tone: 'nominal' }
        : paceRatio >= 0.8
          ? { label: 'Slightly behind', tone: 'warning' }
          : { label: 'Behind pace', tone: 'critical' };
  const paceColor = toneColor(pace.tone);

  // Today only: the flow rate needed to still finish on target.
  const hoursLeft = Math.max(0.25, 24 * (1 - frac));
  const requiredRate = hasTotal && range === 'today' && toGo > 0 ? toGo / hoursLeft : null;
  const flowOk = requiredRate !== null && permeateFlow !== null ? permeateFlow >= requiredRate : null;

  const guidance = !hasTotal
    ? { text: totals.loading ? 'Loading production totals…' : 'Production totals unavailable', color: colors.onSurfaceVariant, icon: 'hourglass-empty' as const }
    : produced >= target
      ? { text: 'Target reached', color: colors.tertiary, icon: 'check-circle-outline' as const }
      : requiredRate !== null
        ? {
            text: `Needs ${requiredRate.toFixed(1)} m³/h to hit target${permeateFlow !== null ? ` · now ${permeateFlow.toFixed(1)}` : ''}`,
            color: flowOk === false ? colors.secondary : colors.onSurfaceVariant,
            icon: 'speed' as const,
          }
        : {
            text: `${fmt(toGo)} m³ to go · ${Math.ceil(daysLeft)} day${Math.ceil(daysLeft) === 1 ? '' : 's'} left`,
            color: colors.onSurfaceVariant,
            icon: 'event' as const,
          };

  /* ---- chart data from recorded history ---- */
  const chartData = useMemo(() => {
    const pts = toPts(history[CHART_TAG]);
    if (pts.length === 0) return [];
    const now = Date.now();
    const spanMs = chartRange === '24h' ? 24 * 3_600_000 : 3_600_000;
    const buckets = chartRange === '24h' ? 12 : 6;
    const bucketMs = spanMs / buckets;
    return Array.from({ length: buckets }, (_, i) => {
      const from = now - spanMs + i * bucketMs;
      const to = from + bucketMs;
      const inB = pts.filter((q) => q.t >= from && q.t < to).map((q) => q.v);
      const avg = inB.length ? inB.reduce((a, b) => a + b, 0) / inB.length : null;
      const d = new Date(from);
      const label =
        chartRange === '24h'
          ? `${String(d.getHours()).padStart(2, '0')}:00`
          : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return avg !== null ? { label, value: avg } : null;
    }).filter(Boolean) as { label: string; value: number }[];
  }, [history, chartRange]);

  const recDelta = recovery !== null ? recovery - RECOVERY_TARGET : null;

  return (
    <View style={s2.root}>
      <AppHeader title="Production" />

      <ScrollView
        contentContainerStyle={[s2.scroll, { paddingBottom: tabBarH + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Error banner: totals could not be loaded */}
        {totals.error && (
          <View style={s2.errorBox} accessibilityRole="alert">
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={s2.errorText} numberOfLines={2}>
              Couldn’t load production totals ({totals.error}).
            </Text>
            <Pressable onPress={() => totals.refresh()} accessibilityRole="button" accessibilityLabel="Retry loading totals" style={s2.retry}>
              <Text style={s2.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* 1. Range selector */}
        <View style={s2.segment} accessibilityRole="tablist">
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRange(r.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[s2.segBtn, active && s2.segBtnActive]}
              >
                <Text style={[s2.segText, active && s2.segTextActive]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 2. Hero */}
        <View style={s2.hero}>
          <View style={s2.rowBetween}>
            <Text style={s2.eyebrow}>Produced {meta.noun}</Text>
            <StatusPill label={pace.label} tone={pace.tone} dot={false} />
          </View>

          <View style={s2.valueRow}>
            <Text style={s2.heroValue}>{hasTotal ? fmt(produced) : '--'}</Text>
            <Text style={s2.heroUnit}>m³</Text>
            <Text style={s2.heroTarget}>of {fmt(target)} target</Text>
          </View>

          <View style={s2.barWrap}>
            <View style={s2.barTrack}>
              <View style={[s2.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: paceColor }]} />
            </View>
            {/* Expected-pace marker */}
            <View style={[s2.marker, { left: `${Math.min(100, frac * 100)}%` }]} />
          </View>
          <View style={[s2.rowBetween, { marginTop: 6 }]}>
            <Text style={s2.caption}>{hasTotal ? `${pct.toFixed(0)}% of target` : '--'}</Text>
            <Text style={s2.caption}>Marker = expected pace</Text>
          </View>

          <View style={s2.guidance}>
            <MaterialIcons name={guidance.icon} size={14} color={guidance.color} />
            <Text style={[s2.guidanceText, { color: guidance.color }]} numberOfLines={2}>
              {guidance.text}
            </Text>
          </View>
        </View>

        {/* 3. Key tiles */}
        <View style={s2.tiles}>
          <Tile
            label="Flow now"
            value={permeateFlow !== null ? permeateFlow.toFixed(1) : '--'}
            sub="m³/h permeate"
            tone={flowOk === null ? 'info' : flowOk ? 'nominal' : 'warning'}
          />
          <Tile
            label="Recovery"
            value={recovery !== null ? `${recovery.toFixed(1)}%` : '--'}
            sub={
              recDelta !== null
                ? `${recDelta >= 0 ? '+' : '−'}${Math.abs(recDelta).toFixed(1)} vs ${RECOVERY_TARGET}% target`
                : 'No signal'
            }
            tone={recDelta === null ? 'neutral' : recDelta >= 0 ? 'nominal' : 'warning'}
          />
          <Tile
            label="Feed flow"
            value={feedFlow !== null ? feedFlow.toFixed(1) : '--'}
            sub="m³/h feed"
            tone={feedFlow === null ? 'neutral' : 'info'}
          />
        </View>

        {/* 4. Chart */}
        <View style={s2.card}>
          <View style={[s2.rowBetween, { marginBottom: spacing.sm }]}>
            <View>
              <Text style={s2.cardTitle}>Permeate flow</Text>
              <Text style={s2.caption}>m³/h, {chartRange === '24h' ? 'last 24 hours' : 'last hour'}</Text>
            </View>
            <View style={s2.chartToggle}>
              {(['1h', '24h'] as ChartRange[]).map((r) => {
                const active = chartRange === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setChartRange(r)}
                    style={[s2.toggleBtn, active && s2.toggleBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s2.toggleText, active && { color: colors.onPrimary }]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {chartData.length > 1 ? (
            <FlowAreaChart data={chartData} height={150} stroke={colors.primary} showAvgLine avgLabel="Avg" />
          ) : (
            <Text style={s2.empty}>Waiting for flow data…</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- Small pieces ---------- */

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: Tone }) {
  return (
    <View style={s2.tile} accessible accessibilityLabel={`${label}: ${value}, ${sub}`}>
      <Text style={s2.tileLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s2.tileValue, { color: toneColor(tone) }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s2.tileSub} numberOfLines={2}>{sub}</Text>
    </View>
  );
}

const s2 = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },

  /* Error banner */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
    backgroundColor: `${colors.error}14`,
  },
  errorText: { flex: 1, fontFamily: FONT.body, fontSize: 12, color: colors.error },
  retry: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, backgroundColor: `${colors.error}26` },
  retryText: { fontFamily: FONT.semibold, fontSize: 11, color: colors.error },

  /* Range selector */
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: 3,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.md },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { fontFamily: FONT.medium, fontSize: 12, color: colors.onSurfaceVariant },
  segTextActive: { fontFamily: FONT.semibold, color: colors.onPrimary },

  /* Hero */
  hero: {
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  eyebrow: { fontFamily: FONT.medium, fontSize: 11, color: colors.onSurfaceVariant },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 6 },
  heroValue: { fontFamily: FONT.semibold, fontSize: 34, color: colors.onSurface, fontVariant: ['tabular-nums'] },
  heroUnit: { fontFamily: FONT.medium, fontSize: 13, color: colors.onSurfaceVariant },
  heroTarget: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant, marginLeft: 4 },

  barWrap: { marginTop: 14, height: 8, justifyContent: 'center' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  marker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 14,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: colors.onSurface,
    opacity: 0.55,
  },
  caption: { fontFamily: FONT.body, fontSize: 10.5, color: colors.onSurfaceVariant },

  guidance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceContainerHigh,
  },
  guidanceText: { flex: 1, fontFamily: FONT.medium, fontSize: 12 },

  /* Tiles */
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    minWidth: 0,
    padding: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    gap: 3,
  },
  tileLabel: { fontFamily: FONT.medium, fontSize: 11, color: colors.onSurfaceVariant },
  tileValue: { fontFamily: FONT.semibold, fontSize: 20, fontVariant: ['tabular-nums'] },
  tileSub: { fontFamily: FONT.body, fontSize: 10, color: colors.onSurfaceVariant },

  /* Chart card */
  card: {
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  cardTitle: { fontFamily: FONT.semibold, fontSize: 13, color: colors.onSurface },
  chartToggle: { flexDirection: 'row', gap: 4 },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontFamily: FONT.medium, fontSize: 11, color: colors.onSurfaceVariant },
  empty: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});