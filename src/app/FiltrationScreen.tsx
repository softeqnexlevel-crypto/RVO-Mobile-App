// src/app/FiltrationScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import LiveTrendChart from '../components/LiveTrendChart';
import { Bar, Card, Label, Pill, Stat, C } from '../components/ui';
import { colors, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { SENSOR_BY_KEY } from '../data/sensors';
import { useTags } from '../state/useTags';
import { toPts } from '../lib/trendMath';

const REPLACE_AT = 1.0; // bar: from the design; confirm with your filter spec

export default function FiltrationScreen() {
  const { num, history } = useTags();
  const f = (k: string) => { const t = SENSOR_BY_KEY[k]?.tag; return t ? num(t) : null; }; // safe if a key is missing
  const dp = f('filterDp'), inlet = f('filterInPressure'), outlet = f('filterOutPressure'), s1 = f('stage1Dp'), s2 = f('stage2Dp');
  const dpColor = dp === null ? C.grey : dp < 0.7 ? C.green : dp < REPLACE_AT ? C.amber : C.red;
  const dpLabel = dp === null ? 'No data' : dp < 0.7 ? 'Normal' : dp < REPLACE_AT ? 'Rising' : 'Replace filters';
  const pts = useMemo(() => toPts(history[SENSOR_BY_KEY.filterDp?.tag ?? '']), [history]);
  const v = (n: number | null, d = 2) => (n === null ? '—' : n.toFixed(d));

  return (
    <Screen title="Filtration">
      <Card style={s.pad}>
        <View style={s.between}><Label>Media Filter differential pressure</Label><Pill label={dpLabel} color={dpColor} /></View>
        <View style={s.big}><Text style={[s.bigValue, { color: dpColor }]}>{v(dp)}</Text><Text style={s.bigUnit}>bar</Text></View>
        <Bar pct={((dp ?? 0) / REPLACE_AT) * 100} color={dpColor} />
        {/* <View style={[s.between, { marginTop: 6 }]}><Text style={s.tiny}>0</Text><Text style={s.tiny}>Replace at {REPLACE_AT.toFixed(1)} bar</Text></View> */}
      </Card>

       <Card style={s.pad}>
        <View style={s.between}><Label>Stage 1 differential pressure </Label><Pill label={dpLabel} color={dpColor} /></View>
        <View style={s.big}><Text style={[s.bigValue, { color: dpColor }]}>{v(s1)}</Text><Text style={s.bigUnit}>bar</Text></View>
        <Bar pct={((dp ?? 0) / REPLACE_AT) * 100} color={dpColor} />
        {/* <View style={[s.between, { marginTop: 6 }]}><Text style={s.tiny}>0</Text><Text style={s.tiny}>Replace at {REPLACE_AT.toFixed(1)} bar</Text></View> */}
      </Card>

       <Card style={s.pad}>
        <View style={s.between}><Label>Stage 2 differential pressure</Label><Pill label={dpLabel} color={dpColor} /></View>
        <View style={s.big}><Text style={[s.bigValue, { color: dpColor }]}>{v(s2)}</Text><Text style={s.bigUnit}>bar</Text></View>
        <Bar pct={((dp ?? 0) / REPLACE_AT) * 100} color={dpColor} />
        {/* <View style={[s.between, { marginTop: 6 }]}><Text style={s.tiny}>0</Text><Text style={s.tiny}>Replace at {REPLACE_AT.toFixed(1)} bar</Text></View> */}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Inlet" value={v(inlet, 1)} unit="bar" />
        <Stat label="Outlet" value={v(outlet, 1)} unit="bar" />
      </View>
      {/* <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Stage 1 ΔP" value={v(s1)} unit="bar" color={s1 !== null && s1 >= 0.9 ? C.amber : C.green} />
        <Stat label="Stage 2 ΔP" value={v(s2)} unit="bar" color={C.green} />
      </View> */}

      <LiveTrendChart points={pts} label="Filter ΔP" unit="bar" color={SENSOR_BY_KEY.filterDp?.color ?? '#8b5cf6'} decimals={2} height={200} />
    </Screen>
  );
}

const s = StyleSheet.create({
  pad: { padding: spacing.md, gap: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigValue: { fontFamily: FONT.monoBold, fontSize: 34 },
  bigUnit: { fontFamily: FONT.mono, fontSize: 13, color: colors.onSurfaceVariant },
  tiny: { fontFamily: FONT.body, fontSize: 11, color: colors.onSurfaceVariant },
});