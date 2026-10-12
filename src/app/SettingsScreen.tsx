// src/app/SettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, Modal, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import { Card, Label, Pill, Row, C } from '../components/ui';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { useTags } from '../state/useTags';
import { settingsStore, useSettings } from '../state/settingsStore';
import { clearHistory, pointCount } from '../state/history';
import { TOTAL_SENSORS } from '../lib/dashboardLogic';
import { authMode, changePassword } from '../lib/auth';
import { endSession, useSession } from '../state/session';

const REFRESH = [5, 10, 30] as const;

export default function SettingsScreen() {
  const { live } = useTags();
  const { user } = useSession();
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [busy, setBusy] = useState(false);

  const submitPw = async () => {
    if (!cur || !nw) return Alert.alert('Fill in both passwords');
    if (nw.length < 8) return Alert.alert('Too short', 'Use at least 8 characters.');
    if (nw !== cf) return Alert.alert('Passwords do not match');
    setBusy(true);
    try {
      await changePassword(cur, nw);
      setPwOpen(false); setCur(''); setNw(''); setCf('');
      // The server signs every device out when the password changes, so sign in again.
      Alert.alert('Password changed', 'Please sign in again.', [{ text: 'OK', onPress: () => endSession() }]);
    } catch (e) {
      Alert.alert('Could not change password', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };
  const { refreshSec } = useSettings();
  const online = live.sensorCount ?? 0;
  const status = !live.connected ? { l: 'Disconnected', c: C.red } : live.isFresh && online > 0 ? { l: 'Connected', c: C.green } : { l: 'No fresh data', c: C.amber };

  return (
    <Screen title="Settings">
      <Label>Connection</Label>
      <Card>
        <Row title="Plant gateway" sub={`${online} of ${TOTAL_SENSORS} sensors reporting`} right={<Pill label={status.l} color={status.c} />} last />
      </Card>

      <Label>Data</Label>
      <Card style={s.pad}>
        <Text style={s.title}>Recording interval</Text>
        <Text style={s.sub}>How often the app saves a reading for charts and reports.</Text>
        <View style={s.seg}>
          {REFRESH.map((n) => (
            <Pressable key={n} onPress={() => settingsStore.set({ refreshSec: n })} style={[s.segBtn, refreshSec === n && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: refreshSec === n }}>
              <Text style={[s.segText, refreshSec === n && { color: '#fff' }]}>{n} s</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Row title="Recorded history" sub={`${pointCount().toLocaleString()} readings saved on this phone (24 h, cleared on app close)`}
          onPress={() => Alert.alert('Clear recorded history?', 'Charts and reports will start empty again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearHistory }])} last />
      </Card>

      <Label>Notifications</Label>
      <Card>
        <Row icon="notifications-none" title="Push notifications" sub="Alarm alerts when the app is closed need a notification service on your server." right={<Pill label="Needs server" color={C.grey} />} disabled last />
      </Card>

      <Label>Account</Label>
      <Card>
        <Row title={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Signed in'} sub={user?.email}
          right={user?.role ? <Pill label={user.role[0].toUpperCase() + user.role.slice(1)} color={C.blue} /> : undefined} />
        {authMode === 'remote' && <Row icon="lock-outline" title="Change password" onPress={() => setPwOpen(true)} />}
        <Row title="Sign-in mode" sub={authMode === 'bypass' ? 'Demo mode: any email and password is accepted. Never use this for real.' : 'Signed in with your server account'}
          right={<Pill label={authMode === 'bypass' ? 'Demo' : 'Secure'} color={authMode === 'bypass' ? C.amber : C.green} />} last />
      </Card>

      <Label>About</Label>
      <Card>
        <Row title="Aqua Systemtech" sub={`Version ${Constants.expoConfig?.version ?? '1.0'}`} last />
      </Card>

      <Modal visible={pwOpen} transparent animationType="slide" onRequestClose={() => setPwOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.scrim}>
          <SafeAreaView edges={['bottom']} style={s.sheet}>
            <Text style={s.sheetTitle}>Change password</Text>
            {([[cur, setCur, 'Current password'], [nw, setNw, 'New password (8+ characters)'], [cf, setCf, 'Repeat new password']] as const).map(([v, set, ph]) => (
              <TextInput key={ph} value={v} onChangeText={set} placeholder={ph} placeholderTextColor={colors.onSurfaceVariant} secureTextEntry autoCapitalize="none" autoCorrect={false} style={s.field} accessibilityLabel={ph} />
            ))}
            <Pressable style={[s.cta, busy && { opacity: 0.6 }]} onPress={submitPw} disabled={busy} accessibilityRole="button"><Text style={s.ctaText}>{busy ? 'Saving…' : 'Save password'}</Text></Pressable>
            <Pressable onPress={() => setPwOpen(false)} style={{ alignItems: 'center', padding: 8 }} accessibilityRole="button"><Text style={s.sub}>Cancel</Text></Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surfaceContainerLow, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, gap: 10 },
  sheetTitle: { fontFamily: FONT.heading, fontSize: 16, color: colors.onSurface, marginBottom: 4 },
  field: { height: 48, borderRadius: radii.md, paddingHorizontal: 14, backgroundColor: colors.surfaceContainerHigh, color: colors.onSurface, fontFamily: FONT.body, fontSize: 14 },
  cta: { height: 50, borderRadius: radii.lg, backgroundColor: '#0877b8', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: FONT.heading, fontSize: 15, color: '#fff' },
  pad: { padding: spacing.md, gap: 8 },
  title: { fontFamily: FONT.medium, fontSize: 14, color: colors.onSurface },
  sub: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant },
  seg: { flexDirection: 'row', gap: 6, marginTop: 4 },
  segBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radii.md, backgroundColor: colors.surfaceContainerHigh },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.onSurfaceVariant },
});