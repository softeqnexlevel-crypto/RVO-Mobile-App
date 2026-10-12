// src/app/RecoveryScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import RingGauge from '../components/RingGauge';
import LiveTrendChart from '../components/LiveTrendChart';
import { Bar, Card, Label, Pill, C } from '../components/ui';
import { TONE_HEX } from '../components/InstrumentCard';
import { colors, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { SENSOR_BY_KEY } from '../data/sensors';
import { useTags } from '../state/useTags';
import { recoveryStatus } from '../lib/status';
import { toPts } from '../lib/trendMath';

const TARGET = 75; // %

export default function RecoveryScreen() {
  const { num, history } = useTags();
  const rec = num(SENSOR_BY_KEY.recovery.tag);
  const feed = num(SENSOR_BY_KEY.feedFlow.tag), perm = num(SENSOR_BY_KEY.permeateFlow.tag), conc = num(SENSOR_BY_KEY.concentrateFlow.tag);
  const st = recoveryStatus(rec);
  const gap = rec === null ? null : TARGET - rec;
  const pts = useMemo(() => toPts(history[SENSOR_BY_KEY.recovery.tag]), [history]);
  const max = Math.max(feed ?? 0, perm ?? 0, conc ?? 0, 1);

  const flow = (label: string, v: number | null, color: string) => (
    <View style={{ gap: 6 }} key={label}>
      <View style={s.between}><Text style={s.flowLabel}>{label}</Text><Text style={s.flowVal}>{v === null ? '—' : v.toFixed(1)} m³/h</Text></View>
      <Bar pct={((v ?? 0) / max) * 100} color={color} />
    </View>
  );

  return (
    <Screen title="System Recovery">
      <Card style={s.pad}>
        <View style={s.between}><Label>Recovery</Label><Pill label={st.label} color={TONE_HEX[st.tone]} /></View>
        <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
          <RingGauge value={rec} label="" status="" tone={st.tone} size={140} />
        </View>
        <Text style={s.center}>{gap === null ? 'Waiting for data' : gap > 0 ? `Target ${TARGET}% · ${gap.toFixed(1)} points below` : `Target ${TARGET}% · on target`}</Text>
      </Card>

      <Card style={[s.pad, { gap: 14 }]}>
        {flow('Feed', feed, C.blue)}
        {flow('Permeate', perm, C.green)}
        {flow('Concentrate', conc, C.amber)}
      </Card>

      <LiveTrendChart points={pts} label="Recovery" unit="%" color={SENSOR_BY_KEY.recovery.color} decimals={1} height={200} />
    </Screen>
  );
}

const s = StyleSheet.create({
  pad: { padding: spacing.md },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  center: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'center' },
  flowLabel: { fontFamily: FONT.medium, fontSize: 13, color: colors.onSurface },
  flowVal: { fontFamily: FONT.monoBold, fontSize: 12, color: colors.onSurface },
});