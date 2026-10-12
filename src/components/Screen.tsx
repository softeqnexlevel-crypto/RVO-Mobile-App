// src/components/Screen.tsx  — page shell: back button + title + scrolling body that clears the tab bar.
import React, { useContext } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { colors, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';

type Props = { title: string; back?: boolean; children: React.ReactNode; right?: React.ReactNode; onRefresh?: () => Promise<void> | void };

export default function Screen({ title, back = true, children, right, onRefresh }: Props) {
  const router = useRouter();
  const tabH = useContext(BottomTabBarHeightContext) ?? 0;
  const [refreshing, setRefreshing] = React.useState(false);
  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.head}>
        <View style={s.headRow}>
          {back && (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/MoreScreen' as any))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
              <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
            </Pressable>
          )}
          <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
          {right}
        </View>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: tabH + spacing.md }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { backgroundColor: colors.background },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs, minHeight: 48 },
  title: { flex: 1, fontFamily: FONT.heading, fontSize: 20, color: colors.onSurface, marginLeft: 4 },
  body: { padding: spacing.md, gap: spacing.sm + 4 },
});