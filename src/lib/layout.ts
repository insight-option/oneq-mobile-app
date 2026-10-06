/**
 * Window width helpers. On web the app renders inside a centred phone-width shell (src/app/_layout.tsx), so
 * width-dependent layouts (carousel pages, hero images, onboarding slides) must use the shell width, not the browser's.
 */
import { Dimensions, Platform, useWindowDimensions } from 'react-native';

export const WEB_MAX_WIDTH = 480;

const clamp = (width: number): number => (Platform.OS === 'web' ? Math.min(width, WEB_MAX_WIDTH) : width);

/** one-off read (module scope / outside React) */
export const appWidth = (): number => clamp(Dimensions.get('window').width);

/** reactive read (re-renders on rotation / browser resize) */
export const useAppWidth = (): number => clamp(useWindowDimensions().width);

/**
 * Browsers draw their own focus ring around text inputs (a square blue outline) on top of our styled field;
 * add this to every TextInput style array. No-op on native.
 */
export const WEB_INPUT_RESET = Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null;
