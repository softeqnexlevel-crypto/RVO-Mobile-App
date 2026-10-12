// src/app/AnalyticsScreen.tsx — computed from the recorded history (last 24 h on this phone).
// TODO: 7 / 30 / 90-day ranges need a server history API; they are not offered until then.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { Card, Label, Stat, C } from '../components/ui';
import { MiniBarChart, MiniLineChart } from '../components/TankParts';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { SENSOR_BY_KEY } from '../data/sensors';
import { useTags } from '../state/useTags';
import { Pt, RANGES, RangeKey, fmtClock, toPts } from '../lib/trendMath';
import { bucketize, mean, uptimePct, volumeM3 } from '../lib/analytics';

const OPTIONS: RangeKey[] = ['1h', '6h', '24h'];
const TARGET = 75;
const tagOf = (k: string) => SENSOR_BY_KEY[k]?.tag ?? '';

export default function AnalyticsScreen() {
  const { history } = useTags();
  const [range, setRange] = useState<RangeKey>('24h');

  const d = useMemo(() => {
    const now = Date.now(), from = now - RANGES[range];
    const win = (k: string): Pt[] => toPts(history[tagOf(k)]).filter((p) => p.t >= from);
    const flow = win('permeateFlow'), rec = win('recovery'), act = win('systemActive');
    const n = range === '1h' ? 6 : range === '6h' ? 6 : 12;
    const bars = bucketize(flow, from, now, n, (b) => (b.length ? volumeM3(b) : null)).map((b) => ({ label: fmtClock(b.t1), value: b.v ?? 0, has: b.v !== null }));
    const recLine = bucketize(rec, from, now, 8, (b) => mean(b)).filter((b) => b.v !== null).map((b) => ({ label: fmtClock(b.t1), value: b.v as number }));
    const below = rec.length ? (rec.filter((p) => p.v < TARGET).length / rec.length) * 100 : null;
    return { produced: flow.length > 1 ? volumeM3(flow) : null, avgRec: mean(rec), uptime: uptimePct(act), avgFlow: mean(flow), bars, recLine, below, samples: flow.length };
  }, [history, range]);

  const f = (v: number | null, dgt = 1) => (v === null ? '—' : v.toFixed(dgt));
  const empty = d.samples < 2;

  return (
    <Screen title="Analytics">
      <View style={s.seg}>
        {OPTIONS.map((r) => (
          <Pressable key={r} onPress={() => setRange(r)} style={[s.segBtn, range === r && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: range === r }}>
            <Text style={[s.segText, range === r && { color: '#fff' }]}>{r === '1h' ? '1 hour' : r === '6h' ? '6 hours' : '24 hours'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.note}>Based on data recorded on this phone while the app is open. Longer ranges need the server history.</Text>

      <View style={s.row}>
        <Stat label="Water produced" value={f(d.produced, 0)} unit="m³" color={C.green} />
        <Stat label="Avg recovery" value={f(d.avgRec)} unit="%" color={d.avgRec === null ? C.grey : d.avgRec >= TARGET ? C.green : C.amber} />
      </View>
      <View style={s.row}>
        <Stat label="Avg permeate" value={f(d.avgFlow)} unit="m³/h" color={C.blue} />
        <Stat label="Uptime" value={f(d.uptime)} unit="%" color={d.uptime === null ? C.grey : d.uptime >= 95 ? C.green : C.amber} />
      </View>

      <Card style={s.pad}>
        <Label>Production per interval (m³)</Label>
        {empty ? <Text style={s.empty}>Not enough data yet. Keep the app open for a few minutes.</Text> : <MiniBarChart data={d.bars} unit="" height={150} />}
      </Card>

      <Card style={s.pad}>
        <Label>Recovery vs {TARGET}% target</Label>
        {d.recLine.length < 2 ? <Text style={s.empty}>Not enough data yet.</Text> : <MiniLineChart data={d.recLine} color={C.amber} height={120} fmt={(v) => `${Math.round(v)}%`} />}
      </Card>

      <Card style={s.pad}>
        <Label>Insight</Label>
        <Text style={s.insight}>
          {d.below === null ? 'Waiting for recovery readings.'
            : d.below === 0 ? `Recovery stayed at or above the ${TARGET}% target for the whole period.`
            : `Recovery was below the ${TARGET}% target for ${d.below.toFixed(0)}% of the period.`}
        </Text>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.md, backgroundColor: colors.surfaceContainerHigh },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.onSurfaceVariant },
  note: { fontFamily: FONT.body, fontSize: 11, color: colors.onSurfaceVariant },
  row: { flexDirection: 'row', gap: spacing.sm },
  pad: { padding: spacing.md, gap: 10 },
  empty: { fontFamily: FONT.body, fontSize: 13, color: colors.onSurfaceVariant, paddingVertical: 20, textAlign: 'center' },
  insight: { fontFamily: FONT.body, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
});