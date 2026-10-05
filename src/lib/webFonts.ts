/**
 * Brand fonts on web. Native builds get them from the expo-font config plugin (app.json), which registers the files
 * by their basenames; the browser has no such step, so the same families are loaded here through expo-font
 * (@font-face injection). Text renders with the fallback font until they arrive, then swaps automatically.
 */
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

const WEB_FONTS: Record<string, number> = Platform.OS === 'web'
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

/** Returns true once the web fonts are available (always true on native). */
export const useWebFonts = (): boolean => {
  const [loaded, error] = useFonts(WEB_FONTS);
  return Platform.OS !== 'web' || loaded || Boolean(error);
};
