import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'soft' | 'danger' | 'glass' | 'cream';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  haptics?: boolean;
  testID?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 56 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = React.memo(function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, leftIcon, rightIcon, fullWidth, style, haptics = true, testID }: ButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' };
      case 'secondary':
        return { bg: colors.ink, fg: '#FFFFFF', border: 'transparent' };
      case 'outline':
        return { bg: 'transparent', fg: colors.primary, border: colors.primary };
      case 'ghost':
        return { bg: 'transparent', fg: colors.primary, border: 'transparent' };
      case 'soft':
        return { bg: colors.tint, fg: colors.primary, border: 'transparent' };
      case 'danger':
        return { bg: colors.dangerTint, fg: colors.danger, border: 'transparent' };
      case 'glass':
        return { bg: 'rgba(255,255,255,0.14)', fg: '#FFFFFF', border: 'rgba(255,255,255,0.28)' };
      case 'cream':
        return { bg: '#F7F0EA', fg: colors.primary, border: 'transparent' };
      default:
        return { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' };
    }
  })();

  const isDisabled = disabled || loading;
  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (haptics) haptic.light();
    onPress?.();
  }, [isDisabled, haptics, onPress]);

  const fontVariant = size === 'sm' ? 'bodySm' : 'button';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 300 });
      }}
      disabled={isDisabled}
      style={[
        styles.base,
        animated,
        {
          height: HEIGHTS[size],
          borderRadius: radii.pill,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' || variant === 'glass' ? 1.2 : 0,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.inner}>
          {leftIcon ? <Icon name={leftIcon} size={iconSize} color={palette.fg} /> : null}
          <Text variant={fontVariant} weight="semibold" color={palette.fg} align="center" lines={1}>
            {label}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={iconSize} color={palette.fg} /> : null}
        </View>
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
