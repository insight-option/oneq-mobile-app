import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/lib/haptics';
import { Icon } from './icons';
import { Text } from './Text';

/** Dots row like the link-1 booking header: active step is an elongated pill. */
export const StepDots = ({ count, index, light = true, style }: { count: number; index: number; light?: boolean; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  const active = light ? '#FFFFFF' : colors.primary;
  const inactive = light ? 'rgba(255,255,255,0.35)' : colors.lineStrong;
  return (
    <View style={[styles.dots, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: i === index ? 36 : 8, height: 8, borderRadius: 4, backgroundColor: i <= index ? active : inactive, opacity: i < index ? 0.75 : 1 }} />
      ))}
    </View>
  );
};

/** Numeric stepper (- 3 +) for quantities such as points or stock. */
export const NumberStepper = ({ value, onChange, min = 0, max = 100000, step = 1, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) => {
  const { colors, radii } = useTheme();
  const btn = (icon: 'minus' | 'plus', delta: number, disabled: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onChange(Math.min(max, Math.max(min, value + delta)));
      }}
      style={[styles.stepBtn, { backgroundColor: colors.tint, borderRadius: radii.sm, opacity: disabled ? 0.4 : 1 }]}>
      <Icon name={icon} size={18} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { direction: 'ltr' }]}>
      {btn('minus', -step, value - step < min)}
      <View style={styles.stepValue}>
        <Text variant="h3" numeric>
          {value}
        </Text>
        {suffix ? (
          <Text variant="caption" muted>
            {suffix}
          </Text>
        ) : null}
      </View>
      {btn('plus', step, value + step > max)}
    </View>
  );
};

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 72, alignItems: 'center' },
});
