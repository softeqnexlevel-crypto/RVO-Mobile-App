// src/components/tabBarOptions.ts
import { colors } from '../theme/tokens';
import { FONT } from '../theme/fonts';

export const tabBarScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.onSurfaceVariant,
  tabBarHideOnKeyboard: true,
  tabBarStyle: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabelStyle: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  tabBarBadgeStyle: { backgroundColor: colors.error, color: colors.onError, fontSize: 10, minWidth: 16, height: 16, lineHeight: 15 },
};