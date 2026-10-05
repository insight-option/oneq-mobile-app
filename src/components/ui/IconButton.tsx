import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';

export interface IconButtonProps {
  name: IconName;
  onPress?: () => void;
  /** glass = translucent on maroon; soft = tinted; ghost = transparent; solid = maroon; surface = white card */
  variant?: 'glass' | 'soft' | 'ghost' | 'solid' | 'surface';
  size?: number;
  iconSize?: number;
  color?: string;
  badge?: boolean | number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export const IconButton = React.memo(function IconButton({ name, onPress, variant = 'soft', size = 42, iconSize = 20, color, badge, style, accessibilityLabel, disabled }: IconButtonProps) {
  const { colors, shadows } = useTheme();
  const bg =
    variant === 'glass' ? 'rgba(255,255,255,0.16)' : variant === 'soft' ? colors.tint : variant === 'solid' ? colors.primary : variant === 'surface' ? colors.surface : 'transparent';
  const fg = color ?? (variant === 'glass' || variant === 'solid' ? '#FFFFFF' : colors.primary);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic.selection();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity: pressed ? 0.75 : disabled ? 0.5 : 1 },
        variant === 'glass' ? styles.glassBorder : null,
        variant === 'surface' ? shadows.card : null,
        style,
      ]}>
      <Icon name={name} size={iconSize} color={fg} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: variant === 'glass' ? colors.primary : colors.surface }]} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  glassBorder: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  badge: { position: 'absolute', top: 7, end: 8, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
