import type { TextStyle } from 'react-native';
import type { Lang } from '@/domain/types';
import { fonts, typeScale, type FontWeight, type TextVariant } from './tokens';

/** Resolve the font family for a language/weight. Numbers and Latin text use Outfit; Arabic uses IBM Plex Sans Arabic. */
export const resolveFont = (lang: Lang, weight: FontWeight = 'regular', opts?: { numeric?: boolean; display?: boolean }): string => {
  if (opts?.display && lang === 'en') return weight === 'bold' ? fonts.display.bold : fonts.display.semibold;
  if (opts?.numeric || lang === 'en') return fonts.latin[weight];
  return fonts.arabic[weight];
};

export const textStyle = (variant: TextVariant, lang: Lang, overrides?: { weight?: FontWeight; numeric?: boolean }): TextStyle => {
  const scale = typeScale[variant];
  const weight = overrides?.weight ?? scale.weight;
  const numeric = overrides?.numeric ?? (variant === 'numeric' || variant === 'numericLg');
  return {
    fontFamily: resolveFont(lang, weight, { numeric, display: Boolean(scale.latinDisplay) }),
    fontSize: scale.size,
    lineHeight: scale.lineHeight,
    ...(variant === 'overline' && lang === 'en' ? { letterSpacing: 0.8, textTransform: 'uppercase' as const } : {}),
  };
};
