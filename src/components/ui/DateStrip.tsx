import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '@/theme/ThemeProvider';
import type { TimeSlot, Weekday } from '@/domain/types';
import { formatTime, monthName, weekdayName } from '@/i18n/format';
import { useLocaleStore } from '@/store/locale';
import { haptic } from '@/lib/haptics';
import { Text } from './Text';

export interface DateStripProps {
  value: string | null;
  onChange: (date: string) => void;
  days?: number;
  startOffset?: number;
  isDisabled?: (date: string, weekday: Weekday) => boolean;
}

/** Horizontal strip of upcoming days (day name, number, month). */
export const DateStrip = ({ value, onChange, days = 14, startOffset = 0, isDisabled }: DateStripProps) => {
  const { colors, radii, shadows } = useTheme();
  const lang = useLocaleStore((s) => s.lang);
  const items = useMemo(() => Array.from({ length: days }).map((_, i) => dayjs().add(startOffset + i, 'day')), [days, startOffset]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {items.map((d) => {
        const key = d.format('YYYY-MM-DD');
        const wd = d.day() as Weekday;
        const disabled = isDisabled?.(key, wd) ?? false;
        const selected = key === value;
        return (
          <Pressable
            key={key}
            disabled={disabled}
            onPress={() => {
              haptic.selection();
              onChange(key);
            }}
            style={[
              styles.day,
              { backgroundColor: selected ? colors.primary : colors.surface, borderRadius: radii.md, borderColor: selected ? colors.primary : colors.line, opacity: disabled ? 0.4 : 1 },
              !selected ? shadows.card : null,
            ]}>
            <Text variant="caption" color={selected ? 'rgba(255,255,255,0.8)' : colors.muted}>
              {weekdayName(wd, lang, true)}
            </Text>
            <Text variant="h2" numeric color={selected ? '#FFFFFF' : colors.ink}>
              {d.date()}
            </Text>
            <Text variant="caption" color={selected ? 'rgba(255,255,255,0.8)' : colors.muted}>
              {monthName(d.month(), lang)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export const TimeSlotGrid = ({ slots, value, onChange }: { slots: TimeSlot[]; value: string | null; onChange: (t: string) => void }) => {
  const { colors, radii } = useTheme();
  const lang = useLocaleStore((s) => s.lang);
  return (
    <View style={styles.grid}>
      {slots.map((s) => {
        const selected = s.time === value;
        return (
          <Pressable
            key={s.time}
            disabled={!s.available}
            onPress={() => {
              haptic.selection();
              onChange(s.time);
            }}
            style={[styles.slot, { backgroundColor: selected ? colors.primary : s.available ? colors.surface : colors.surfaceAlt, borderColor: selected ? colors.primary : colors.line, borderRadius: radii.sm, opacity: s.available ? 1 : 0.45 }]}>
            <Text variant="bodySm" numeric weight="semibold" color={selected ? '#FFFFFF' : colors.ink}>
              {formatTime(s.time, lang)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: { gap: 10, paddingHorizontal: 16, paddingVertical: 6 },
  day: { width: 68, height: 88, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '30.5%', height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
