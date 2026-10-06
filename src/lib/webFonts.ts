/**
 * Brand fonts outside native builds. Native builds get them from the expo-font config plugin (app.json), which
 * registers the files by their basenames; the browser and Expo Go have no such step, so the same families are
 * loaded here through expo-font. Text renders with the fallback font until they arrive, then swaps automatically.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

const NEEDS_RUNTIME_FONTS = Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const RUNTIME_FONTS: Record<string, number> = NEEDS_RUNTIME_FONTS
  ? {
      'IBMPlexSansArabic-Regular': require('../../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
      'IBMPlexSansArabic-Medium': require('../../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
      'IBMPlexSansArabic-SemiBold': require('../../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
      'IBMPlexSansArabic-Bold': require('../../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
      'Outfit-Regular': require('../../assets/fonts/Outfit-Regular.ttf'),
      'Outfit-Medium': require('../../assets/fonts/Outfit-Medium.ttf'),
      'Outfit-SemiBold': require('../../assets/fonts/Outfit-SemiBold.ttf'),
      'Outfit-Bold': require('../../assets/fonts/Outfit-Bold.ttf'),
      'PlayfairDisplay-SemiBold': require('../../assets/fonts/PlayfairDisplay-SemiBold.ttf'),
      'PlayfairDisplay-Bold': require('../../assets/fonts/PlayfairDisplay-Bold.ttf'),
    }
  : {};

/** Returns true once the runtime-loaded fonts are available (always true in native builds). */
export const useWebFonts = (): boolean => {
  const [loaded, error] = useFonts(RUNTIME_FONTS);
  return !NEEDS_RUNTIME_FONTS || loaded || Boolean(error);
};
