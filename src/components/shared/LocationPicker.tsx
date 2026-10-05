import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { Button, Text } from '@/components/ui';
import type { GeoPoint } from '@/domain/types';
import { resolveUserLocation } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';

const hasGoogleKey = Boolean((Constants.expoConfig?.extra as { hasGoogleMapsKey?: boolean } | undefined)?.hasGoogleMapsKey);

export interface LocationPickerProps {
  value: GeoPoint;
  onChange: (p: GeoPoint) => void;
  height?: number;
  /** when set, shows a "use my location" button over the map */
  useMineLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Tap or drag to place a pin. Falls back to CARTO tiles on Android when no Google Maps key is configured. */
export const LocationPicker = ({ value, onChange, height = 260, useMineLabel, style }: LocationPickerProps) => {
  const { colors, radii } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);
  const useMine = async () => {
    setLocating(true);
    try {
      const p = await resolveUserLocation({ force: true });
      onChange(p);
      mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
    } finally {
      setLocating(false);
    }
  };
  return (
    <View style={[{ gap: 8 }, style]}>
      <View style={{ height, borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          mapType={Platform.OS === 'android' && !hasGoogleKey ? 'none' : 'standard'}
          initialRegion={{ latitude: value.lat, longitude: value.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          onPress={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
          toolbarEnabled={false}>
          {Platform.OS === 'android' && !hasGoogleKey ? <UrlTile urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png" maximumZ={19} zIndex={-1} /> : null}
          <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} draggable onDragEnd={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })} pinColor={colors.primary} />
        </MapView>
        {useMineLabel ? (
          <View style={styles.cta}>
            <Button label={useMineLabel} size="sm" variant="cream" leftIcon="locate-fixed" loading={locating} onPress={useMine} />
          </View>
        ) : null}
      </View>
      <Text variant="caption" numeric muted>
        {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({ cta: { position: 'absolute', bottom: 12, start: 12 } });
