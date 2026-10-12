// src/components/BottomNav.tsx
// Line-icon tab bar matching the reference design.
//
//  - Thin, uniform line icons (Feather, plus Ionicons where Feather has no matching glyph, e.g. the flask).
//  - Active tab: accent-coloured icon + label, with a short bar along the top edge.
//  - Small sentence-case labels; semibold when active.
//  - Alarm badge with a ring that matches the bar.
//
// Behaviour: hidden on the login route, active tab comes from the URL,
// pages opened from More (including Alerts) keep "More" highlighted; the unacknowledged-alert count shows on More.

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { useAlarmSummary } from '../state/alarmStore';
import { usePlcAlarms } from '../state/usePlcAlarms';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type IonName = React.ComponentProps<typeof Ionicons>['name'];

// `lib` picks the icon family. Feather has no flask, so Antiscalant uses Ionicons' "flask-outline".
type Item =
  | { key: string; label: string; href: string; lib: 'feather'; icon: FeatherName }
  | { key: string; label: string; href: string; lib: 'ion'; icon: IonName };

const ITEMS: Item[] = [
  { key: 'dashboard',   label: 'Dashboard',   href: '/DashboardScreen',   lib: 'feather', icon: 'home' },
  { key: 'tanks',       label: 'Tanks',       href: '/TanksScreen',       lib: 'feather', icon: 'database' },
  { key: 'production',  label: 'Production',  href: '/ProductionScreen',  lib: 'feather', icon: 'trending-up' },
  { key: 'antiscalant', label: 'Antiscalant', href: '/AntiscalantScreen', lib: 'ion',     icon: 'flask-outline' },
  { key: 'more',        label: 'More',        href: '/MoreScreen',        lib: 'feather', icon: 'more-horizontal' },
];

const ICON_SIZE = 22;
const INDICATOR_W = 28;

function NavItem({ item, focused, badge, onPress }: { item: Item; focused: boolean; badge: number; onPress: () => void }) {
  const bar = useRef(new Animated.Value(focused ? 1 : 0)).current;

  // Top indicator slides/fades in when this tab becomes active.
  useEffect(() => {
    Animated.timing(bar, { toValue: focused ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [focused, bar]);

  const color = focused ? colors.primary : colors.onSurfaceVariant;

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${item.label}, ${badge} unacknowledged alert${badge === 1 ? '' : 's'}` : item.label}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { opacity: bar, transform: [{ scaleX: bar.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]}
      />

      <View>
        {item.lib === 'ion'
          ? <Ionicons name={item.icon} size={ICON_SIZE} color={color} />
          : <Feather name={item.icon} size={ICON_SIZE} color={color} />}
        {badge > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>
        )}
      </View>

      <Text style={[styles.label, { color, fontFamily: focused ? FONT.semibold : FONT.medium }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unacknowledged } = useAlarmSummary();
  const plc = usePlcAlarms();

  if (pathname === '/' || pathname === '/index') return null; // login screen

  const path = pathname.toLowerCase();
  // Every item except More is a real tab. Pages opened from More (Maintenance, Filtration...) keep More lit.
  const isTab = ITEMS.filter((x) => x.key !== 'more').some((x) => path === x.href.toLowerCase());

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {ITEMS.map((it) => {
        const focused = it.key === 'more' ? !isTab : path === it.href.toLowerCase();
        const badge = it.key === 'more' ? unacknowledged + plc.count : 0; // alerts now live under More, so the count rides on that tab
        return <NavItem key={it.key} item={it} focused={focused} badge={badge} onPress={() => router.navigate(it.href as any)} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLow, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceContainerHigh },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56, paddingTop: 6 },
  indicator: { position: 'absolute', top: 0, alignSelf: 'center', width: INDICATOR_W, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.primary },
  label: { fontSize: 10.5, letterSpacing: 0.1 },
  badge: { position: 'absolute', top: -5, right: -8, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surfaceContainerLow },
  badgeText: { color: colors.onError, fontSize: 9, lineHeight: 11, fontFamily: FONT.semibold },
});