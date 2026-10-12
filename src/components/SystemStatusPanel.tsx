// src/components/SystemStatusPanel.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/tokens';
import RingGauge from './RingGauge';
import { TONE_HEX, InstrumentTone } from './InstrumentCard';

export type Equipment = { key: string; label: string; icon: keyof typeof MaterialIcons.glyphMap; running: boolean | null; text?: string };
export type RecentAlarm = { id: string; severity: string; title: string; ago: string };

type Props = {
  startup: { label: string; running: boolean | null }[];
  banner: { tone: InstrumentTone; text: string };
  rings: { label: string; value: number | null; status: string; tone: InstrumentTone }[];
  equipment: Equipment[];
  alarms: RecentAlarm[];
  onViewAll: () => void;
  wide: boolean;
};

const Section = ({ children }: { children: string }) => <Text style={styles.section}>{children}</Text>;

export default function SystemStatusPanel({ startup, banner, rings, equipment, alarms, onViewAll, wide }: Props) {
  const bannerColor = TONE_HEX[banner.tone];
  return (
    <View style={[wide && styles.row, { gap: spacing.sm }]}>
      <View style={[styles.card, wide && { flex: 2 }]}>
        <Section>SYSTEM STATUS</Section>

        <View style={styles.startup}>
          <Text style={styles.tiny}>STARTUP SEQUENCE</Text>
          <View style={styles.seqRow}>
            {startup.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <Text style={styles.arrow}>→</Text>}
                <View style={[styles.dot, { backgroundColor: s.running === null ? TONE_HEX.muted : s.running ? TONE_HEX.normal : TONE_HEX.danger }]} />
                <Text style={styles.seqText}>{s.label}</Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={[styles.banner, { backgroundColor: `${bannerColor}1a`, borderColor: `${bannerColor}66` }]}>
          <Text style={[styles.bannerText, { color: bannerColor }]}>{banner.text}</Text>
        </View>

        <View style={styles.rings}>
          {rings.map((r) => <RingGauge key={r.label} {...r} />)}
        </View>

        <Section>EQUIPMENT STATUS</Section>
        <View style={styles.eqWrap}>
          {equipment.map((e) => {
            const tone: InstrumentTone = e.running === null ? 'muted' : e.running ? 'normal' : 'danger';
            const c = TONE_HEX[tone];
            return (
              <View key={e.key} style={[styles.eq, { width: wide ? '49%' : '100%' }, e.running !== null && { backgroundColor: `${c}12`, borderColor: `${c}55` }]}>
                <View style={[styles.eqIcon, e.running !== null && { backgroundColor: `${c}22` }]}>
                  <MaterialIcons name={e.icon} size={16} color={e.running === null ? colors.onSurfaceVariant : c} />
                </View>
                <View>
                  <Text style={styles.eqName}>{e.label}</Text>
                  <Text style={[styles.eqState, { color: e.running === null ? colors.onSurfaceVariant : c }]}>
                    {e.running === null ? 'No data' : e.text ?? (e.running ? 'Running' : 'Stopped')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, wide && { flex: 1 }]}>
        <View style={styles.alarmHead}>
          <Section>RECENT ALARMS</Section>
          <Pressable onPress={onViewAll} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.viewAll}>View all →</Text>
          </Pressable>
        </View>
        {alarms.length === 0 ? (
          <View style={styles.okRow}>
            <MaterialIcons name="check-circle-outline" size={16} color={TONE_HEX.normal} />
            <Text style={styles.okText}>All systems operating normally</Text>
          </View>
        ) : (
          alarms.slice(0, 5).map((a) => (
            <View key={a.id} style={styles.alarmRow}>
              <MaterialIcons name="warning" size={16} color={a.severity === 'critical' ? colors.error : colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eqName} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.tiny}>{a.ago}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, padding: spacing.md, gap: spacing.sm },
  section: { color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  tiny: { color: colors.onSurfaceVariant, fontSize: 9 },
  startup: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md, padding: spacing.sm, gap: 4 },
  seqRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  seqText: { color: colors.onSurface, fontSize: 10, fontWeight: '600' },
  arrow: { color: colors.onSurfaceVariant, fontSize: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  banner: { borderWidth: 1, borderRadius: radii.md, paddingVertical: 6, alignItems: 'center' },
  bannerText: { fontSize: 11, fontWeight: '600' },
  rings: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm },
  eqWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  eq: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.surfaceContainerHigh },
  eqIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  eqName: { color: colors.onSurface, fontSize: 12, fontWeight: '700' },
  eqState: { fontSize: 11 },
  alarmHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  okText: { color: colors.onSurfaceVariant, fontSize: 12 },
  alarmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});