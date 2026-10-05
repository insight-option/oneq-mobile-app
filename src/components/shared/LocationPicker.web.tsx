import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Text } from '@/components/ui';
import type { GeoPoint } from '@/domain/types';
import { useI18n } from '@/i18n';
import { resolveUserLocation } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';
import type { LocationPickerProps } from './LocationPicker';

export type { LocationPickerProps };

/** OpenStreetMap embed centred on the pin (no API key needed). */
const embedUrl = (p: GeoPoint, delta = 0.012): string => {
  const bbox = [p.lng - delta, p.lat - delta, p.lng + delta, p.lat + delta].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
};

const parseCoord = (raw: string, min: number, max: number): number | null => {
  const n = Number(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/**
 * Web build of the native map picker: the browser cannot host react-native-maps, so the pin is set from the browser
 * location or typed coordinates and previewed on an OpenStreetMap embed.
 */
export const LocationPicker = ({ value, onChange, height = 260, useMineLabel, style }: LocationPickerProps & { style?: StyleProp<ViewStyle> }) => {
  const { colors, radii, spacing } = useTheme();
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);
  const [latText, setLatText] = useState(value.lat.toFixed(5));
  const [lngText, setLngText] = useState(value.lng.toFixed(5));

  const commit = (lat: string, lng: string) => {
    const la = parseCoord(lat, -90, 90);
    const ln = parseCoord(lng, -180, 180);
    if (la != null && ln != null) onChange({ lat: la, lng: ln });
  };
  const useMine = async () => {
    setLocating(true);
    try {
      const p = await resolveUserLocation({ force: true });
      setLatText(p.lat.toFixed(5));
      setLngText(p.lng.toFixed(5));
      onChange(p);
    } finally {
      setLocating(false);
    }
  };

  const inputStyle = { color: colors.ink, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface, paddingHorizontal: spacing.md };
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      <View style={{ height, borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
        <iframe title="map" src={embedUrl(value)} style={{ border: 0, width: '100%', height: '100%' }} loading="lazy" />
        {useMineLabel ? (
          <View style={styles.cta}>
            <Button label={useMineLabel} size="sm" variant="cream" leftIcon="locate-fixed" loading={locating} onPress={useMine} />
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text variant="caption" muted>
            {t('common.latitude')}
          </Text>
          <TextInput value={latText} onChangeText={setLatText} onBlur={() => commit(latText, lngText)} keyboardType="decimal-pad" style={[styles.input, inputStyle]} />
        </View>
        <View style={styles.field}>
          <Text variant="caption" muted>
            {t('common.longitude')}
          </Text>
          <TextInput value={lngText} onChangeText={setLngText} onBlur={() => commit(latText, lngText)} keyboardType="decimal-pad" style={[styles.input, inputStyle]} />
        </View>
      </View>
      <Text variant="caption" muted>
        {t('common.mapWebHint')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cta: { position: 'absolute', bottom: 12, start: 12 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 4 },
  input: { height: 44, borderWidth: 1, fontSize: 15, textAlign: 'left', writingDirection: 'ltr' },
});
