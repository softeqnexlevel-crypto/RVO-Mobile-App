// src/components/AppHeader.tsx — one header for every screen.
//  - Compact: title on the left, actions on the right.
//  - Root tabs show the brand mark; sub-pages show a back button (`back`).
//  - Bell shows the live alert count (PLC alarm flags + app alarms). Avatar opens More.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image'; // Use Image, not ImageBackground

import { colors, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { useSession } from '../state/session';
import { useAlarmSummary } from '../state/alarmStore';
import { usePlcAlarms } from '../state/usePlcAlarms';

// Import the logo as a module (React Native handles this)
const Logo = require('../../assets/images/lg.png');

type Props = {
  title: string;
  back?: boolean;
  subtitle?: string;          // replaces the live-status line
  right?: React.ReactNode;    // extra action buttons, shown left of the bell
};

export const HeaderButton = ({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.btn, pressed && s.pressed]} accessibilityRole="button" accessibilityLabel={label}>
    <MaterialIcons name={icon} size={20} color={colors.onSurface} />
  </Pressable>
);

export default function AppHeader({ title, back, subtitle, right }: Props) {
  const router = useRouter();
  const { user, email } = useSession();
  const { unacknowledged } = useAlarmSummary();
  const plc = usePlcAlarms();

  const alerts = unacknowledged + plc.count;
  const initial = (user?.firstName || email || 'A').charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <View style={s.row}>
        <View style={s.left}>
          {back ? (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/MoreScreen' as any))} hitSlop={8}
              style={({ pressed }) => [s.btn, pressed && s.pressed]} accessibilityRole="button" accessibilityLabel="Back">
              <MaterialIcons name="chevron-left" size={26} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={s.logoContainer}>
              <Image 
                source={Logo} 
                style={s.logo} 
                contentFit="contain"
                accessibilityLabel="Rift Valley Osmotics Logo"
              />
            </View>
          )}

          <View style={s.titles}>
            <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            {subtitle ? (
              <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.actions}>
          {right}
          <Pressable onPress={() => router.navigate('/AlarmsScreen' as any)} style={({ pressed }) => [s.btn, pressed && s.pressed]}
            accessibilityRole="button" accessibilityLabel={alerts ? `Alerts, ${alerts} active` : 'Alerts'}>
            <MaterialIcons name={alerts ? 'notifications-active' : 'notifications-none'} size={20} color={alerts ? colors.error : colors.onSurface} />
            {alerts > 0 && <View style={s.badge}><Text style={s.badgeText}>{alerts > 9 ? '9+' : alerts}</Text></View>}
          </Pressable>
          <Pressable onPress={() => router.navigate('/MoreScreen' as any)} style={({ pressed }) => [s.avatar, pressed && s.pressed]}
            accessibilityRole="button" accessibilityLabel="Profile and more">
            <Text style={s.avatarText}>{initial}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { backgroundColor: colors.surfaceContainerLow, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceContainerHigh },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm + 2, minHeight: 60 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: FONT.heading, fontSize: 20, color: colors.onSurface, letterSpacing: -0.3 },
  sub: { fontFamily: FONT.body, fontSize: 11, color: colors.onSurfaceVariant, flexShrink: 1 },
  
  // Logo styles
  logoContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', 
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { 
    width: 32, 
    height: 32,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONT.semibold, fontSize: 14, color: colors.onPrimary },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surfaceContainerLow },
  badgeText: { color: colors.onError, fontSize: 9, lineHeight: 11, fontFamily: FONT.semibold },
});