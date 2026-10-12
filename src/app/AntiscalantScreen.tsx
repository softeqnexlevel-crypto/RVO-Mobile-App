// src/app/AntiscalantScreen.tsx — built only from what the PLC actually reports:
//   RO5-AntiscalantDosingActive (ON/OFF) and RO5-AntiscalantDaily (ml, PLC daily total).
// Live context tiles (recovery, feed tank, EC, flows) use the same tags as the web page.
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import { Pill, C } from '../components/ui';
import { MiniBarChart } from '../components/TankParts';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { ANTISCALANT_ACTIVE_TAG, ANTISCALANT_DAILY } from '../data/extraSensors';
import { useTags } from '../state/useTags';
import { toChartNumber } from '../state/liveData';
import { rawToPercent } from '../lib/feedTankCalibration';
import AppHeader from "../components/AppHeader";
import { RANGES, RangeKey, fmtClock, toPts } from '../lib/trendMath';
import { bucketize, onMinutes, uptimePct } from '../lib/analytics';

const OPTIONS: RangeKey[] = ['1h', '6h', '24h'];
const RANGE_LABEL: Record<string, string> = { '1h': '1 hour', '6h': '6 hours', '24h': '24 hours' };

const fmt = (v: number | null, d = 1) => (v === null ? '—' : v.toFixed(d));

