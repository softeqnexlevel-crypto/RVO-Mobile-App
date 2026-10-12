// components/TelemetryCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, type, toneColor, Tone } from '../theme/tokens';

type Props = {
  label: string;
  value: string;
  unit: string;
  tone: Tone;
  statusLeft: string;
  statusRight: string;
  pulse?: boolean; // for critical/alerted values
};

export default function TelemetryCard({ label, value, unit, tone, statusLeft, statusRight, pulse }: Props) {
  const color = toneColor(tone);
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[type.labelUppercase, styles.label]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.dot, { backgroundColor: color, opacity: pulse ? 1 : 0.9 }]} />
      </View>
      <View style={styles.valueRow}>
        <Text style={[type.telemetryMetric, { color: tone === 'neutral' ? colors.onSurface : color }]}>
          {value}
        </Text>
        <Text style={[type.bodySm, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>{unit}</Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={[type.labelTabular, { color, fontSize: 10 }]} numberOfLines={1}>
          {statusLeft}
        </Text>
        <Text style={[type.labelTabular, { color: colors.outline, fontSize: 10 }]} numberOfLines={1}>
          {statusRight}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    flex: 1,
    marginRight: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
