// src/theme/fonts.ts
// npx expo install expo-font @expo-google-fonts/inter @expo-google-fonts/space-grotesk @expo-google-fonts/space-mono
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

export const FONT = {
  heading: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  mono: 'SpaceMono_400Regular',
  medium: 'Inter_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/** true once fonts are ready (or failed, so the app never hangs on a bad load). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_600SemiBold, SpaceGrotesk_700Bold, SpaceMono_400Regular });
  return loaded || !!error;
}