/* ---------- small building blocks ---------- */
function MetricTile({ icon, label, value, unit, color, sub }: {
  icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; unit?: string; color: string; sub?: string;
}) {
  return (
    <View style={s.tile} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}>
      <View style={s.tileHead}>
        <MaterialIcons name={icon} size={13} color={color} />
        <Text style={s.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
      <View style={s.tileValueRow}>
        <Text style={[s.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {!!unit && <Text style={s.tileUnit}>{unit}</Text>}
      </View>
      {!!sub && <Text style={s.tileSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

function LiveTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.liveTile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={s.liveLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.liveValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export default function AntiscalantScreen() {
  const { live, num, running, history } = useTags();
  const [range, setRange] = useState<RangeKey>('24h');

  /* ---- PLC values ---- */
  const dosing = running(ANTISCALANT_ACTIVE_TAG);
  // PLC daily total (ml). Read raw so a real 0 isn't mistaken for "no data", and keep the last value
  // the PLC reported so the figure doesn't blank out when the pump stops and the PLC stops publishing it.
  const lastDaily = useRef<number | null>(null);
  const liveDaily = toChartNumber(live.get(ANTISCALANT_DAILY.tag));
  if (liveDaily !== null) lastDaily.current = liveDaily;
  const daily = liveDaily ?? lastDaily.current;
  const dailyIsLast = liveDaily === null && daily !== null;
  // Always show millilitres as the main figure (e.g. 1498 ml); litres go in the small chip.
  const dailyBig = daily === null ? '—' : Math.round(daily).toString();
  const dailyBigUnit = 'ml';
  const dailySecondary = daily === null ? null : `${(daily / 1000).toFixed(3)} L`;

  const recovery = num('RO5-SystemRecovery');
  const rawTank = num('RO5-FeedTankLevelRaw');
  const tankCal = rawTank === null ? null : rawToPercent(rawTank);
  const tankPct = tankCal === null ? null : Math.min(100, Math.max(0, tankCal));
  const ec = num('RO5-PureWaterEc');
  const feedFlow = num('RO5-FEEDFlow');
  const permeate = num('RO5-Permeateflow');

  const stateColor = dosing === null ? C.grey : dosing ? C.green : C.red;
  const stateText = dosing === null ? 'No data' : dosing ? 'Dosing' : 'Stopped';

  /* ---- dosing history for the selected range (in-app recorder) ---- */
  const d = useMemo(() => {
    const now = Date.now(), from = now - RANGES[range];
    const sig = toPts(history[ANTISCALANT_ACTIVE_TAG]).filter((p) => p.t >= from);
    const n = range === '24h' ? 12 : 6;
    const bars = bucketize(sig, from, now, n, (_b, t0, t1) => (sig.length > 1 ? onMinutes(sig, t0, t1) : null)).map((b) => ({ label: fmtClock(b.t1), value: b.v ?? 0 }));
    return { bars, share: uptimePct(sig), samples: sig.length, totalMin: bars.reduce((a, b) => a + b.value, 0) };
  }, [history, range]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="Antiscalant" />
      <Screen title="Antiscalant">
        {/* Hero: dosing today (PLC) */}
        <LinearGradient
          colors={[`${colors.primary}40`, `${colors.primary}0D`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { borderColor: `${colors.primary}55` }]}
        >
          <View style={s.between}>
            <View style={s.row}>
              <Ionicons name="flask-outline" size={15} color={C.blue} />
              <Text style={s.heroLabel}>DOSING TODAY</Text>
            </View>
            <Pill label={stateText} color={stateColor} />
          </View>

          <View style={s.big}>
            <Text style={[s.bigValue, { color: C.blue }]} numberOfLines={1} adjustsFontSizeToFit>{dailyBig}</Text>
            <Text style={s.bigUnit}>{dailyBigUnit}</Text>
            {dailySecondary && (
              <View style={s.altChip}><Text style={s.altChipText}>{dailySecondary}</Text></View>
            )}
          </View>
          <Text style={s.sub}>
            {daily === null
              ? 'Waiting for the PLC daily total'
              : dailyIsLast
                ? 'Dosed today · last value reported by the PLC'
                : 'Dosed today · reported by the PLC'}
          </Text>

          <View style={s.rule} />
          <View style={s.miniRow}>
            <MetricTile icon="autorenew" label="Recovery" value={fmt(recovery)} unit="%" color={C.amber} sub={feedFlow === null ? undefined : `${feedFlow.toFixed(1)} m³/h feed`} />
            <MetricTile icon="water-drop" label="Feed tank" value={fmt(tankPct)} unit="%" color={C.green} />
          </View>
        </LinearGradient>

        {/* Range selector */}
        <View style={s.seg}>
          {OPTIONS.map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={[s.segBtn, range === r && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: range === r }}>
              <Text style={[s.segText, range === r && { color: '#fff' }]}>{RANGE_LABEL[r]}</Text>
            </Pressable>
          ))}
        </View>

        {/* Dosing activity for the selected range */}
        <View style={s.miniRow}>
          <LinearGradient colors={[`${colors.primary}1A`, `${colors.primary}05`]} style={[s.statCard, { borderLeftColor: colors.primary }]}>
            <Text style={s.statLabel}>TIME DOSING · {RANGE_LABEL[range].toUpperCase()}</Text>
            <View style={s.tileValueRow}>
              <Text style={[s.statValue, { color: C.blue }]}>{d.share === null ? '—' : d.share.toFixed(0)}</Text>
              <Text style={s.tileUnit}>%</Text>
            </View>
          </LinearGradient>
          <LinearGradient colors={[`${colors.tertiary}1A`, `${colors.tertiary}05`]} style={[s.statCard, { borderLeftColor: colors.tertiary }]}>
            <Text style={s.statLabel}>DOSING MINUTES · {RANGE_LABEL[range].toUpperCase()}</Text>
            <View style={s.tileValueRow}>
              <Text style={[s.statValue, { color: C.green }]}>{d.samples > 1 ? d.totalMin.toFixed(0) : '—'}</Text>
              <Text style={s.tileUnit}>min</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Chart */}
        <View style={s.card}>
          <View style={s.row}>
            <MaterialIcons name="bar-chart" size={14} color={C.blue} />
            <Text style={s.cardTitle}>MINUTES DOSING PER INTERVAL</Text>
          </View>
          {d.samples < 2 ? (
            <Text style={s.empty}>Not enough data yet. Keep the app open for a few minutes.</Text>
          ) : (
            <MiniBarChart data={d.bars} unit="" height={150} />
          )}
        </View>

        {/* Live system context (same tags as the web page) */}
        <View style={s.card}>
          <View style={s.between}>
            <View style={s.row}>
              <MaterialIcons name="sensors" size={14} color={C.blue} />
              <Text style={s.cardTitle}>SYSTEM STATUS</Text>
            </View>
            <Text style={s.live}>LIVE</Text>
          </View>
          <View style={s.liveGrid}>
            <LiveTile label="Dosing pump" value={dosing === null ? '—' : dosing ? 'ON' : 'OFF'} color={stateColor} />
            <LiveTile label="Product EC" value={fmt(ec)} color={C.green} />
            <LiveTile label="Feed flow" value={fmt(feedFlow)} color={C.blue} />
            <LiveTile label="Permeate" value={fmt(permeate)} color={C.blue} />
          </View>
        </View>

        <Text style={s.note}>Chemical tank level and dose rate aren’t reported by the PLC, so they aren’t shown.</Text>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },

  hero: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 6, overflow: 'hidden' },
  heroLabel: { fontFamily: FONT.semibold, fontSize: 10, letterSpacing: 1.2, color: colors.onSurfaceVariant },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  bigValue: { fontFamily: FONT.monoBold, fontSize: 44, flexShrink: 1 },
  bigUnit: { fontFamily: FONT.mono, fontSize: 15, color: colors.onSurfaceVariant },
  altChip: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh },
  altChipText: { fontFamily: FONT.mono, fontSize: 11, color: colors.onSurfaceVariant },
  sub: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.onSurfaceVariant, opacity: 0.3, marginVertical: spacing.sm },
  miniRow: { flexDirection: 'row', gap: spacing.sm },

  tile: { flex: 1, minWidth: 0, gap: 2 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLabel: { fontFamily: FONT.semibold, fontSize: 10, letterSpacing: 0.6, color: colors.onSurfaceVariant },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  tileValue: { fontFamily: FONT.monoBold, fontSize: 22, flexShrink: 1 },
  tileUnit: { fontFamily: FONT.mono, fontSize: 11, color: colors.onSurfaceVariant },
  tileSub: { fontFamily: FONT.body, fontSize: 10, color: colors.onSurfaceVariant },

  seg: { flexDirection: 'row', gap: spacing.sm },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.onSurfaceVariant },

  statCard: {
    flex: 1, minWidth: 0, gap: 6, padding: spacing.sm + 4, borderRadius: radii.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.surfaceContainerHigh, borderLeftWidth: 3,
  },
  statLabel: { fontFamily: FONT.semibold, fontSize: 9, letterSpacing: 0.8, color: colors.onSurfaceVariant },
  statValue: { fontFamily: FONT.monoBold, fontSize: 26 },

  card: {
    gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.surfaceContainerHigh,
  },
  cardTitle: { fontFamily: FONT.semibold, fontSize: 11, letterSpacing: 1.2, color: colors.onSurfaceVariant },
  live: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.green },
  liveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  liveTile: {
    flexBasis: '47%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm + 2,
    borderRadius: radii.md, backgroundColor: colors.surfaceContainer,
  },
  liveLabel: { fontFamily: FONT.body, fontSize: 10, color: colors.onSurfaceVariant },
  liveValue: { fontFamily: FONT.monoBold, fontSize: 20 },

  empty: { fontFamily: FONT.body, fontSize: 13, color: colors.onSurfaceVariant, paddingVertical: 20, textAlign: 'center' },
  note: { fontFamily: FONT.body, fontSize: 11, color: colors.onSurfaceVariant },
}); 