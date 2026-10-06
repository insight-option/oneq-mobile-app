import React, { forwardRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Icon, Text, type BottomSheetRef } from '@/components/ui';
import { useI18n } from '@/i18n';
import { AREA_KEYS } from '@/i18n/areas';
import { haptic } from '@/lib/haptics';
import { resolveUserLocation, useLocationStore } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * "My location" picker opened from the home header: GPS or one of the Doha areas. The choice feeds the nearest-first
 * sections and the map (src/lib/location.ts keeps a manual area until the user switches back to GPS).
 */
export const LocationSheet = forwardRef<BottomSheetRef, { onClose?: () => void }>(function LocationSheet({ onClose }, ref) {
  const { t, areaName } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const manualArea = useLocationStore((s) => s.manualArea);
  const status = useLocationStore((s) => s.status);
  const setManualArea = useLocationStore((s) => s.setManualArea);
  const [locating, setLocating] = useState(false);
  const close = () => (ref && typeof ref !== 'function' ? ref.current?.close() : undefined);

  const useMine = async () => {
    haptic.selection();
    setLocating(true);
    try {
      setManualArea(null);
      await resolveUserLocation({ force: true });
    } finally {
      setLocating(false);
      close();
    }
  };

  const gpsActive = !manualArea && (status === 'granted' || status === 'requesting');
  return (
    <BottomSheet ref={ref} title={t('home.location.title')} height={0.72} onClose={onClose}>
      <View style={{ gap: spacing.md }}>
        <Pressable onPress={useMine} style={[styles.row, { backgroundColor: gpsActive ? colors.tint : colors.surfaceAlt, borderRadius: radii.card }]}>
          <View style={[styles.bubble, { backgroundColor: colors.primary }]}>
            <Icon name={locating ? 'loader-circle' : 'locate-fixed'} size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" weight="semibold">
              {t('home.location.useMine')}
            </Text>
            <Text variant="caption" muted>
              {t('home.location.hint')}
            </Text>
          </View>
          {gpsActive ? <Icon name="check" size={18} color={colors.primary} /> : null}
        </Pressable>
        <Text variant="caption" weight="semibold" muted>
          {t('home.location.pick')}
        </Text>
        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
          <View style={styles.wrap}>
            {AREA_KEYS.map((key) => {
              const active = manualArea === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    haptic.selection();
                    setManualArea(key);
                    close();
                  }}
                  style={[styles.chip, { borderRadius: radii.pill, backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.line }]}>
                  <Text variant="caption" weight="semibold" color={active ? colors.onPrimary : colors.ink}>
                    {areaName(key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  bubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
