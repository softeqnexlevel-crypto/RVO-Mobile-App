import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  AccessibilityInfo,
  useWindowDimensions,
  Image, // Added Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Line, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
// const Logo = "../../assets/images/lg.png"
type Props = {
  done: boolean;
  onHidden: () => void;
  onLaunch?: () => void;
  onSignIn?: () => void;
};

// ─── Palette ───
const C = {
  bgRoot: '#0A1620',
  bgPanel: '#0E2233',
  gridLine: 'rgba(43, 217, 224, 0.06)',
  strokeDim: '#1E3A50',
  cyan: '#2BD9E0',
  cyanDim: '#1A8F99',
  teal: '#3EE0B0',
  amber: '#E0A020',
  textHi: '#E6F1F8',
  textMid: '#8FA6B8',
  textLo: '#5A7185',
  cardBg: 'rgba(13, 33, 48, 0.75)',
  cardBorder: 'rgba(43, 217, 224, 0.18)',
};

const MONO = 'Menlo';

// ─── Static boot strings ───
const BOOT_STAGE = 'Initializing Secure Enclave & Gateway Handshake';
const PING = '14ms';
const CHANNEL = 'STAGE-3 ACTV';
const PURITY = '0.08 µS/cm';

// ─── Timing ───
const MIN_VISIBLE_MS = 3200;
const BOOT_MS = 2400;
const FINISH_MS = 250;
const HOLD_MS = 200;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 600;

// ─── Logo Import ───
// Adjust the path based on your folder structure. 
// If AppSplash is in src/components, and logo is in src/assets/images:
const LogoSource = '../../assets/images/lg.png'; 

