// src/components/TrendsPanel.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { SENSORS, SENSOR_BY_KEY } from '../data/sensors';
import { History, toPts } from '../lib/trendMath';
import LiveTrendChart from './LiveTrendChart';
import FlowBalanceChart from './FlowBalanceChart';
import DistributionHistogram from './DistributionHistogram';

type Props = {
  history: History;                         // keyed by PLC tag
  latest: (tag: string) => number | null;   // current value for a tag
  wide: boolean;
};

export default function TrendsPanel({ history, latest, wide }: Props) {
  const [sel, setSel] = useState('permeateFlow');
  const sensor = SENSOR_BY_KEY[sel];
  const points = useMemo(() => toPts(history[sensor.tag]), [history, sensor.tag]);

  const hist = (key: string) => {
    const s = SENSOR_BY_KEY[key];
    return { s, values: toPts(history[s.tag]).map((p) => p.v) };
  };
  const ro = useMemo(() => hist('roPressure'), [history]);
  const feed = useMemo(() => hist('feedFlow'), [history]);

  return (
    <View style={{ gap: spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SENSORS.map((s) => {
          const on = s.key === sel;
          return (
            <Pressable key={s.key} onPress={() => setSel(s.key)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <LiveTrendChart key={sensor.key} points={points} label={sensor.label} unit={sensor.unit} color={sensor.color} decimals={sensor.decimals} height={wide ? 300 : 220} />

      <View style={wide ? styles.row : { gap: spacing.md }}>
        <View style={wide ? { flex: 1 } : undefined}>
          <FlowBalanceChart
            feed={latest(SENSOR_BY_KEY.feedFlow.tag)}
            permeate={latest(SENSOR_BY_KEY.permeateFlow.tag)}
            concentrate={latest(SENSOR_BY_KEY.concentrateFlow.tag)}
            recovery={latest(SENSOR_BY_KEY.recovery.tag)}
          />
        </View>
        <View style={wide ? { flex: 1 } : undefined}>
          <DistributionHistogram values={ro.values} label={ro.s.label} unit={ro.s.unit} color={ro.s.color} />
        </View>
        <View style={wide ? { flex: 1 } : undefined}>
          <DistributionHistogram values={feed.values} label={feed.s.label} unit={feed.s.unit} color={feed.s.color} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  chips: { gap: 6, paddingRight: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceContainerHigh },
  chipOn: { backgroundColor: '#0ea5e9' },
  chipText: { color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
});