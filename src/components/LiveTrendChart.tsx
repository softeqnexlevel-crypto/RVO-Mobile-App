// src/components/LiveTrendChart.tsx
// Touch-scrubbable area chart: time ranges, min/avg/max/σ, mean and ±σ guides.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/tokens';
import { CHART_COLORS } from '../data/sensors';
import { Pt, RANGES, RangeKey, decimate, fmtClock, fmtClockSec, fmtDay, monotonePath, niceTicks, stats } from '../lib/trendMath';

type Props = { points: Pt[]; label: string; unit: string; color: string; decimals?: number; height?: number };

const PAD = { l: 42, r: 12, t: 8, b: 22 };
let uid = 0;

export default function LiveTrendChart({ points, label, unit, color, decimals = 2, height = 220 }: Props) {
  const [range, setRange] = useState<RangeKey>('1h');
  const [playing, setPlaying] = useState(true);
  const [full, setFull] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { height: winH } = useWindowDimensions();

  // "Play" keeps the window sliding; pause freezes it so you can inspect.
  useEffect(() => {
    if (!playing) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [playing]);

  const start = now - RANGES[range];
  const windowed = useMemo(() => points.filter((p) => p.t >= start && p.t <= now), [points, start, now]);
  const st = useMemo(() => stats(windowed.map((p) => p.v)), [windowed]);

  const header = (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{label}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {st && (
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Min: <Text style={{ color: CHART_COLORS.danger }}>{st.min.toFixed(decimals)}</Text></Text>
          <Text style={styles.stat}>Avg: <Text style={{ color: CHART_COLORS.warning }}>{st.avg.toFixed(decimals)}</Text></Text>
          <Text style={styles.stat}>Max: <Text style={{ color: CHART_COLORS.success }}>{st.max.toFixed(decimals)}</Text></Text>
          <Text style={styles.stat}>σ: <Text style={{ color: CHART_COLORS.purple }}>{st.sd.toFixed(2)}</Text></Text>
        </View>
      )}
      <View style={styles.controls}>
        {(Object.keys(RANGES) as RangeKey[]).map((r) => (
          <Pressable key={r} onPress={() => setRange(r)} style={[styles.chip, range === r && { backgroundColor: CHART_COLORS.primary, borderColor: CHART_COLORS.primary }]} accessibilityRole="button" accessibilityState={{ selected: range === r }}>
            <Text style={[styles.chipText, range === r && { color: '#fff' }]}>{r}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setPlaying((p) => !p)} style={styles.chip} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}>
          <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={14} color={colors.onSurfaceVariant} />
        </Pressable>
        <Pressable onPress={() => setFull((f) => !f)} style={styles.chip} accessibilityRole="button" accessibilityLabel={full ? 'Exit full screen' : 'Full screen'}>
          <MaterialIcons name={full ? 'fullscreen-exit' : 'fullscreen'} size={14} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );

  const body = (h: number) =>
    points.length === 0 ? (
      <View style={[styles.empty, { height: h }]}><Text style={styles.emptyText}>Waiting for data stream…</Text></View>
    ) : windowed.length === 0 ? (
      <View style={[styles.empty, { height: h, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.surfaceContainerHigh, borderRadius: 6 }]}>
        <Text style={styles.emptyText}>No data in the last {range}.</Text>
        <Text style={styles.tiny}>Try a wider range or wait for the next reading.</Text>
      </View>
    ) : (
      <Plot data={windowed} start={start} end={now} range={range} color={color} unit={unit} decimals={decimals} height={h} stats={st!} />
    );

  return (
    <>
      <View style={styles.card}>{header}{body(height)}</View>
      <Modal visible={full} animationType="fade" onRequestClose={() => setFull(false)} supportedOrientations={['portrait', 'landscape']}>
        <SafeAreaView style={styles.modal}>
          <View style={[styles.card, { flex: 1 }]}>{header}{body(Math.max(240, winH - 220))}</View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Plot({ data, start, end, range, color, unit, decimals, height, stats: st }: { data: Pt[]; start: number; end: number; range: RangeKey; color: string; unit: string; decimals: number; height: number; stats: NonNullable<ReturnType<typeof stats>> }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<Pt | null>(null);
  const gid = useRef(`trend-${++uid}`).current;
  const onLayout = (e: LayoutChangeEvent) => setW(Math.floor(e.nativeEvent.layout.width));

  const pts = useMemo(() => decimate(data), [data]);
  const pw = Math.max(0, w - PAD.l - PAD.r);
  const ph = height - PAD.t - PAD.b;

  const yTicks = useMemo(() => {
    const span = st.max - st.min || Math.abs(st.max) * 0.02 || 1;
    return niceTicks(st.min - span * 0.05, st.max + span * 0.05, 5);
  }, [st.min, st.max]);
  const y0 = yTicks[0], y1 = yTicks[yTicks.length - 1];
  const X = (t: number) => PAD.l + ((t - start) / (end - start)) * pw;
  const Y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * ph;

  const xy = pts.map((p) => ({ x: X(p.t), y: Y(p.v) }));
  const line = monotonePath(xy);
  const area = xy.length ? `${line} L ${xy[xy.length - 1].x} ${PAD.t + ph} L ${xy[0].x} ${PAD.t + ph} Z` : '';
  const xTicks = Array.from({ length: 6 }, (_, i) => start + ((end - start) * i) / 5);

  const pick = (locX: number) => {
    const t = start + ((locX - PAD.l) / pw) * (end - start);
    let best = pts[0], bd = Infinity;
    for (const p of pts) { const d = Math.abs(p.t - t); if (d < bd) { bd = d; best = p; } }
    setSel(best);
  };

  const tipLeft = sel ? Math.min(Math.max(X(sel.t) + 8, 0), w - 112) : 0;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <View
          style={{ width: w, height }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false} // keep scrubbing instead of scrolling the page
          onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        >
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <Stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {yTicks.map((v) => (
              <React.Fragment key={v}>
                <Line x1={PAD.l} x2={PAD.l + pw} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <SvgText x={PAD.l - 6} y={Y(v) + 3} fontSize={9} fill={colors.onSurfaceVariant} textAnchor="end">{Number(v.toPrecision(6))}</SvgText>
              </React.Fragment>
            ))}
            {xTicks.map((t, i) => (
              <SvgText key={i} x={X(t)} y={height - 6} fontSize={9} fill={colors.onSurfaceVariant} textAnchor={i === 0 ? 'start' : i === 5 ? 'end' : 'middle'}>
                {range === '7d' ? fmtDay(t) : fmtClock(t)}
              </SvgText>
            ))}

            <Path d={area} fill={`url(#${gid})`} />
            <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />

            {st.sd > 0 && (
              <>
                <Line x1={PAD.l} x2={PAD.l + pw} y1={Y(st.avg)} y2={Y(st.avg)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
                <Line x1={PAD.l} x2={PAD.l + pw} y1={Y(st.avg + st.sd)} y2={Y(st.avg + st.sd)} stroke={CHART_COLORS.warning} strokeOpacity={0.3} strokeDasharray="3 3" />
                <Line x1={PAD.l} x2={PAD.l + pw} y1={Y(st.avg - st.sd)} y2={Y(st.avg - st.sd)} stroke={CHART_COLORS.warning} strokeOpacity={0.3} strokeDasharray="3 3" />
              </>
            )}

            {sel && (
              <>
                <Line x1={X(sel.t)} x2={X(sel.t)} y1={PAD.t} y2={PAD.t + ph} stroke="rgba(255,255,255,0.8)" />
                <Circle cx={X(sel.t)} cy={Y(sel.v)} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
              </>
            )}
          </Svg>

          {sel && (
            <View pointerEvents="none" style={[styles.tip, { left: tipLeft, top: PAD.t + 6 }]}>
              <Text style={styles.tipTime}>{fmtClockSec(sel.t)}</Text>
              <Text style={[styles.tipVal, { color }]}>{sel.v.toFixed(decimals)} {unit}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, padding: spacing.md, gap: spacing.sm },
  modal: { flex: 1, backgroundColor: colors.background, padding: spacing.sm },
  header: { gap: spacing.sm },
  title: { color: colors.onSurface, fontSize: 15, fontWeight: '700' },
  unit: { color: colors.onSurfaceVariant, fontSize: 12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { color: colors.onSurfaceVariant, fontSize: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: 34, height: 28, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyText: { color: colors.onSurfaceVariant, fontSize: 12 },
  tiny: { color: colors.onSurfaceVariant, fontSize: 10, opacity: 0.75 },
  tip: { position: 'absolute', width: 104, backgroundColor: '#0a1828', borderColor: 'rgba(14,165,233,0.3)', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6 },
  tipTime: { color: '#4d7a9e', fontSize: 10 },
  tipVal: { fontSize: 12, fontWeight: '700' },
});