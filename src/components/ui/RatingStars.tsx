import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

const STAR_PATH = 'M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3 6 20.6l1.3-6.6L2.4 9.4l6.7-.8z';

const Star = ({ fill, size, color, empty }: { fill: number; size: number; color: string; empty: string }) => {
  const id = `g${Math.round(fill * 100)}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <Stop offset={`${fill * 100}%`} stopColor={color} />
          <Stop offset={`${fill * 100}%`} stopColor={empty} />
        </LinearGradient>
      </Defs>
      <Path d={STAR_PATH} fill={`url(#${id})`} />
    </Svg>
  );
};

export interface RatingStarsProps {
  value: number;
  size?: number;
  color?: string;
  /** show the numeric value next to the stars */
  showValue?: boolean;
  count?: number;
  onChange?: (v: 1 | 2 | 3 | 4 | 5) => void;
  gap?: number;
}

export const RatingStars = React.memo(function RatingStars({ value, size = 14, color, showValue, count, onChange, gap = 2 }: RatingStarsProps) {
  const { colors } = useTheme();
  const c = color ?? colors.star;
  const empty = colors.line;
  return (
    <View style={[styles.row, { gap: 6, direction: 'ltr' }]}>
      <View style={[styles.row, { gap }]}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)));
          const star = <Star key={i} fill={onChange ? (i <= value ? 1 : 0) : fill} size={onChange ? Math.max(size, 32) : size} color={c} empty={empty} />;
          return onChange ? (
            <Pressable
              key={i}
              hitSlop={4}
              onPress={() => {
                haptic.selection();
                onChange(i as 1 | 2 | 3 | 4 | 5);
              }}>
              {star}
            </Pressable>
          ) : (
            star
          );
        })}
      </View>
      {showValue ? (
        <Text variant="bodySm" numeric weight="bold">
          {value.toFixed(1)}
        </Text>
      ) : null}
      {typeof count === 'number' ? (
        <Text variant="caption" numeric muted>
          ({count})
        </Text>
      ) : null}
    </View>
  );
});

/** Compact "★ 4.8 (320)" pill used on cards. */
export const RatingPill = React.memo(function RatingPill({ value, count, light }: { value: number; count?: number; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: light ? 'rgba(255,255,255,0.92)' : colors.warningTint, direction: 'ltr' }]}>
      <Star fill={1} size={13} color={colors.star} empty={colors.line} />
      <Text variant="caption" numeric weight="bold" color={colors.ink}>
        {value.toFixed(1)}
      </Text>
      {typeof count === 'number' ? (
        <Text variant="caption" numeric muted>
          ({count})
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 12 },
});
