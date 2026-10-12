// src/components/FlowAreaChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Circle,
} from 'react-native-svg';
import { colors, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';

type Point = { label: string; value: number };

type Props = {
  data: Point[];
  height?: number;
  stroke?: string;
  fillFrom?: string;
  fillTo?: string;
  showAvgLine?: boolean;
  avgLabel?: string;
};

export default function FlowAreaChart({
  data,
  height = 170,
  stroke = colors.primary,
  fillFrom = 'rgba(14,165,233,0.35)',
  fillTo = 'rgba(14,165,233,0.02)',
  showAvgLine = true,
  avgLabel = 'Avg',
}: Props) {
  if (!data || data.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Waiting for data…</Text>
      </View>
    );
  }

  const width = 320; // logical width; SVG scales via viewBox
  const padTop = 12;
  const padBottom = 24;
  const padLeft = 4;
  const padRight = 4;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  // Add a little headroom so the top point isn't clipped.
  const yMin = minV - range * 0.1;
  const yMax = maxV + range * 0.15;
  const ySpan = yMax - yMin || 1;

  const pts = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - ((d.value - yMin) / ySpan) * chartH;
    return { x, y, value: d.value, label: d.label };
  });

  const linePath = pts.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padTop + chartH} L ${
    pts[0].x
  } ${padTop + chartH} Z`;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = padTop + chartH - ((avg - yMin) / ySpan) * chartH;

  // Show roughly 4-5 x-axis labels depending on point count.
  const labelStep = Math.max(1, Math.ceil(data.length / 5));

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.35} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => {
          const y = padTop + (i / 3) * chartH;
          return (
            <Line
              key={i}
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke={colors.surfaceContainerHigh}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          );
        })}

        {/* Area + line */}
        <Path d={areaPath} fill="url(#flowGrad)" />
        <Path d={linePath} fill="none" stroke={stroke} strokeWidth={2} />

        {/* Avg reference line */}
        {showAvgLine && (
          <Line
            x1={padLeft}
            y1={avgY}
            x2={width - padRight}
            y2={avgY}
            stroke={colors.outline}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Last point */}
        <Circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r={3.5}
          fill={stroke}
        />
      </Svg>

      {/* X-axis labels (RN Text is more legible than SVG text for tiny type) */}
      <View style={styles.xAxis}>
        {data
          .filter((_, i) => i % labelStep === 0 || i === data.length - 1)
          .map((d, i) => (
            <Text key={i} style={styles.xLabel}>
              {d.label}
            </Text>
          ))}
      </View>

      {showAvgLine && (
        <View style={styles.avgChip}>
          <View style={[styles.avgDash, { borderColor: colors.outline }]} />
          <Text style={styles.avgText}>
            {avgLabel} {avg.toFixed(1)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontFamily: FONT.body,
    fontSize: 12,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: -8,
  },
  xLabel: {
    color: colors.outline,
    fontFamily: FONT.mono,
    fontSize: 9,
  },
  avgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  avgDash: {
    width: 14,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  avgText: {
    color: colors.onSurfaceVariant,
    fontFamily: FONT.mono,
    fontSize: 9,
  },
});