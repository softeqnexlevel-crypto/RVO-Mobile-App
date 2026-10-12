// components/EquipmentNode.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing, type, toneColor, Tone } from '../theme/tokens';
import StatusPill from './StatusPill';

type IconSet = 'material' | 'community';

type Props = {
  icon: string;
  iconSet?: IconSet;
  title: string;
  subtitle: string;
  statusLabel: string;
  tone: Tone;
  isLast?: boolean;
};

export default function EquipmentNode({
  icon,
  iconSet = 'material',
  title,
  subtitle,
  statusLabel,
  tone,
  isLast,
}: Props) {
  const color = toneColor(tone);
  const Icon = iconSet === 'community' ? MaterialCommunityIcons : MaterialIcons;

  return (
    <View style={styles.row}>
      <View style={styles.spine}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}33` }]}>
          <Icon name={icon as any} size={16} color={color} />
        </View>
        {!isLast && <View style={styles.connector} />}
      </View>
      <View style={styles.card}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={[type.bodyMd, { color: colors.onSurface, fontWeight: '700' as any }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[type.labelTabular, { color: colors.onSurfaceVariant, fontSize: 10, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <StatusPill label={statusLabel} tone={tone} dot={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  spine: {
    alignItems: 'center',
    width: 32,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: 2,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
});
