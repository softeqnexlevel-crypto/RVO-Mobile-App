// src/app/MoreScreen.tsx  — hub for every page that isn't a bottom tab.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Screen from '../components/Screen';
import { Card, Label, Pill, Row, C } from '../components/ui';
import { colors, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { useAlarmSummary } from '../state/alarmStore';
import { usePlcAlarms } from '../state/usePlcAlarms';
import { useMaintenance } from '../state/maintenanceStore';
import { endSession, useSession } from '../state/session';

type Item = { icon: keyof typeof MaterialIcons.glyphMap; title: string; href: string; ready: boolean };
// Flip `ready` to true as each screen ships.
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Operations', items: [
    { icon: 'science', title: 'Antiscalant', href: '/AntiscalantScreen', ready: true },
    { icon: 'filter-alt', title: 'Filtration', href: '/FiltrationScreen', ready: true },
    { icon: 'autorenew', title: 'System Recovery', href: '/RecoveryScreen', ready: true },
  ] },
  { title: 'Management', items: [
    { icon: 'build', title: 'Maintenance', href: '/MaintenanceScreen', ready: true },
    { icon: 'bar-chart', title: 'Analytics', href: '/AnalyticsScreen', ready: true },
    { icon: 'description', title: 'Reports', href: '/ReportsScreen', ready: true },
  ] },
  { title: 'System', items: [
    { icon: 'notifications-none', title: 'Alerts', href: '/AlarmsScreen', ready: true },
    { icon: 'settings', title: 'Settings', href: '/SettingsScreen', ready: true },
  ] },
  { title: 'Configuration', items: [
    { icon: 'label-outline', title: 'Tag Manager', href: '/TagManagerScreen', ready: true },
  ] },
];

export default function MoreScreen() {
  const router = useRouter();
  const { unacknowledged } = useAlarmSummary();
  const plc = usePlcAlarms();
  const { overdue } = useMaintenance();
  const { email, user } = useSession();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email || 'Signed in';

  const badge = (t: string) =>
    t === 'Alerts' && unacknowledged + plc.count > 0 ? <Pill label={String(unacknowledged + plc.count)} color={C.red} />
    : t === 'Maintenance' && overdue > 0 ? <Pill label={`${overdue} overdue`} color={C.red} />
    : null;

  return (
    <Screen title="More" back={false}>
      <Card style={s.profile}>
        <View style={s.avatar}><Text style={s.avatarText}>{fullName.charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={1}>{fullName}</Text>
          <Text style={s.role}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Aqua Systemtech'}</Text>
        </View>
      </Card>

      {GROUPS.map((g) => (
        <View key={g.title} style={{ gap: spacing.sm }}>
          <Label>{g.title}</Label>
          <Card>
            {g.items.map((it, i) => (
              <Row
                key={it.title}
                icon={it.icon}
                title={it.title}
                last={i === g.items.length - 1}
                disabled={!it.ready}
                onPress={() => router.navigate(it.href as any)}
                right={it.ready ? badge(it.title) : <Pill label="Soon" color={C.grey} />}
              />
            ))}
          </Card>
        </View>
      ))}

      <Row icon="logout" title="Sign out" onPress={endSession} last />
    </Screen>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONT.heading, fontSize: 18, color: colors.onPrimary },
  name: { fontFamily: FONT.semibold, fontSize: 14, color: colors.onSurface },
  role: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant },
});