// components/EStopModal.tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function EStopModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconCircle]}>
            <MaterialCommunityIcons name="alert-octagon" size={36} color={colors.error} />
          </View>
          <Text style={[type.headlineMd, { color: colors.error, fontWeight: '700' as any, textAlign: 'center' }]}>
            Emergency System Trip
          </Text>
          <Text style={[type.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm }]}>
            This action will immediately de-energize all high-pressure pumps, close feed supply shutoff valves, and
            engage the safe depressurization sequence.
          </Text>

          <View style={{ marginTop: spacing.md, gap: 8, width: '100%' }}>
            <Pressable style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={[type.labelUppercase, { color: colors.onError, fontWeight: '700' as any }]}>
                Confirm Emergency Shutdown
              </Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={[type.labelUppercase, { color: colors.onSurface }]}>Abort &amp; Return</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,19,19,0.9)',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: `${colors.errorContainer}4d`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
});
