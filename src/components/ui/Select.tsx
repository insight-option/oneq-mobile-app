import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { BottomSheet, type BottomSheetRef } from './BottomSheet';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  description?: string;
}

export interface SelectProps<T extends string> {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  label?: string;
  placeholder?: string;
  title?: string;
  error?: string | null;
  compact?: boolean;
}

/** Dropdown-looking field that opens a bottom sheet with options. */
export function Select<T extends string>({ value, options, onChange, label, placeholder, title, error, compact }: SelectProps<T>) {
  const { colors, radii, spacing } = useTheme();
  const ref = useRef<BottomSheetRef>(null);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="bodySm" weight="semibold">
          {label}
        </Text>
      ) : null}
      <Pressable onPress={() => ref.current?.open()} style={[styles.field, { borderColor: error ? colors.danger : colors.line, backgroundColor: colors.surface, borderRadius: radii.input, height: compact ? 44 : 52, paddingHorizontal: spacing.md }]}>
        {current?.icon ? <Icon name={current.icon} size={18} color={colors.primary} /> : null}
        <Text variant="bodySm" color={current ? colors.ink : colors.faint} style={{ flex: 1 }} lines={1}>
          {current?.label ?? placeholder ?? ''}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.faint} rtlAware={false} />
      </Pressable>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <BottomSheet ref={ref} title={title ?? label} height={options.length > 8 ? 0.7 : 'auto'}>
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  ref.current?.close();
                }}
                style={[styles.option, { backgroundColor: selected ? colors.tint : 'transparent', borderRadius: radii.sm }]}>
                {o.icon ? <Icon name={o.icon} size={20} color={selected ? colors.primary : colors.muted} /> : null}
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight={selected ? 'semibold' : 'regular'} color={selected ? colors.primary : colors.ink}>
                    {o.label}
                  </Text>
                  {o.description ? (
                    <Text variant="caption" muted>
                      {o.description}
                    </Text>
                  ) : null}
                </View>
                {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10 },
});
