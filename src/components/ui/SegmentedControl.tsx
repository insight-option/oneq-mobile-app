import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  /** 'pill' = sand track with a maroon pill (link-2); 'underline' = text tabs with underline */
  variant?: 'pill' | 'underline';
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({ options, value, onChange, style, variant = 'pill', size = 'md' }: SegmentedControlProps<T>) {
  const { colors, radii } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = options.length ? (width - 8) / options.length : 0;
  // `start` is a logical edge (right in RTL); the layout transition animates the move between segments.
  const pillStyle = { start: 4 + index * segW };
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const h = size === 'sm' ? 36 : 44;

  if (variant === 'underline') {
    return (
      <View style={[styles.underlineRow, { borderBottomColor: colors.line }, style]}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={styles.underlineItem}>
              <Text variant="title" weight={active ? 'bold' : 'medium'} color={active ? colors.primary : colors.muted}>
                {o.label}
              </Text>
              <View style={[styles.underline, { backgroundColor: active ? colors.primary : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={[styles.track, { backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, height: h }, style]}>
      {width > 0 ? <Animated.View layout={LinearTransition.duration(220)} style={[styles.pill, { width: segW, backgroundColor: colors.primary, borderRadius: radii.pill, height: h - 8 }, pillStyle]} /> : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (o.value !== value) {
                haptic.selection();
                onChange(o.value);
              }
            }}
            style={styles.segment}>
            <Text variant={size === 'sm' ? 'caption' : 'bodySm'} weight="semibold" color={active ? colors.onPrimary : colors.muted} lines={1}>
              {o.label}
              {typeof o.count === 'number' ? ` ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', padding: 4, position: 'relative' },
  pill: { position: 'absolute', top: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  underlineRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  underlineItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 8 },
  underline: { height: 3, width: 40, borderRadius: 2 },
});
