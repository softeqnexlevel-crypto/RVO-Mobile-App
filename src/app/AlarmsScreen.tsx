// src/app/AlarmsScreen.tsx
// Live alerts from the MQTT bits only (feed tank low, power problem, high filter differential
// pressure, backwash). See lib/plcAlerts.ts. Nothing here is stored or sample data.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { Card, Stat, C } from '../components/ui';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { acknowledgeAlarm, isolateAlarm, useAlarmSummary } from '../state/alarmStore';
import { useSession } from '../state/session';
import { canOperate } from '../lib/auth';

export default function AlarmsScreen() {
  const { active, critical, unacknowledged } = useAlarmSummary();
  const operate = canOperate(useSession().user?.role);
  const sorted = [...active].sort((a, b) => Number(b.severity === 'critical') - Number(a.severity === 'critical'));

  return (
    <Screen title="Alerts">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Active" value={String(active.length)} color={active.length ? C.red : C.green} />
        <Stat label="Critical" value={String(critical)} color={critical ? C.red : C.green} />
        <Stat label="Unacked" value={String(unacknowledged)} color={unacknowledged ? C.amber : C.green} />
      </View>

      {sorted.length === 0 ? (
        <Card style={s.empty}>
          <MaterialIcons name="check-circle-outline" size={28} color={C.green} />
          <Text style={s.emptyTitle}>All systems operating normally</Text>
          <Text style={s.emptySub}>New alerts will appear here as they happen.</Text>
        </Card>
      ) : (
        sorted.map((a) => {
          const c = a.severity === 'critical' ? C.red : C.amber;
          return (
            <Card key={a.id} style={[s.alarm, { borderLeftColor: c }]}>
              <View style={s.top}>
                <Text style={s.title} numberOfLines={2}>{a.title}</Text>
                <Text style={s.ago}>{a.ago}</Text>
              </View>
              {!!a.detail && <Text style={s.detail}>{a.detail}</Text>}
              <View style={[s.actions, !operate && { display: 'none' }]}>
                {!a.acknowledged ? (
                  <Pressable style={s.primary} onPress={() => acknowledgeAlarm(a.id)} accessibilityRole="button" accessibilityLabel={`Acknowledge ${a.title}`}>
                    <Text style={s.primaryText}>Acknowledge</Text>
                  </Pressable>
                ) : (
                  <View style={s.acked}><MaterialIcons name="check" size={14} color={C.green} /><Text style={[s.ghostText, { color: C.green }]}>Acknowledged</Text></View>
                )}
                <Pressable style={s.ghost} onPress={() => isolateAlarm(a.id)} accessibilityRole="button" accessibilityLabel={`Isolate ${a.title}`}>
                  <Text style={s.ghostText}>Isolate</Text>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', gap: 6, padding: 24 },
  emptyTitle: { fontFamily: FONT.semibold, fontSize: 14, color: colors.onSurface },
  emptySub: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant },
  alarm: { padding: spacing.sm + 6, borderLeftWidth: 3, gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontFamily: FONT.semibold, fontSize: 14, color: colors.onSurface },
  ago: { fontFamily: FONT.mono, fontSize: 10, color: colors.onSurfaceVariant },
  detail: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 },
  primary: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.md, backgroundColor: '#0877b8' },
  primaryText: { fontFamily: FONT.semibold, fontSize: 12, color: '#fff' },
  ghost: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.md, borderWidth: 1, borderColor: colors.surfaceContainerHighest },
  ghostText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.onSurfaceVariant },
  acked: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
});