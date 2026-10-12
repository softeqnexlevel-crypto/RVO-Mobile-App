// src/components/DistributionHistogram.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { colors, radii, spacing } from '../theme/tokens';
import { CHART_COLORS } from '../data/sensors';
import { histogram, niceTicks, stats } from '../lib/trendMath';

type Props = { values: number[]; label: string; unit: string; color: string; height?: number };
const BIN_OPTIONS = [10, 20, 30, 50];
const PAD = { l: 26, r: 4, t: 8, b: 46 };

export default function DistributionHistogram({ values, label, unit, color, height = 210 }: Props) {
  const [bins, setBins] = useState(20);
  const [w, setW] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const st = useMemo(() => stats(values), [values]);
  const data = useMemo(() => histogram(values, bins), [values, bins]);

  if (!st || data.length === 0) {
    return (
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Text style={styles.title}>{label} Distribution</Text>
        <Text style={styles.empty}>No data available</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));
  const yTicks = niceTicks(0, maxCount, 5);
  const yMax = yTicks[yTicks.length - 1] || 1;
  const pw = Math.max(0, w - PAD.l - PAD.r);
  const ph = height - PAD.t - PAD.b;
  const bw = pw / data.length;
  const labelEvery = Math.max(1, Math.ceil(16 / Math.max(bw, 1))); // thin labels so they never overlap
  const sel = selected !== null ? data[selected] : null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>{label} Distribution</Text>
        <View style={styles.binRow}>
          {BIN_OPTIONS.map((n) => (
            <Pressable key={n} onPress={() => { setBins(n); setSelected(null); }} style={[styles.bin, bins === n && { backgroundColor: color, borderColor: color }]} accessibilityRole="button" accessibilityState={{ selected: bins === n }}>
              <Text style={[styles.binText, bins === n && { color: '#fff' }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>Mean: <Text style={styles.statVal}>{st.avg.toFixed(2)} {unit}</Text></Text>
        <Text style={styles.stat}>Median: <Text style={styles.statVal}>{st.median.toFixed(2)} {unit}</Text></Text>
        <Text style={styles.stat}>Max: <Text style={{ color: CHART_COLORS.success }}>{st.max.toFixed(2)} {unit}</Text></Text>
        <Text style={styles.stat}>Min: <Text style={{ color: CHART_COLORS.warning }}>{st.min.toFixed(2)} {unit}</Text></Text>
        <Text style={styles.stat}>n={st.n}{data.length < bins && data.length > 1 ? ` · ${data.length} bins used` : ''}</Text>
      </View>

      <Text style={styles.caption} numberOfLines={1}>
        {sel ? `${sel.range} ${unit} · count ${sel.count} · ${((sel.count / st.n) * 100).toFixed(1)}%` : 'Tap a bar for details'}
      </Text>

      <View onLayout={(e: LayoutChangeEvent) => setW(Math.floor(e.nativeEvent.layout.width))} style={{ height }}>
        {w > 0 && (
          <Svg width={w} height={height}>
            {yTicks.map((v) => (
              <React.Fragment key={v}>
                <Line x1={PAD.l} x2={PAD.l + pw} y1={PAD.t + ph - (v / yMax) * ph} y2={PAD.t + ph - (v / yMax) * ph} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <SvgText x={PAD.l - 5} y={PAD.t + ph - (v / yMax) * ph + 3} fontSize={9} fill={colors.onSurfaceVariant} textAnchor="end">{v}</SvgText>
              </React.Fragment>
            ))}
            {data.map((d, i) => {
              const h = (d.count / yMax) * ph;
              const x = PAD.l + i * bw;
              const barW = Math.max(1, bw * 0.8);
              const bx = x + (bw - barW) / 2;
              const ly = PAD.t + ph + 10;
              return (
                <React.Fragment key={i}>
                  <Rect x={bx} y={PAD.t + ph - h} width={barW} height={h} fill={color} opacity={selected === null || selected === i ? 1 : 0.45} rx={2} />
                  {/* full-height transparent hit area so thin bars are still tappable */}
                  <Rect x={x} y={PAD.t} width={bw} height={ph} fill="transparent" onPress={() => setSelected(selected === i ? null : i)} />
                  {i % labelEvery === 0 && (
                    <SvgText x={bx + barW / 2 + 3} y={ly} fontSize={8} fill={colors.onSurfaceVariant} textAnchor="end" rotation={-40} origin={`${bx + barW / 2 + 3}, ${ly}`}>
                      {d.label}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: colors.onSurface, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  empty: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 16 },
  binRow: { flexDirection: 'row', gap: 4 },
  bin: { minWidth: 32, height: 26, borderRadius: 4, borderWidth: 1, borderColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  binText: { color: colors.onSurfaceVariant, fontSize: 10, fontWeight: '600' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { color: colors.onSurfaceVariant, fontSize: 10 },
  statVal: { color: colors.onSurface },
  caption: { color: colors.onSurfaceVariant, fontSize: 10, minHeight: 14 },
});