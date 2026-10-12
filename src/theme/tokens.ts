// theme/tokens.ts
// Ported 1:1 from the HydroPrecision Industrial Dark design system.

export const colors = {
  background: '#131313',
  surface: '#131313',
  surfaceDim: '#131313',
  surfaceBright: '#3a3939',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',

  onSurface: '#e5e2e1',
  onSurfaceVariant: '#bdc8d1',
  outline: '#87929b',
  outlineVariant: '#3e4850',

  primary: '#80d0ff',
  onPrimary: '#00344b',
  primaryContainer: '#08a9e6',
  onPrimaryContainer: '#003a51',

  secondary: '#5dd4ff',
  onSecondary: '#003545',
  secondaryContainer: '#00b7e4',
  onSecondaryContainer: '#004356',

  tertiary: '#4be180',
  onTertiary: '#003918',
  tertiaryContainer: '#00b65c',
  onTertiaryContainer: '#003f1b',

  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  surfaceVariant: '#353534',
} as const;

export const radii = {
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

// Font families — loaded via expo-font
export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

// Type styles - textTransform is a valid RN style property
export const type = {
  headlineLg: { fontFamily: fonts.sansBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.6 },
  headlineMd: { fontFamily: fonts.sansSemiBold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  headlineSm: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 24 },
  telemetryDisplay: { fontFamily: fonts.monoBold, fontSize: 36, lineHeight: 44, letterSpacing: -1 },
  telemetryMetric: { fontFamily: fonts.monoSemiBold, fontSize: 22, lineHeight: 28 },
  bodyLg: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  labelUppercase: { 
    fontFamily: fonts.monoSemiBold, 
    fontSize: 11, 
    lineHeight: 14, 
    letterSpacing: 0.9, 
    textTransform: 'uppercase' as const // RN requires 'uppercase' specifically
  },
  labelTabular: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
};

// Status → color helper
export type Tone = 'nominal' | 'warning' | 'critical' | 'info' | 'neutral';

export function toneColor(tone: Tone): string {
  switch (tone) {
    case 'nominal': return colors.tertiary;
    case 'warning': return colors.secondary;
    case 'critical': return colors.error;
    case 'info': return colors.primary;
    case 'neutral': default: return colors.outline;
  }
}

// Helper for semi-transparent colors (RN doesn't have Tailwind's /50)
export function withAlpha(hex: string, alpha: number): string {
  // Converts #RRGGBB to #RRGGBBAA
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}