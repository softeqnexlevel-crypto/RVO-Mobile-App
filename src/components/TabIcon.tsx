// src/components/TabIcon.tsx
// Consistent tab icons: outline when idle, filled when active, inside a soft pill.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

type Name = keyof typeof MaterialCommunityIcons.glyphMap;

export const TAB_ICONS: Record<string, { idle: Name; active: Name }> = {
  dashboard: { idle: 'view-dashboard-outline', active: 'view-dashboard' },
  tanks: { idle: 'water-percent', active: 'water-percent' },       // tank level, instead of the bag-like icon
  production: { idle: 'factory', active: 'factory' },
  alarms: { idle: 'bell-outline', active: 'bell' },
  more: { idle: 'dots-horizontal', active: 'dots-horizontal' },
};

export function TabIcon({ kind, focused, color }: { kind: keyof typeof TAB_ICONS; focused: boolean; color: string }) {
  const i = TAB_ICONS[kind];
  return (
    <View style={[styles.pill, focused && { backgroundColor: `${colors.primary}26` }]}>
      <MaterialCommunityIcons name={focused ? i.active : i.idle} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});