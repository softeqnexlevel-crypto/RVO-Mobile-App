// components/AlarmDrawer.tsx
import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radii, spacing, type } from '../theme/tokens';

export type Alarm = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  ago: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  alarms: Alarm[];
  onAcknowledge: (id: string) => void;
  onIsolate: (id: string) => void;
};

const severityMeta = {
  critical: { label: 'CRITICAL', color: colors.error },
  warning: { label: 'WARNING', color: colors.secondary },
  info: { label: 'INFO', color: colors.outline },
};

export default function AlarmDrawer({ visible, onClose, alarms, onAcknowledge, onIsolate }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="notifications-active" size={22} color={colors.error} />
              <Text style={[type.headlineSm, { color: colors.onSurface, fontWeight: '700' as any }]}>
                Plant Alarm Stack
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {alarms.map((alarm) => {
              const meta = severityMeta[alarm.severity];
              const isCritical = alarm.severity === 'critical';
              return (
                <View
                  key={alarm.id}
                  style={[
                    styles.alarmCard,
                    { backgroundColor: isCritical ? `${colors.errorContainer}33` : colors.surfaceContainer },
                  ]}
                >
                  <View style={styles.alarmTop}>
                    <View style={[styles.badge, { backgroundColor: isCritical ? colors.error : `${meta.color}26` }]}>
                      <Text
                        style={[
                          type.labelUppercase,
                          { fontSize: 9, color: isCritical ? colors.onError : meta.color },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </View>
                    <Text style={[type.labelTabular, { fontSize: 10, color: colors.onSurfaceVariant }]}>
                      {alarm.ago}
                    </Text>
                  </View>
                  <Text
                    style={[
                      type.bodyMd,
                      { color: isCritical ? colors.error : colors.onSurface, fontWeight: '700' as any, marginTop: 4 },
                    ]}
                  >
                    {alarm.title}
                  </Text>
                  <Text style={[type.bodySm, { color: colors.onSurfaceVariant, marginTop: 2 }]}>{alarm.detail}</Text>

                  {isCritical && (
                    <View style={styles.actionRow}>
                      <Pressable style={styles.ackBtn} onPress={() => onAcknowledge(alarm.id)}>
                        <Text style={[type.labelUppercase, { fontSize: 10, color: colors.onSurface }]}>
                          Acknowledge
                        </Text>
                      </Pressable>
                      <Pressable style={styles.isolateBtn} onPress={() => onIsolate(alarm.id)}>
                        <Text style={[type.labelUppercase, { fontSize: 10, color: colors.onError, fontWeight: '700' as any }]}>
                          Isolate Cell
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(19,19,19,0.8)',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
  },
  alarmCard: {
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  alarmTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  ackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
  },
  isolateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.error,
  },
});
