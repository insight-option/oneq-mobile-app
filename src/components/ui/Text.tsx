import React from 'react';
import { Text as RNText, StyleSheet, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { isRTL } from '@/lib/rtl';
import { useTheme } from '@/theme/ThemeProvider';
import type { FontWeight, Palette, TextVariant } from '@/theme/tokens';
import { textStyle } from '@/theme/typography';
import { useLocaleStore } from '@/store/locale';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** palette key or raw color */
  color?: keyof Palette | (string & {});
  weight?: FontWeight;
  /** force Latin (Outfit) font — for numbers */
  numeric?: boolean;
  align?: 'start' | 'center' | 'end';
  muted?: boolean;
  lines?: number;
  style?: StyleProp<TextStyle>;
}

const alignMap = (align: 'start' | 'center' | 'end' | undefined): TextStyle['textAlign'] => {
  if (!align || align === 'start') return isRTL ? 'right' : 'left';
  if (align === 'end') return isRTL ? 'left' : 'right';
  return 'center';
};

export const Text = React.memo(function Text({ variant = 'body', color, weight, numeric, align, muted, lines, style, children, ...rest }: TextProps) {
  const { colors } = useTheme();
  const lang = useLocaleStore((s) => s.lang);
  const resolvedColor = muted ? colors.muted : color ? ((colors as unknown as Record<string, string>)[color] ?? color) : colors.ink;
  return (
    <RNText
      {...rest}
      numberOfLines={lines}
      allowFontScaling={false}
      style={[textStyle(variant, lang, { weight, numeric }), styles.base, { color: resolvedColor, textAlign: alignMap(align) }, style]}>
      {children}
    </RNText>
  );
});

const styles = StyleSheet.create({
  base: { writingDirection: isRTL ? 'rtl' : 'ltr' },
});