export default function AppSplash({ done, onHidden, onLaunch, onSignIn }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [pct, setPct] = useState(0);

  const out = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0.94,
      duration: BOOT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setPct(Math.round(value * 100)));
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  useEffect(() => {
    if (!done || !minElapsed) return;
    const seq = Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: FINISH_MS,
        useNativeDriver: false,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(out, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    seq.start(({ finished }) => finished && onHidden());
    return () => seq.stop();
  }, [done, minElapsed]); 

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: out }]}
      pointerEvents={done && minElapsed ? 'none' : 'auto'}
    >
      <LinearGradient
        colors={['#071019', '#0A1620', '#0B1F2E']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <GridOverlay />

      <Animated.View style={[styles.panel, { opacity: fade }]}>
        {/* Top status bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusMono}>
            09:48:30 <Text style={styles.statusMuted}>UTC</Text>
          </Text>
          <View style={styles.statusRight}>
            <View style={styles.dot} />
            <Text style={styles.statusAmber}>{PING}</Text>
            <Text style={styles.statusMuted}>  |  SCADA BUS</Text>
          </View>
        </View>

        {/* Header chips */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>RO-SYSTEM  //  SECURE GATEWAY</Text>
          </View>
          <View style={[styles.chip, styles.chipGreen]}>
            <MaterialIcons name="lock-outline" size={10} color={C.teal} />
            <Text style={[styles.chipText, { color: C.teal }]}>
              {'  '}TLS 1.3  VALID
            </Text>
          </View>
        </View>

        {/* Radar dial */}
        <View style={styles.radarWrap}>
          <RadarDial pulse={pulse} reduceMotion={reduceMotion} />
          <View style={styles.flowChip}>
            <View style={styles.flowDot} />
            <Text style={styles.flowText}>FLOW // 84.6 PSI</Text>
          </View>
        </View>

        {/* ── Brand lockup with LOGO ── */}
        <View style={styles.brand}>
          <Image 
            source={LogoSource} 
            style={styles.logo} 
            resizeMode="contain"
            accessibilityLabel="Rift Valley Osmotics Logo"
          />
          <Text style={styles.tagline}>EVERY DROP. UNDER CONTROL.</Text>
          <Text style={styles.subtitle}>
            Industrial Reverse Osmosis &amp; Water Treatment OS
          </Text>
        </View>

        {/* Boot handshake card */}
        <View style={styles.bootCard}>
          <View style={styles.bootTop}>
            <View style={styles.bootLeft}>
              <View style={styles.bootDot} />
              <Text style={styles.bootTitle} numberOfLines={1}>
                {BOOT_STAGE}
              </Text>
            </View>
            <Text style={styles.bootPct}>{pct}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.bootStats}>
            <Stat label="PING" value={PING} />
            <Stat label="CH-RO" value={CHANNEL} />
            <Stat label="PURITY" value={PURITY} />
          </View>
        </View>

        {/* CTAs */}
        <Pressable
          onPress={onLaunch}
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Launch Console"
        >
          <LinearGradient
            colors={[C.cyan, '#3EE6C8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaPrimaryGrad}
          >
            <Text style={styles.ctaPrimaryText}>Launch Console</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#06222A" />
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onSignIn}
          style={({ pressed }) => [styles.ctaSecondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <MaterialIcons name="vpn-key" size={14} color={C.cyan} />
          <Text style={styles.ctaSecondaryText}>Sign in</Text>
        </Pressable>

        {/* Footer strip */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.dot} />
            <Text style={styles.footerOnline}>STATION ONLINE</Text>
          </View>
          <Text style={styles.footerBrand}>RIFT VALLEY OSMOTICS </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Sub-components ───

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}:</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function GridOverlay() {
  const lines = Array.from({ length: 24 });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lines.map((_, i) => (
        <View
          key={`h${i}`}
          style={[styles.gridH, { top: `${(i / lines.length) * 100}%` }]}
        />
      ))}
      {lines.map((_, i) => (
        <View
          key={`v${i}`}
          style={[styles.gridV, { left: `${(i / lines.length) * 100}%` }]}
        />
      ))}
    </View>
  );
}

function RadarDial({
  pulse,
  reduceMotion,
}: {
  pulse: Animated.Value;
  reduceMotion: boolean;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(240, width * 0.62);
  const r = size / 2;
  const cx = r;
  const cy = r;

  const cardinals = [
    { label: '000', angle: 0 },
    { label: '090', angle: 90 },
    { label: '180', angle: 180 },
    { label: '270', angle: 270 },
  ];

  const ticks = Array.from({ length: 24 });

  const pulseStyle = reduceMotion
    ? undefined
    : {
        opacity: pulse.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0, 0.35, 0],
        }),
        transform: [
          {
            scale: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            }),
          },
        ],
      };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!reduceMotion && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1,
              borderColor: C.cyan,
            },
            pulseStyle,
          ]}
        />
      )}

      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="dropGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={C.cyan} stopOpacity="0.9" />
            <Stop offset="60%" stopColor={C.cyan} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Circle cx={cx} cy={cy} r={r - 2} stroke={C.strokeDim} strokeWidth={1} fill="none" />
        <Circle cx={cx} cy={cy} r={r - 14} stroke={C.strokeDim} strokeWidth={0.6} fill="none" />
        <Circle cx={cx} cy={cy} r={r * 0.55} stroke="rgba(43,217,224,0.25)" strokeWidth={0.8} fill="none" />
        <Circle cx={cx} cy={cy} r={r * 0.42} fill="url(#dropGlow)" />

        {ticks.map((_, i) => {
          const angle = (i * 360) / ticks.length;
          const rad = ((angle - 90) * Math.PI) / 180;
          const isMajor = i % 6 === 0;
          const inner = r - (isMajor ? 16 : 10);
          const outer = r - 4;
          const x1 = cx + inner * Math.cos(rad);
          const y1 = cy + inner * Math.sin(rad);
          const x2 = cx + outer * Math.cos(rad);
          const y2 = cy + outer * Math.sin(rad);
          return (
            <Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? C.cyan : C.strokeDim}
              strokeWidth={isMajor ? 1.2 : 0.6}
            />
          );
        })}

        {cardinals.map((c) => {
          const rad = ((c.angle - 90) * Math.PI) / 180;
          const labelR = r - 26;
          const x = cx + labelR * Math.cos(rad);
          const y = cy + labelR * Math.sin(rad);
          return (
            <SvgText
              key={c.label}
              x={x}
              y={y + 3}
              fill={C.textLo}
              fontSize={8}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {c.label}
            </SvgText>
          );
        })}
      </Svg>

      <View pointerEvents="none" style={styles.dropWrap}>
        <MaterialIcons name="water-drop" size={size * 0.28} color={C.cyan} />
      </View>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  root: {
    zIndex: 100,
    backgroundColor: C.bgRoot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.gridLine },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: C.gridLine },
  panel: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'rgba(10, 22, 32, 0.55)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 80, 0.6)',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusRight: { flexDirection: 'row', alignItems: 'center' },
  statusMono: { fontFamily: MONO, fontSize: 10, color: C.teal, letterSpacing: 1 },
  statusMuted: { color: C.textLo, fontFamily: MONO, fontSize: 10, letterSpacing: 1 },
  statusAmber: { color: C.amber, fontFamily: MONO, fontSize: 10, letterSpacing: 1, marginLeft: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.teal,
    shadowColor: C.teal,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.strokeDim,
    backgroundColor: 'rgba(15, 40, 55, 0.6)',
  },
  chipGreen: {
    borderColor: 'rgba(62, 224, 176, 0.4)',
    backgroundColor: 'rgba(62, 224, 176, 0.08)',
  },
  chipText: {
    fontFamily: MONO,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: C.textMid,
  },
  radarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  dropWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowChip: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(43, 217, 224, 0.35)',
    backgroundColor: 'rgba(10, 22, 32, 0.9)',
  },
  flowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cyan,
    marginRight: 6,
  },
  flowText: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: C.cyan,
    letterSpacing: 1.2,
  },
  
  // Brand Section with Logo
  brand: { alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 180, // Adjust width as needed
    height: 60, // Adjust height to maintain aspect ratio
    marginBottom: 8,
  },
  tagline: {
    color: C.cyan,
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 4,
  },
  subtitle: {
    color: C.textMid,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  bootCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.cardBg,
    padding: 12,
    marginBottom: 18,
  },
  bootTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bootLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bootDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.cyan,
    marginRight: 8,
    shadowColor: C.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  bootTitle: {
    color: C.textHi,
    fontSize: 10.5,
    fontFamily: MONO,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  bootPct: {
    color: C.cyan,
    fontFamily: MONO,
    fontSize: 11,
    marginLeft: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(43, 217, 224, 0.12)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  bootStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: C.textLo,
    letterSpacing: 0.8,
    marginRight: 4,
  },
  statValue: {
    fontFamily: MONO,
    fontSize: 9,
    color: C.cyan,
    letterSpacing: 0.8,
  },
  ctaPrimary: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ctaPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  ctaPrimaryText: {
    color: '#06222A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(43, 217, 224, 0.45)',
    backgroundColor: 'rgba(15, 40, 55, 0.6)',
    gap: 8,
  },
  ctaSecondaryText: {
    color: C.cyan,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  pressed: { opacity: 0.85 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center' },
  footerOnline: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: C.teal,
    letterSpacing: 1.2,
    marginLeft: 6,
  },
  footerBrand: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: C.textLo,
    letterSpacing: 1.2,
  },
});