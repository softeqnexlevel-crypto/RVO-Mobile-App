// src/components/PressureGauge.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

export const DIAL_MAX_BAR = 16;
export const PRESSURE_BANDS_BAR = [
  { key: 'normal', label: 'Normal', min: 0, max: 8, color: '#2e9e4f' },
  { key: 'warning', label: 'Warning', min: 8, max: 12, color: '#f2c318' },
  { key: 'critical', label: 'Critical', min: 12, max: 16, color: '#dc2626' },
] as const;

export function classifyPressure(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const b = PRESSURE_BANDS_BAR;
  return b.find((x) => value >= x.min && value < x.max) ?? (value >= b[2].max ? b[2] : b[0]);
}

const BAR_PER_MPA = 10;
const START_DEG = 225;
const SWEEP_DEG = 270;
const OVERTRAVEL = 1.02;
const CX = 100;
const CY = 100;

const angleFor = (bar: number) => START_DEG - (bar / DIAL_MAX_BAR) * SWEEP_DEG;
const polar = (r: number, deg: number) => {
  const rad = (Math.PI / 180) * deg;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)] as const;
};
const arcPath = (r: number, a: number, b: number) => {
  const [x1, y1] = polar(r, a);
  const [x2, y2] = polar(r, b);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(a - b) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

const TICKS = Array.from({ length: 33 }, (_, i) => {
  const bar = i * 0.5;
  const major = i % 4 === 0;
  const deg = angleFor(bar);
  const [x1, y1] = polar(42.5, deg);
  const [x2, y2] = polar(major ? 47 : 45, deg);
  return { bar, major, x1, y1, x2, y2 };
});
const MPA_LABELS = Array.from({ length: 9 }, (_, i) => {
  const mpa = i * 0.2;
  const [x, y] = polar(52, angleFor(mpa * BAR_PER_MPA));
  return { text: i === 0 ? '0' : mpa.toFixed(1), x, y };
});
const BAR_LABELS = [0, 4, 8, 12, 16].map((bar) => {
  const [x, y] = polar(30, angleFor(bar));
  return { text: String(bar), x, y };
});

const FONT = 'Arial';

// Default size is now 150 for mobile
export default function PressureGauge({ value, size = 150 }: { value: number | null; size?: number }) {
  const hasValue = typeof value === 'number' && Number.isFinite(value);
  const target = hasValue ? Math.max(0, Math.min(DIAL_MAX_BAR * OVERTRAVEL, value as number)) : 0;

  const anim = useRef(new Animated.Value(target)).current;
  const [bar, setBar] = useState(target);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setBar(v));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [target, anim]);

  const rotation = -angleFor(bar);

  return (
    <Svg width={size} height={size} viewBox="38 38 124 124" accessibilityLabel={hasValue ? `Pressure ${(value as number).toFixed(1)} bar` : 'Pressure: no data'}>
      <Defs>
        <RadialGradient id="pg-dial" cx="0.5" cy="0.42" r="0.65">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.75" stopColor="#f7f8f6" />
          <Stop offset="1" stopColor="#e4e6e3" />
        </RadialGradient>
        <LinearGradient id="pg-glass" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="pg-hub" cx="0.35" cy="0.3" r="0.8">
          <Stop offset="0" stopColor="#6b7280" />
          <Stop offset="1" stopColor="#111315" />
        </RadialGradient>
        <ClipPath id="pg-clip">
          <Circle cx={CX} cy={CY} r={60} />
        </ClipPath>
      </Defs>

      <Circle cx={CX} cy={CY} r={60} fill="url(#pg-dial)" />

      {PRESSURE_BANDS_BAR.map((b) => (
        <Path key={b.key} d={arcPath(38.5, angleFor(b.min), angleFor(b.max))} stroke={b.color} strokeWidth={5} fill="none" strokeLinecap="butt" />
      ))}

      {TICKS.map((t) => (
        <Line key={t.bar} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#1b1b1b" strokeWidth={t.major ? 0.9 : 0.45} />
      ))}

      {MPA_LABELS.map((l) => (
        <SvgText key={`mpa-${l.text}`} x={l.x} y={l.y + 1.8} textAnchor="middle" fontSize={5.4} fontWeight="600" fill="#1b1b1b" fontFamily={FONT}>{l.text}</SvgText>
      ))}
      {BAR_LABELS.map((l) => (
        <SvgText key={`bar-${l.text}`} x={l.x} y={l.y + 1.8} textAnchor="middle" fontSize={5.2} fontWeight="700" fill="#c62828" fontFamily={FONT}>{l.text}</SvgText>
      ))}

      <SvgText x={CX} y={85} textAnchor="middle" fontSize={3.4} fill="#333" fontFamily={FONT}>PRESSURE GAUGE</SvgText>
      <SvgText x={CX} y={115} textAnchor="middle" fontSize={6.2} fontWeight="700" fill="#c62828" fontFamily={FONT}>bar</SvgText>
      <SvgText x={CX} y={123} textAnchor="middle" fontSize={5.6} fontWeight="600" fill="#1b1b1b" fontFamily={FONT}>MPa</SvgText>

      <G rotation={rotation} origin={`${CX}, ${CY}`} opacity={hasValue ? 1 : 0.35}>
        <Path
          transform="translate(0.8 1.4)"
          d={`M ${CX + 50} ${CY} L ${CX + 3} ${CY - 2.3} L ${CX - 14} ${CY - 1.4} L ${CX - 14} ${CY + 1.4} L ${CX + 3} ${CY + 2.3} Z`}
          fill="#000" opacity={0.25}
        />
        <Path d={`M ${CX + 50} ${CY} L ${CX + 3} ${CY - 2.3} L ${CX - 14} ${CY - 1.4} L ${CX - 14} ${CY + 1.4} L ${CX + 3} ${CY + 2.3} Z`} fill="#141618" />
      </G>

      <Circle cx={CX} cy={CY} r={5.6} fill="url(#pg-hub)" />
      <Circle cx={CX} cy={CY} r={1.8} fill="#d8dce0" />

      <G clipPath="url(#pg-clip)" pointerEvents="none">
        <Ellipse cx={80} cy={66} rx={40} ry={20} rotation={-32} origin="80, 66" fill="url(#pg-glass)" />
      </G>

      <Circle cx={CX} cy={CY} r={60} fill="none" stroke="#334155" strokeWidth={2} />
    </Svg>
  );
}