// components/RadialGauge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, type } from '../theme/tokens';

type Props = {
  percent: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  valueLabel?: string; // defaults to `${percent}%`
  valueColor?: string;
};

export default function RadialGauge({
  percent,
  size = 44,
  strokeWidth = 4,
  color = colors.primary,
  trackColor = colors.surfaceContainerHighest,
  valueLabel,
  valueColor = colors.onSurface,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          // rotate so the arc starts at 12 o'clock, matching the web gauge
          origin={`${size / 2}, ${size / 2}`}
          rotation={-90}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.centerLabel}>
          <Text style={[type.labelTabular, { color: valueColor, fontWeight: '700' as any }]}>
            {valueLabel ?? `${Math.round(clamped)}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerLabel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
