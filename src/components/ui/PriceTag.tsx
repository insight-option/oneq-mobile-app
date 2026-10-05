import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney } from '@/i18n/format';
import { useLocaleStore } from '@/store/locale';
import { Text } from './Text';

export interface PriceTagProps {
  price: number;
  /** when present and lower than price, the old price is struck through */
  offerPrice?: number | null;
  /** label shown before the price, e.g. "يبدأ من" */
  prefix?: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  align?: 'start' | 'end';
  style?: StyleProp<ViewStyle>;
}

export const PriceTag = React.memo(function PriceTag({ price, offerPrice, prefix, suffix, size = 'md', color, align = 'start', style }: PriceTagProps) {
  const { colors } = useTheme();
  const lang = useLocaleStore((s) => s.lang);
  const hasOffer = typeof offerPrice === 'number' && offerPrice < price;
  const active = hasOffer ? (offerPrice as number) : price;
  const variant = size === 'lg' ? 'numericLg' : size === 'sm' ? 'bodySm' : 'numeric';
  return (
    <View style={[styles.wrap, { alignItems: align === 'end' ? 'flex-end' : 'flex-start' }, style]}>
      {prefix ? (
        <Text variant="caption" muted>
          {prefix}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Text variant={variant} numeric weight="bold" color={color ?? (hasOffer ? colors.primary : colors.ink)}>
          {formatMoney(active, lang)}
        </Text>
        {hasOffer ? (
          <Text variant="caption" numeric color={colors.faint} style={styles.strike}>
            {formatMoney(price, lang)}
          </Text>
        ) : null}
        {suffix ? (
          <Text variant="caption" muted>
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
});
