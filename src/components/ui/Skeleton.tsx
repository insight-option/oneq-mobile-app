import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton = ({ width = '100%', height = 16, radius, circle, style }: SkeletonProps) => {
  const { colors, radii } = useTheme();
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const size = circle ? height : undefined;
  return <Animated.View style={[{ width: circle ? size : width, height, borderRadius: circle ? height / 2 : (radius ?? radii.sm), backgroundColor: colors.surfaceAlt }, anim, style]} />;
};

/** Generic list placeholder: avatar + two lines, repeated. */
export const SkeletonList = ({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) => {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.lg, paddingHorizontal: spacing.gutter }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          {avatar ? <Skeleton circle height={44} /> : null}
          <View style={styles.lines}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
};

/** Card placeholder (image + text lines) for company cards. */
export const SkeletonCard = ({ height = 150 }: { height?: number }) => {
  const { spacing, radii } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Skeleton height={height} radius={radii.card} />
      <Skeleton width="60%" height={16} />
      <Skeleton width="40%" height={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lines: { flex: 1, gap: 8 },
});
