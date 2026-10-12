// src/components/ui.tsx
// Shared primitives used by Alarms, More, Antiscalant and other secondary screens:
//   C, Card, Label, Pill, Stat, Row, Bar
//
// Only add this file if src/components/ui.tsx does NOT exist or is missing one of these exports.
// If it already exists, merge instead of overwriting: other screens may use extra exports.

import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';

/** Semantic colours for status text, pills and bars. */
export const C = {
  red: colors.error,
  green: colors.tertiary,
  amber: colors.secondary,
  blue: colors.primary,
  grey: colors.outline,
};

/* ---------- Card ---------- */
export function Card({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

/* ---------- Label (small section / field label) ---------- */
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

/* ---------- Pill (status chip) ---------- */
export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.pill, { backgroundColor: `${color}1F` }]}>
      <Text style={[s.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------- Stat (value tile, sits in a flex row) ---------- */
export function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={[s.card, s.stat]} accessible accessibilityLabel={`${label}: ${value}${unit ? ' ' + unit : ''}`}>
      <Text style={s.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={s.statValueRow}>
        <Text
          style={[s.statValue, { color: color ?? colors.onSurface }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {!!unit && <Text style={s.statUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

/* ---------- Row (list row with icon, title, optional right slot) ---------- */
export function Row({
  icon,
  title,
  right,
  onPress,
  last,
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.row,
        !last && s.rowBorder,
        disabled && { opacity: 0.5 },
        pressed && { backgroundColor: colors.surfaceContainer },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={title}
    >
      <View style={s.rowIcon}>
        <MaterialIcons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={s.rowTitle} numberOfLines={1}>
        {title}
      </Text>
      {right}
      {!disabled && <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />}
    </Pressable>
  );
}

/* ---------- Bar (horizontal progress) ---------- */
export function Bar({ pct, color }: { pct: number; color: string }) {
  const w = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${w}%`, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },

  label: {
    fontFamily: FONT.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
  },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  pillText: { fontFamily: FONT.semibold, fontSize: 10.5 },

  stat: { flex: 1, minWidth: 0, padding: spacing.sm + 2, gap: 4 },
  statLabel: { fontFamily: FONT.medium, fontSize: 11, color: colors.onSurfaceVariant },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontFamily: FONT.semibold, fontSize: 20, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: FONT.body, fontSize: 11, color: colors.onSurfaceVariant },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1, fontFamily: FONT.medium, fontSize: 14, color: colors.onSurface },

  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
});