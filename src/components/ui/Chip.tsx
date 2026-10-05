import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
  size?: 'sm' | 'md';
  /** 'tint' = pink/sand tinted (link-1 sort chips); 'outline' = white with border (link-2 filter chips) */
  variant?: 'tint' | 'outline';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const Chip = React.memo(function Chip({ label, selected, onPress, icon, count, size = 'md', variant = 'tint', style, disabled }: ChipProps) {
  const { colors, radii } = useTheme();
  const bg = selected ? colors.primary : variant === 'tint' ? colors.tint : colors.surface;
  const fg = selected ? colors.onPrimary : variant === 'tint' ? colors.primary : colors.ink;
  const border = variant === 'outline' && !selected ? colors.line : 'transparent';
  return (
    <Pressable
      disabled={disabled || !onPress}
      onPress={() => {
        haptic.selection();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border, borderRadius: radii.pill, height: size === 'sm' ? 32 : 40, paddingHorizontal: size === 'sm' ? 12 : 16, opacity: pressed ? 0.8 : disabled ? 0.5 : 1 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} color={fg} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'bodySm'} weight="semibold" color={fg} lines={1}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <View style={[styles.count, { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : colors.surface }]}>
          <Text variant="caption" numeric weight="semibold" color={fg}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  count: { paddingHorizontal: 6, height: 20, minWidth: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
