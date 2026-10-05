/**
 * OneQ design tokens. Two palettes share one brand:
 *  - `customer`  → link-1 look: white canvas, maroon rounded headers, pink tints.
 *  - `workspace` → link-2 look: cream canvas, soft sand surfaces (company + admin workspaces).
 * Never hardcode hex values in components — read them from `useTheme()`.
 */
import { Platform } from 'react-native';

export const brand = {
  maroon: '#5A0020',
  maroonDark: '#45001A',
  maroonDeep: '#2A000F',
  maroonLight: '#7A1F3D',
  maroonTint: '#F3E6E6',
  pinkTint: '#FBE8ED',
  cream: '#F7F0EA',
  canvas: '#FBF8F5',
  surface: '#FFFCF7',
  sand: '#F1E7DD',
  sandDeep: '#E8DACE',
  gold: '#9A4516',
  goldTint: '#F7E8DC',
  goldBright: '#F2B25C',
  star: '#F5A623',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface Palette {
  /** page background */
  canvas: string;
  /** cards and sheets */
  surface: string;
  /** secondary surface (section backgrounds, inputs) */
  surfaceAlt: string;
  /** soft brand tint for icon bubbles, chips */
  tint: string;
  tintStrong: string;
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  primaryLight: string;
  onPrimary: string;
  ink: string;
  inkStrong: string;
  muted: string;
  faint: string;
  line: string;
  lineStrong: string;
  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
  danger: string;
  dangerTint: string;
  info: string;
  infoTint: string;
  gold: string;
  goldTint: string;
  star: string;
  overlay: string;
  /** tab bar */
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  tabActivePill: string;
  /** link-1 tag colors */
  tagFeatured: string;
  tagStudent: string;
  tagOffer: string;
  tagInsurance: string;
  tagOpen: string;
  tagClosed: string;
  tagHome: string;
  tagOnsite: string;
}

export const customerPalette: Palette = {
  canvas: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FA',
  tint: brand.pinkTint,
  tintStrong: '#F5D5DD',
  primary: brand.maroon,
  primaryDark: brand.maroonDark,
  primaryDeep: brand.maroonDeep,
  primaryLight: brand.maroonLight,
  onPrimary: '#FFFFFF',
  ink: '#1C263B',
  inkStrong: '#111827',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#EEF0F3',
  lineStrong: '#E2E5EA',
  success: '#16A34A',
  successTint: '#DCFCE7',
  warning: '#D97706',
  warningTint: '#FEF3C7',
  danger: '#DC2626',
  dangerTint: '#FEE2E2',
  info: '#2563EB',
  infoTint: '#DBEAFE',
  gold: brand.gold,
  goldTint: brand.goldTint,
  star: brand.star,
  overlay: 'rgba(28,38,59,0.45)',
  tabBar: '#FFFFFF',
  tabActive: brand.maroon,
  tabInactive: '#9CA3AF',
  tabActivePill: brand.pinkTint,
  tagFeatured: '#1C263B',
  tagStudent: '#9B59B6',
  tagOffer: '#FF6B35',
  tagInsurance: '#16A34A',
  tagOpen: '#22C55E',
  tagClosed: '#EF4444',
  tagHome: '#0891B2',
  tagOnsite: '#7C3AED',
};

export const workspacePalette: Palette = {
  canvas: brand.cream,
  surface: brand.surface,
  surfaceAlt: brand.sand,
  tint: brand.maroonTint,
  tintStrong: brand.sandDeep,
  primary: brand.maroon,
  primaryDark: brand.maroonDark,
  primaryDeep: brand.maroonDeep,
  primaryLight: brand.maroonLight,
  onPrimary: brand.cream,
  ink: '#231A18',
  inkStrong: '#151010',
  muted: '#6F625D',
  faint: '#A89C96',
  line: '#E7DBD1',
  lineStrong: '#D6C5B8',
  success: '#2F6B40',
  successTint: '#E3EFE5',
  warning: brand.gold,
  warningTint: brand.goldTint,
  danger: '#A3302F',
  dangerTint: '#F6E3E1',
  info: '#2F4F6B',
  infoTint: '#E3EAF0',
  gold: brand.gold,
  goldTint: brand.goldTint,
  star: '#B5651D',
  overlay: 'rgba(42,0,15,0.45)',
  tabBar: brand.surface,
  tabActive: brand.maroon,
  tabInactive: '#6F625D',
  tabActivePill: brand.maroonTint,
  tagFeatured: '#231A18',
  tagStudent: '#7B4B8E',
  tagOffer: '#B4552E',
  tagInsurance: '#2F6B40',
  tagOpen: '#2F6B40',
  tagClosed: '#A3302F',
  tagHome: '#2F4F6B',
  tagOnsite: '#5A0020',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** horizontal page gutter */
  gutter: 16,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  input: 14,
  md: 16,
  card: 20,
  media: 24,
  sheet: 28,
  pill: 999,
} as const;

export const shadows = {
  card: Platform.select({
    ios: { shadowColor: '#2A000F', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 2 },
    default: {},
  }) as object,
  elevated: Platform.select({
    ios: { shadowColor: '#2A000F', shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 6 },
    default: {},
  }) as object,
  fab: Platform.select({
    ios: { shadowColor: '#2A000F', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 8 },
    default: {},
  }) as object,
} as const;

/** Font family names registered by the expo-font config plugin (file basenames = PostScript names). */
export const fonts = {
  arabic: {
    regular: 'IBMPlexSansArabic-Regular',
    medium: 'IBMPlexSansArabic-Medium',
    semibold: 'IBMPlexSansArabic-SemiBold',
    bold: 'IBMPlexSansArabic-Bold',
  },
  latin: {
    regular: 'Outfit-Regular',
    medium: 'Outfit-Medium',
    semibold: 'Outfit-SemiBold',
    bold: 'Outfit-Bold',
  },
  display: {
    semibold: 'PlayfairDisplay-SemiBold',
    bold: 'PlayfairDisplay-Bold',
  },
} as const;

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'overline'
  | 'button'
  | 'numeric'
  | 'numericLg';

export const typeScale: Record<TextVariant, { size: number; lineHeight: number; weight: FontWeight; latinDisplay?: boolean }> = {
  display: { size: 34, lineHeight: 42, weight: 'bold', latinDisplay: true },
  h1: { size: 28, lineHeight: 36, weight: 'bold' },
  h2: { size: 22, lineHeight: 30, weight: 'bold' },
  h3: { size: 18, lineHeight: 26, weight: 'semibold' },
  title: { size: 16, lineHeight: 23, weight: 'semibold' },
  body: { size: 15, lineHeight: 23, weight: 'regular' },
  bodySm: { size: 13, lineHeight: 19, weight: 'regular' },
  caption: { size: 12, lineHeight: 17, weight: 'medium' },
  overline: { size: 11, lineHeight: 15, weight: 'semibold' },
  button: { size: 15, lineHeight: 20, weight: 'semibold' },
  numeric: { size: 16, lineHeight: 22, weight: 'semibold' },
  numericLg: { size: 32, lineHeight: 38, weight: 'bold' },
};

export const motion = {
  /** cubic-bezier(.22,1,.36,1) from the reference */
  easing: [0.22, 1, 0.36, 1] as const,
  fast: 160,
  base: 240,
  slow: 420,
} as const;

export const layout = {
  tabBarHeight: 64,
  headerHeight: 56,
  maxContentWidth: 560,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export type ThemeName = 'customer' | 'workspace';

export interface Theme {
  name: ThemeName;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  fonts: typeof fonts;
  typeScale: typeof typeScale;
  motion: typeof motion;
  layout: typeof layout;
}

export const themes: Record<ThemeName, Theme> = {
  customer: { name: 'customer', colors: customerPalette, spacing, radii, shadows, fonts, typeScale, motion, layout },
  workspace: { name: 'workspace', colors: workspacePalette, spacing, radii, shadows, fonts, typeScale, motion, layout },
};

/** Doha fallback when location permission is denied */
export const DOHA_CENTER = { lat: 25.2854, lng: 51.531 } as const;
