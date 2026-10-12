// src/app/_layout.tsx
import { useEffect, useState } from 'react';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { Tabs, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import BottomNav from '../components/BottomNav';
import AppSplash from '../components/AppSplash';
import { hydrateSession, useSession } from '../state/session';
import { useHistoryRecorder } from '../state/useHistoryRecorder';

/** Stable reference so the tab bar isn't re-created on every layout render.
 *  BottomNav reads the route itself and hides on the login screen. */
const renderTabBar = () => <BottomNav />;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useHistoryRecorder(); // keeps a rolling 24 h of live values for the charts
  const { status } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  // Splash stays up for at least 1.8s, and until fonts + saved session are ready.
  const [minElapsed, setMinElapsed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMinElapsed(true), 1800); return () => clearTimeout(t); }, []);
  useEffect(() => { hydrateSession(); }, []);

  const ready = fontsLoaded && status !== 'loading';

  // Signed out -> login. Signed in on the login screen -> dashboard. Runs under the splash.
  useEffect(() => {
    if (!ready || !navState?.key) return;
    const atLogin = segments.length === 0 || segments[0] === 'index';
    if (status === 'out' && !atLogin) router.replace('/');
    if (status === 'in' && atLogin) router.replace('/DashboardScreen' as any);
  }, [ready, navState?.key, status, segments]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {/*
          index = login (no nav bar). Every route below MUST have a matching file in src/app.
          Screens must NOT render <BottomNav /> themselves.
        */}
        {ready && (
          <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="DashboardScreen" />
            <Tabs.Screen name="TanksScreen" />
            <Tabs.Screen name="ProductionScreen" />
            <Tabs.Screen name="AlarmsScreen" options={{ href: null }} />
            <Tabs.Screen name="MoreScreen" />
            {/* Sub-pages reached from More: routes only, no tab buttons (BottomNav is custom). */}
            <Tabs.Screen name="AntiscalantScreen" options={{ href: null }} />
            <Tabs.Screen name="FiltrationScreen" options={{ href: null }} />
            <Tabs.Screen name="RecoveryScreen" options={{ href: null }} />
            <Tabs.Screen name="MaintenanceScreen" options={{ href: null }} />
            <Tabs.Screen name="AnalyticsScreen" options={{ href: null }} />
            <Tabs.Screen name="ReportsScreen" options={{ href: null }} />
            <Tabs.Screen name="SettingsScreen" options={{ href: null }} />
            <Tabs.Screen name="TagManagerScreen" options={{ href: null }} />
          </Tabs>
        )}
        {!splashGone && <AppSplash done={ready && minElapsed} onHidden={() => setSplashGone(true)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});