// src/app/TanksScreen.tsx
import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { ClipPath, Defs, G, LinearGradient as SvgGradient, Line, Path, Rect, Stop } from 'react-native-svg';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { HealthBar, MiniBarChart, MiniLineChart, StatusBadge } from '../components/TankParts';
import AppHeader from '../components/AppHeader';
import { useTags } from '../state/useTags';
import { rawToPercent } from '../lib/feedTankCalibration';
import { fmtClock, toPts } from '../lib/trendMath';

const TONE_OK = colors.tertiary;
const TONE_WARN = colors.secondary;
const TONE_BAD = colors.error;
const TONE_NEUTRAL = colors.outline;
const TONE_INFO = colors.primary;

const FILTERS = ['All', 'Active', 'Standby', 'Warning', 'Empty', 'Maintenance'] as const;

type Tank = {
  id: string;
  name: string;
  location: string;
  status: string;
  level: number;
  capacity: number;
  volume: number;
  dailyConsumption: number;
  monthlyConsumption: number;
  health: number;
  lastMaintenance: string;
  nextMaintenance: string;
  estimated?: boolean;
};

const levelColor = (has: boolean, v: number) =>
  !has ? TONE_NEUTRAL : v > 50 ? TONE_OK : v > 25 ? TONE_WARN : TONE_BAD;

const classifyLevel = (level: number, has: boolean): string => {
  if (!has) return 'Offline';
  if (level <= 0) return 'Empty';
  if (level > 70) return 'Active';
  if (level > 40) return 'Standby';
  if (level > 15) return 'Warning';
  return 'Empty';
};

