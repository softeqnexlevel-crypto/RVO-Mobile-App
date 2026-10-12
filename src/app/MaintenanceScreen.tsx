// src/app/MaintenanceScreen.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { Card, Pill, Row } from '../components/ui';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { TASKS, logService, useMaintenance } from '../state/maintenanceStore';

const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function MaintenanceScreen() {
  const { tasks, log } = useMaintenance();
  const [tab, setTab] = useState<'up' | 'hist'>('up');
  const [picker, setPicker] = useState(false);

  return (
    <Screen title="Maintenance">
      <View style={s.seg}>
        {([['up', 'Upcoming'], ['hist', 'History']] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[s.segBtn, tab === k && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[s.segText, tab === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'up' ? (
        <Card>
          {tasks.map((t, i) => (
            <Row key={t.id} icon="build" title={t.title} sub={t.status.text} last={i === tasks.length - 1} right={<Pill label={t.status.label} color={t.status.color} />} />
          ))}
        </Card>
      ) : log.length === 0 ? (
        <Card style={{ padding: 24 }}><Text style={s.empty}>No services logged yet.</Text></Card>
      ) : (
        <Card>
          {log.map((e, i) => (
            <Row key={`${e.id}-${e.at}`} icon="check-circle-outline" title={TASKS.find((t) => t.id === e.id)?.title ?? e.id} sub={fmtDate(e.at)} last={i === log.length - 1} />
          ))}
        </Card>
      )}

      <Pressable style={s.cta} onPress={() => setPicker(true)} accessibilityRole="button">
        <Text style={s.ctaText}>Log a service</Text>
      </Pressable>

      <Modal visible={picker} animationType="slide" transparent onRequestClose={() => setPicker(false)}>
        <View style={s.scrim}>
          <SafeAreaView edges={['bottom']} style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>What did you service?</Text>
              <Pressable onPress={() => setPicker(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} /></Pressable>
            </View>
            {TASKS.map((t) => (
              <Pressable key={t.id} style={s.option} onPress={() => { logService(t.id); setPicker(false); setTab('hist'); }} accessibilityRole="button">
                <Text style={s.optionText}>{t.title}</Text>
              </Pressable>
            ))}
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.md, backgroundColor: colors.surfaceContainerHigh },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.onSurfaceVariant },
  empty: { fontFamily: FONT.body, fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' },
  cta: { height: 50, borderRadius: radii.lg, backgroundColor: '#0877b8', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: FONT.heading, fontSize: 15, color: '#fff' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surfaceContainerLow, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sheetTitle: { fontFamily: FONT.heading, fontSize: 16, color: colors.onSurface },
  option: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceContainerHigh },
  optionText: { fontFamily: FONT.medium, fontSize: 14, color: colors.onSurface },
});