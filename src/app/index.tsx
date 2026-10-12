// src/app/index.tsx  — Login / landing screen
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ImageBackground, ScrollView, Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform, Linking, AccessibilityInfo, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

import { FONT } from '../theme/fonts';
import { signIn } from '../lib/auth';
import { startSession } from '../state/session';

// Add this asset: the RO plant photo used on the web login.
// const HERO = require('../../assets/images/login-hero.png');
const HERO = require('../asset/image/login-hero.png');

const C = {
  bg: '#0a0a0a',
  text: '#ffffff',
  muted: '#a3a3a3',
  label: '#b4b4b4',
  inputBg: '#eef3fd',
  inputText: '#0a0a0a',
  placeholder: '#6b7280',
  accent: '#0877b8',
  teal: '#14b8a6',
  link: '#1d8fe0',
  error: '#f87171',
  border: '#2a2a2a',
};

// First line is from the web page; the rest are placeholders: replace with your own copy.
const SLIDES = [
  { title: 'Live monitoring for industrial water treatment', body: 'Aqua Systemtech turns your borehole and RO instrumentation into a single live dashboard — flow, recovery, dosing and tank levels, tracked automatically.' },
  { title: 'Know your recovery in real time', body: 'Feed, permeate and concentrate flow side by side, so drift shows up before it costs you.' },
  { title: 'Alarms before downtime', body: 'Get alerted the moment pressure, level or conductivity leaves its safe range.' },
  { title: 'Every trend, one tap away', body: 'Scrub through hours or days of sensor history right from your phone.' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_KEY = 'login.email';
const SITE = 'https://aquasystemtech.co.ke'; // TODO: point to your sales / reset-password pages

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  /* ---- hero carousel ---- */
  const [slide, setSlide] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  const goTo = (i: number) => {
    if (reduceMotion) { setSlide(i); return; }
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setSlide(i);
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  };
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => goTo((slide + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [slide, reduceMotion]);

  /* ---- form ---- */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const passRef = useRef<TextInput>(null);

  // Remember the email only. The password is never stored.
  useEffect(() => {
    SecureStore.getItemAsync(EMAIL_KEY).then((v) => { if (v) { setEmail(v); setRemember(true); } }).catch(() => {});
  }, []);

  const emailErr = !email.trim() ? 'Enter your email' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address' : null;
  const passErr = !password ? 'Enter your password' : null;

  const submit = async () => {
    setTouched({ email: true, password: true });
    setFormError(null);
    if (emailErr || passErr || busy) return;
    setBusy(true);
    try {
      const res = await signIn(email.trim(), password);
      if (remember) await SecureStore.setItemAsync(EMAIL_KEY, email.trim()).catch(() => {});
      else await SecureStore.deleteItemAsync(EMAIL_KEY).catch(() => {});
      await startSession(res, remember); // stores the tokens (only if 'Remember me' is ticked); the layout guard also redirects
      router.replace('/DashboardScreen');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not sign in. Check your details and try again.'); // server messages such as 'Invalid credentials' or 'Account disabled' show as-is
    } finally {
      setBusy(false);
    }
  };

  const open = (path = '') => Linking.openURL(`${SITE}${path}`).catch(() => {});

  /* ---- pieces ---- */
  const hero = (
    <ImageBackground source={HERO} resizeMode="cover" style={[styles.hero, wide ? { flex: 1 } : { height: 300 }]} accessibilityIgnoresInvertColors>
      <LinearGradient colors={['rgba(10,30,50,0)', 'rgba(10,30,50,0.55)', 'rgba(8,25,45,0.92)']} locations={[0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.caption}>
        <Animated.View style={{ opacity: fade }} accessibilityLiveRegion="polite">
          <Text style={styles.heroTitle}>{SLIDES[slide].title}</Text>
          <Text style={styles.heroBody}>{SLIDES[slide].body}</Text>
        </Animated.View>
        <View style={styles.dashes}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={`Show message ${i + 1} of ${SLIDES.length}`}>
              <View style={[styles.dash, i === slide && { backgroundColor: C.teal }]} />
            </Pressable>
          ))}
        </View>
      </View>
    </ImageBackground>
  );

  const form = (
    <View style={styles.formWrap}>
      <View style={styles.brand}>
        <View style={styles.logo}><MaterialIcons name="water-drop" size={16} color="#fff" /></View>
        <Text style={styles.brandText}>Aqua <Text style={{ color: C.teal }}>Systemtech</Text></Text>
      </View>

      <Text style={styles.h1} accessibilityRole="header">Welcome back</Text>
      <Text style={styles.sub}>Sign in to access your dashboard</Text>

      {!!formError && (
        <View style={styles.errBox} accessibilityLiveRegion="assertive">
          <MaterialIcons name="error-outline" size={16} color={C.error} />
          <Text style={styles.errBoxText}>{formError}</Text>
        </View>
      )}

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, touched.email && !!emailErr && styles.inputErr]}
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        placeholder="you@company.com"
        placeholderTextColor={C.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passRef.current?.focus()}
        editable={!busy}
        accessibilityLabel="Email"
      />
      {touched.email && !!emailErr && <Text style={styles.fieldErr}>{emailErr}</Text>}

      <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
      <View>
        <TextInput
          ref={passRef}
          style={[styles.input, { paddingRight: 48 }, touched.password && !!passErr && styles.inputErr]}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          placeholder="Your password"
          placeholderTextColor={C.placeholder}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
          accessibilityLabel="Password"
        />
        <Pressable style={styles.eye} onPress={() => setShow((s) => !s)} hitSlop={10} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}>
          <MaterialIcons name={show ? 'visibility-off' : 'visibility'} size={20} color={C.placeholder} />
        </Pressable>
      </View>
      {touched.password && !!passErr && <Text style={styles.fieldErr}>{passErr}</Text>}

      <View style={styles.rowBetween}>
        <Pressable style={styles.check} onPress={() => setRemember((r) => !r)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: remember }} accessibilityLabel="Remember me">
          <View style={[styles.box, remember && { backgroundColor: C.accent, borderColor: C.accent }]}>
            {remember && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.small}>Remember me</Text>
        </Pressable>
        <Pressable onPress={() => open('/forgot-password')} hitSlop={10} accessibilityRole="link">
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, (pressed || busy) && { opacity: 0.8 }]}
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        accessibilityLabel={busy ? 'Signing in' : 'Sign in'}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Sign In</Text>}
      </Pressable>

      <View style={styles.sales}>
        <Text style={styles.small}>Need access? </Text>
        <Pressable onPress={() => open('/contact')} hitSlop={10} accessibilityRole="link">
          <Text style={styles.link}>Talk to sales</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {wide ? (
        <View style={styles.split}>
          {hero}
          <View style={styles.panel}>
            <ScrollView contentContainerStyle={styles.panelScroll} keyboardShouldPersistTaps="handled">{form}</ScrollView>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
            {hero}
            <View style={styles.sheet}>{form}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  split: { flex: 1, flexDirection: 'row' },
  panel: { flex: 1, backgroundColor: C.bg },
  panelScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: { flex: 1, backgroundColor: C.bg, marginTop: -20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },

  hero: { justifyContent: 'flex-end', backgroundColor: '#1b2b3d' },
  caption: { padding: 24, paddingBottom: 40 },
  heroTitle: { color: '#fff', fontFamily: FONT.heading, fontSize: 22, lineHeight: 28 },
  heroBody: { color: 'rgba(255,255,255,0.88)', fontFamily: FONT.body, fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 420 },
  dashes: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dash: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },

  formWrap: { width: '100%', maxWidth: 420 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  logo: { width: 20, height: 20, borderRadius: 4, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: C.text, fontFamily: FONT.heading, fontSize: 14, fontWeight: '700' },
  h1: { color: C.text, fontFamily: FONT.heading, fontSize: 26, fontWeight: '700' },
  sub: { color: C.muted, fontFamily: FONT.body, fontSize: 14, marginTop: 6, marginBottom: 24 },

  label: { color: C.label, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  input: { height: 48, borderRadius: 6, backgroundColor: C.inputBg, color: C.inputText, fontFamily: FONT.body, fontSize: 15, paddingHorizontal: 14, borderWidth: 1, borderColor: 'transparent' },
  inputErr: { borderColor: C.error },
  fieldErr: { color: C.error, fontFamily: FONT.body, fontSize: 12, marginTop: 6 },
  eye: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 20, minHeight: 32 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  small: { color: C.muted, fontFamily: FONT.body, fontSize: 13 },
  link: { color: C.link, fontFamily: FONT.body, fontSize: 13 },

  cta: { height: 48, borderRadius: 6, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONT.semibold, fontSize: 15, fontWeight: '700' },

  sales: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, minHeight: 32 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)', backgroundColor: 'rgba(248,113,113,0.1)', marginBottom: 16 },
  errBoxText: { color: C.error, fontFamily: FONT.body, fontSize: 13, flex: 1 },
});