const ymd = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function TankVisual({ level, has, color, width = 70, height = 118 }: {
  level: number; has: boolean; color: string; width?: number; height?: number;
}) {
  const pad = 3;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const fillH = has ? (innerH * Math.min(100, Math.max(0, level))) / 100 : 0;
  const y = pad + innerH - fillH;
  const wave = `M${pad},${y} q${innerW / 4},-4 ${innerW / 2},0 t${innerW / 2},0 L${pad + innerW},${y + 8} L${pad},${y + 8} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="tankFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={0.45} />
        </SvgGradient>
        <ClipPath id="tankClip">
          <Rect x={pad} y={pad} width={innerW} height={innerH} rx={10} />
        </ClipPath>
      </Defs>
      <Rect x={pad} y={pad} width={innerW} height={innerH} rx={10} fill={`${color}14`} />
      <G clipPath="url(#tankClip)">
        {has && fillH > 0 && <Rect x={pad} y={y} width={innerW} height={fillH} fill="url(#tankFill)" />}
        {has && fillH > 8 && fillH < innerH - 4 && <Path d={wave} fill={color} opacity={0.55} />}
        {[25, 50, 75].map((p) => {
          const ty = pad + innerH - (innerH * p) / 100;
          return <Line key={p} x1={pad} x2={pad + 9} y1={ty} y2={ty} stroke={colors.onSurfaceVariant} strokeOpacity={0.5} strokeWidth={1} />;
        })}
      </G>
      <Rect x={1} y={1} width={width - 2} height={height - 2} rx={12} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={2} />
    </Svg>
  );
}

function LevelBar({ level, has, color }: { level: number; has: boolean; color: string }) {
  const pct = has ? Math.min(100, Math.max(0, level)) : 0;
  return (
    <View style={s.levelTrack}>
      {pct > 0 && (
        <LinearGradient
          colors={[`${color}`, `${color}99`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: 5 }}
        />
      )}
    </View>
  );
}

export default function TanksScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const tabBarH = useContext(BottomTabBarHeightContext) ?? 0;
  const { num, history, lastUpdate } = useTags();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [selectedId, setSelectedId] = useState('FT-A');
  const [sheet, setSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const feedFlow = num('RO5-FEEDFlow') ?? 0;
  const recovery = num('RO5-SystemRecovery') ?? 0;
  const stage1Delta = num('RO5-Stage1Delta') ?? 0;
  const raw = num('RO5-FeedTankLevelRaw');
  const cal = rawToPercent(raw);
  const hasData = cal !== null;
  const level = hasData ? Math.min(100, Math.max(0, cal as number)) : 0;

  const tanks: Tank[] = useMemo(() => {
    const healthOf = (lvl: number, has: boolean) => {
      if (!has) return 0;
      const base = (lvl / 100) * 70 + 30;
      const rec = Math.min(20, (recovery / 100) * 20);
      const penalty = stage1Delta > 0.5 ? 10 : 0;
      return Math.min(100, base + rec - penalty);
    };

    const levelB = level === 0 ? 0 : Math.min(100, Math.max(0, level * 0.85 + 2));

    return [
      {
        id: 'FT-A',
        name: 'Main Feed Tank A',
        location: 'North Plant',
        status: classifyLevel(level, hasData),
        level,
        capacity: 500,
        volume: (level / 100) * 500,
        dailyConsumption: hasData ? feedFlow * 24 * 0.4 : 0,
        monthlyConsumption: hasData ? feedFlow * 24 * 30 * 0.4 : 0,
        health: healthOf(level, hasData),
        lastMaintenance: ymd(-45),
        nextMaintenance: ymd(15),
      },
      {
        id: 'FT-B',
        name: 'Flush Tank',
        location: 'East Plant',
        status: classifyLevel(levelB, hasData),
        level: levelB,
        capacity: 400,
        volume: (levelB / 100) * 400,
        dailyConsumption: hasData ? feedFlow * 24 * 0.35 : 0,
        monthlyConsumption: hasData ? feedFlow * 24 * 30 * 0.35 : 0,
        health: healthOf(levelB, hasData),
        lastMaintenance: ymd(-30),
        nextMaintenance: ymd(20),
        estimated: true,
      },
    ];
  }, [level, hasData, feedFlow, recovery, stage1Delta]);

  const shown = useMemo(
    () => (filter === 'All' ? tanks : tanks.filter((t) => t.status === filter)),
    [tanks, filter]
  );
  const selected = tanks.find((t) => t.id === selectedId) ?? tanks[0];

  const levelHistory = useMemo(() => {
    const pts = toPts(history['RO5-FeedTankLevel']);
    const now = Date.now();
    const span = 4 * 3_600_000;
    return Array.from({ length: 6 }, (_, i) => {
      const from = now - (6 - i) * span;
      const to = from + span;
      const inB = pts.filter((p) => p.t >= from && p.t < to).map((p) => p.v);
      return inB.length
        ? { label: fmtClock(to), value: inB.reduce((a, b) => a + b, 0) / inB.length }
        : null;
    }).filter(Boolean) as { label: string; value: number }[];
  }, [history]);

  const pick = (t: Tank) => {
    setSelectedId(t.id);
    if (!wide) setSheet(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const filters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.xs + 2, alignItems: 'center' }}
    >
      {FILTERS.map((f) => (
        <Pressable
          key={f}
          onPress={() => setFilter(f)}
          style={[s.chip, filter === f && { backgroundColor: TONE_INFO, borderColor: TONE_INFO }]}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === f }}
        >
          <Text style={[s.chipText, filter === f && { color: '#fff' }]}>{f}</Text>
        </Pressable>
      ))}
      <Text style={s.tiny}>{shown.length} shown</Text>
    </ScrollView>
  );

  const list = (
    <View style={{ gap: spacing.sm + 2 }}>
      {shown.length === 0 && (
        <View style={[s.card, { padding: spacing.lg }]}>
          <Text style={[s.sub, { textAlign: 'center' }]}>No tanks match "{filter}".</Text>
        </View>
      )}

      {shown.map((t) => {
        const sel = t.id === selected.id;
        const lc = levelColor(hasData, t.level);
        return (
          <Pressable
            key={t.id}
            onPress={() => pick(t)}
            accessibilityRole="button"
            accessibilityLabel={`${t.name}, ${t.status}, ${hasData ? t.level.toFixed(0) + ' percent' : 'no data'}`}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={[`${lc}1A`, `${lc}05`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                s.card,
                s.tankCard,
                { borderLeftWidth: 3, borderLeftColor: lc },
                sel && { borderColor: TONE_INFO, borderLeftColor: lc },
              ]}
            >
              <View style={s.rowBetween}>
                <View style={s.row}>
                  <View style={s.idPill}>
                    <Text style={s.id}>{t.id}</Text>
                  </View>
                  {t.estimated && (
                    <View style={s.estPill}>
                      <Text style={s.estText}>EST</Text>
                    </View>
                  )}
                </View>
                <View style={s.row}>
                  <StatusBadge status={t.status} />
                  <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
                </View>
              </View>

              <Text style={s.tankName} numberOfLines={1}>{t.name}</Text>
              <View style={s.row}>
                <MaterialIcons name="place" size={11} color={colors.onSurfaceVariant} />
                <Text style={s.tiny}>{t.location}</Text>
              </View>

              <View style={s.levelRow}>
                <Text style={[s.levelBig, { color: lc }]}>{hasData ? `${t.level.toFixed(0)}%` : '--'}</Text>
                <View style={{ flex: 1 }}>
                  <LevelBar level={t.level} has={hasData} color={lc} />
                </View>
              </View>

              <View style={s.statRow}>
                <Stat label="VOLUME" value={hasData ? `${t.volume.toFixed(0)} m³` : '--'} />
                <Stat label="DAILY (EST)" value={hasData ? `${t.dailyConsumption.toFixed(0)} m³` : '--'} />
                <View style={s.statCol}>
                  <Text style={s.statLabel}>HEALTH</Text>
                  <HealthBar value={t.health} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );

  const consumption = (
    <View style={s.card}>
      <View style={[s.pad, { gap: spacing.sm }]}>
        <View style={s.row}>
          <MaterialIcons name="bar-chart" size={14} color={TONE_INFO} />
          <Text style={s.h2}>DAILY CONSUMPTION BY TANK</Text>
        </View>
        <Text style={s.tiny}>Estimated from real-time feed flow</Text>
        {shown.some((t) => t.dailyConsumption > 0) ? (
          <MiniBarChart
            data={shown
              .filter((t) => t.dailyConsumption > 0)
              .map((t) => ({ label: t.id, value: t.dailyConsumption }))}
            unit=" m³"
            height={wide ? 150 : 130}
          />
        ) : shown.length === 0 ? (
          <Text style={[s.sub, { textAlign: 'center', padding: spacing.lg }]}>
            No tanks match "{filter}".
          </Text>
        ) : (
          <Text style={[s.sub, { textAlign: 'center', padding: spacing.lg }]}>
            Waiting for flow data…
          </Text>
        )}
      </View>
    </View>
  );

  const selColor = levelColor(hasData, selected.level);
  const detail = (
    <View style={{ gap: spacing.sm + 4 }}>
      <View>
        <View style={s.rowBetween}>
          <Text style={[s.mono, { fontFamily: FONT.monoBold, fontSize: 18, color: TONE_INFO }]}>
            {selected.id}
          </Text>
          <StatusBadge status={selected.status} />
        </View>
        <Text style={s.detailName}>{selected.name}</Text>
        <View style={s.row}>
          <MaterialIcons name="place" size={11} color={colors.onSurfaceVariant} />
          <Text style={s.tiny}>
            {selected.location}
            {selected.estimated ? ' · estimated (no sensor)' : ''}
          </Text>
        </View>
        <Text style={s.tiny}>
          Updated: {lastUpdate ? fmtClock(new Date(lastUpdate).getTime()) : '--'}
        </Text>
      </View>

      <LinearGradient
        colors={[`${selColor}33`, `${selColor}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.card, s.pad, { gap: 10, borderColor: `${selColor}55` }]}
      >
        <Text style={s.label}>TANK LEVEL</Text>
        <View style={s.heroBody}>
          <TankVisual level={selected.level} has={hasData} color={selColor} width={56} height={96} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.heroValue, { color: selColor, fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit>
              {hasData ? `${selected.level.toFixed(0)}%` : '--'}
            </Text>
            <Text style={s.tiny}>{hasData ? `${selected.volume.toFixed(0)} m³` : '--'} of {selected.capacity} m³</Text>
            {raw !== null && !selected.estimated && (
              <Text style={s.tiny}>Raw: <Text style={s.mono}>{raw.toFixed(3)}</Text></Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={s.metrics}>
        {(
          [
            ['DAILY USE (EST)', hasData ? `${selected.dailyConsumption.toFixed(0)} m³` : '--'],
            ['MONTHLY (EST)', hasData ? `${Math.round(selected.monthlyConsumption).toLocaleString()} m³` : '--'],
            ['HEALTH SCORE', hasData ? `${Math.round(selected.health)}%` : '--'],
          ] as const
        ).map(([l, v]) => (
          <View key={l} style={[s.card, s.pad, s.metric]}>
            <Text style={s.label}>{l}</Text>
            <Text
              style={[s.mono, { fontFamily: FONT.monoBold, fontSize: 14, color: colors.onSurface }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {v}
            </Text>
          </View>
        ))}
      </View>

      <View style={[s.card, s.pad, { gap: spacing.sm }]}>
        <Text style={s.label}>LEVEL HISTORY · LAST 24H</Text>
        {levelHistory.length > 1 ? (
          <MiniLineChart
            data={levelHistory}
            domain={[0, 100]}
            fmt={(v) => `${Math.round(v)}%`}
            height={110}
          />
        ) : (
          <Text style={[s.sub, { textAlign: 'center', padding: spacing.md }]}>
            Not enough history yet.
          </Text>
        )}
      </View>

      <View style={[s.card, s.pad, { gap: spacing.sm }]}>
        <View style={s.rowBetween}>
          <View style={s.row}>
            <MaterialIcons name="build" size={12} color={colors.onSurfaceVariant} />
            <Text style={s.label}>MAINTENANCE</Text>
          </View>
          <View style={s.estPill}>
            <Text style={s.estText}>SAMPLE</Text>
          </View>
        </View>
        <View style={s.rowBetween}>
          <Text style={s.sub}>Last Service</Text>
          <Text style={[s.mono, { color: colors.onSurface }]}>{selected.lastMaintenance}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text style={s.sub}>Next Due</Text>
          <Text style={[s.mono, { color: TONE_WARN }]}>{selected.nextMaintenance}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <AppHeader title="Tanks" />

      <View style={wide ? s.split : { flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarH + spacing.md }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.onSurfaceVariant}
            />
          }
        >
          {filters}
          {list}
          {consumption}
        </ScrollView>

        {wide && (
          <ScrollView
            style={s.side}
            contentContainerStyle={{ padding: spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {detail}
          </ScrollView>
        )}
      </View>

      {!wide && (
        <Modal
          visible={sheet}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSheet(false)}
        >
          <SafeAreaView style={s.root}>
            <View style={s.sheetHeader}>
              <Pressable
                onPress={() => setSheet(false)}
                style={s.back}
                accessibilityRole="button"
                accessibilityLabel="Back to tanks"
              >
                <MaterialIcons name="chevron-left" size={22} color={colors.onSurfaceVariant} />
                <Text style={s.sub}>Back to Tanks</Text>
              </Pressable>
              <Pressable
                onPress={() => setSheet(false)}
                style={s.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
              showsVerticalScrollIndicator={false}
            >
              {detail}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statCol} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={s.statLabel}>{label}</Text>
      <Text
        style={[s.mono, { color: color ?? colors.onSurface, fontFamily: FONT.monoBold, fontSize: 12 }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  split: { flex: 1, flexDirection: 'row' },
  side: {
    width: 320,
    backgroundColor: colors.surfaceContainer,
    borderLeftWidth: 1,
    borderLeftColor: colors.surfaceContainerHigh,
  },
  scroll: { padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pad: { padding: spacing.sm + 4 },

  h2: {
    color: colors.onSurfaceVariant,
    fontFamily: FONT.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  sub: { color: colors.onSurfaceVariant, fontFamily: FONT.body, fontSize: 12 },
  tiny: { color: colors.onSurfaceVariant, fontFamily: FONT.body, fontSize: 10 },
  label: { color: colors.onSurfaceVariant, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.8 },
  detailName: {
    color: colors.onSurface,
    fontFamily: FONT.semibold,
    fontSize: 15,
    marginVertical: 2,
  },

  /* hero */
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroValue: { fontFamily: FONT.monoBold, fontSize: 32, letterSpacing: 0.5 },

  /* chips */
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipText: { color: colors.onSurfaceVariant, fontFamily: FONT.medium, fontSize: 11 },

  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },

  /* tank card */
  tankCard: { padding: spacing.sm + 6, gap: 6 },
  tankName: { color: colors.onSurface, fontFamily: FONT.semibold, fontSize: 15, marginTop: 2 },
  idPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: `${TONE_INFO}22`,
  },
  id: { color: TONE_INFO, fontFamily: FONT.mono, fontSize: 11 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  levelBig: { fontFamily: FONT.monoBold, fontSize: 28, minWidth: 66 },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  statCol: { flex: 1, minWidth: 0 },
  statLabel: {
    color: colors.onSurfaceVariant,
    fontFamily: FONT.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  mono: { color: colors.onSurface, fontFamily: FONT.mono, fontSize: 11 },

  estPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  estText: {
    color: colors.onSurfaceVariant,
    fontFamily: FONT.mono,
    fontSize: 8,
    letterSpacing: 0.5,
  },

  levelTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexBasis: '47%', flexGrow: 1, gap: 4 },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm + 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});