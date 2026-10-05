import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './icons';
import { Text } from './Text';

export interface SwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Switch = React.memo(function Switch({ value, onValueChange, disabled, size = 'md' }: SwitchProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, progress]);
  const W = size === 'sm' ? 40 : 50;
  const H = size === 'sm' ? 24 : 30;
  const K = H - 6;
  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], [colors.lineStrong, colors.primary]) }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * (W - K - 6) }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onValueChange(!value);
      }}
      style={{ opacity: disabled ? 0.5 : 1, direction: 'ltr' }}>
      <Animated.View style={[{ width: W, height: H, borderRadius: H / 2, padding: 3, justifyContent: 'center' }, trackStyle]}>
        <Animated.View style={[{ width: K, height: K, borderRadius: K / 2, backgroundColor: '#FFFFFF' }, styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
});

export interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Checkbox = ({ checked, onChange, label, disabled }: CheckboxProps) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onChange(!checked);
      }}
      style={styles.checkRow}>
      <View style={[styles.checkBox, { borderColor: checked ? colors.primary : colors.lineStrong, backgroundColor: checked ? colors.primary : colors.surface }]}>
        {checked ? <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      {label ? <Text variant="bodySm">{label}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  knob: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
