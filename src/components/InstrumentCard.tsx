// src/components/InstrumentCard.tsx
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

export const TONE_HEX = {
  normal: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b',
} as const;
export type InstrumentTone = keyof typeof TONE_HEX;

type Props = {
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: InstrumentTone;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;   // e.g. { flex: 1 } so side-by-side cards share the same height
};

export default function InstrumentCard({ title, subtitle, status, statusTone = 'muted', legend, children, style }: Props) {
  const tone = TONE_HEX[statusTone];
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {!!status && (
          <View style={[styles.chip, { backgroundColor: `${tone}1a`, borderColor: `${tone}66` }]}>
            <Text style={[styles.chipText, { color: tone }]}>{status}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>{children}</View>

      {!!legend?.length && (
        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: spacing.sm },
  title: { color: colors.onSurface, fontSize: 14, fontWeight: '700' },
  subtitle: { color: colors.onSurfaceVariant, fontSize: 10, marginTop: 2 },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  body: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, flexGrow: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: colors.onSurfaceVariant, fontSize: 9 },
});