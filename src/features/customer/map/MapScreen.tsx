import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile, type Region } from 'react-native-maps';
import { FlashList } from '@shopify/flash-list';
import { Avatar, Button, Chip, EmptyState, Icon, IconButton, SkeletonList, Text } from '@/components/ui';
import { CompanyListRow } from '@/components/shared';
import { useCategories, useCompanies, useCompany } from '@/data/hooks';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { regionForPoints } from '@/lib/geo';
import { useUserLocation } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, DOHA_CENTER } from '@/theme/tokens';
import { useCompanyActions } from '../catalog/useCatalogHelpers';

const hasGoogleKey = Boolean((Constants.expoConfig?.extra as { hasGoogleMapsKey?: boolean } | undefined)?.hasGoogleMapsKey);
const SHEET_COLLAPSED = 230;

export const MapScreen = () => {
  const { categoryId: catParam, focus } = useLocalSearchParams<{ categoryId?: string; focus?: string }>();
  const insets = useSafeAreaInsets();
  const { t, localized } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const { point, status, isFallback, refresh } = useUserLocation(true);
  const [categoryId, setCategoryId] = useState<string | null>(catParam ?? null);
  const [selected, setSelected] = useState<string | null>(focus ?? null);
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<MapView>(null);
  const categories = useCategories();
  const focused = useCompany(focus);
  const companies = useCompanies({ categoryId: categoryId ?? undefined, near: point, sort: 'nearest', radiusKm: 40, limit: 40 });
  const actions = useCompanyActions();
  const list = useMemo(() => companies.data ?? [], [companies.data]);

  const initialRegion = useMemo<Region>(() => {
    const center = focused.data?.location ?? point ?? DOHA_CENTER;
    return { latitude: center.lat, longitude: center.lng, latitudeDelta: focused.data ? 0.02 : 0.12, longitudeDelta: focused.data ? 0.02 : 0.12 };
  }, [focused.data, point]);

  useEffect(() => {
    if (focused.data) {
      mapRef.current?.animateToRegion({ latitude: focused.data.location.lat, longitude: focused.data.location.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    }
  }, [focused.data]);

  const fitAll = useCallback(() => {
    if (!list.length) return;
    const r = regionForPoints([...list.slice(0, 15).map((c) => c.location), ...(point ? [point] : [])]);
    mapRef.current?.animateToRegion(r, 500);
  }, [list, point]);

  const selectCompany = useCallback((c: Company) => {
    setSelected(c.id);
    mapRef.current?.animateToRegion({ latitude: c.location.lat, longitude: c.location.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
  }, []);

  const sheetHeight = expanded ? '70%' : SHEET_COLLAPSED;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType={Platform.OS === 'android' && !hasGoogleKey ? 'none' : 'standard'}
        initialRegion={initialRegion}
        showsUserLocation={status === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => setSelected(null)}
        mapPadding={{ top: insets.top + 110, right: 0, bottom: SHEET_COLLAPSED, left: 0 }}>
        {Platform.OS === 'android' && !hasGoogleKey ? <UrlTile urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png" maximumZ={19} zIndex={-1} /> : null}
        {list.map((c) => {
          const isSel = c.id === selected;
          return (
            <Marker key={c.id} coordinate={{ latitude: c.location.lat, longitude: c.location.lng }} onPress={() => selectCompany(c)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false} zIndex={isSel ? 10 : 1}>
              <View style={styles.markerWrap}>
                <View style={[styles.marker, { backgroundColor: isSel ? colors.gold : brand.maroon, borderColor: '#FFFFFF', width: isSel ? 44 : 36, height: isSel ? 44 : 36, borderRadius: isSel ? 22 : 18 }]}>
                  <Avatar uri={c.logoUrl} name={localized(c.name)} size={isSel ? 34 : 26} />
                </View>
                <View style={[styles.markerTip, { borderTopColor: isSel ? colors.gold : brand.maroon }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top overlay: title + category chips */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={[styles.titleRow, { paddingHorizontal: spacing.gutter }]}>
          <View style={[styles.titleCard, { backgroundColor: colors.surface, borderRadius: radii.pill }, shadows.card]}>
            <Icon name="map-pin" size={18} color={colors.primary} />
            <Text variant="title" weight="bold">
              {t('map.title')}
            </Text>
            <Text variant="caption" muted>
              · {t('map.results', { count: list.length })}
            </Text>
          </View>
          <IconButton name="locate-fixed" variant="surface" onPress={() => refresh(true).then(() => fitAll())} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: 8, paddingVertical: 10 }}>
          <Chip label={t('common.all')} selected={!categoryId} onPress={() => setCategoryId(null)} variant="outline" />
          {(categories.data ?? []).map((c) => (
            <Chip key={c.id} label={localized(c.name)} icon={c.icon as 'house'} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} variant="outline" />
          ))}
        </ScrollView>
        {status === 'denied' ? (
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <View style={[styles.banner, { backgroundColor: colors.goldTint, borderRadius: radii.md }]}>
              <Icon name="locate" size={18} color={colors.gold} />
              <Text variant="caption" weight="semibold" color={colors.gold} style={{ flex: 1 }}>
                {t('map.enableLocationBody')}
              </Text>
              <Button label={t('map.enable')} size="sm" onPress={() => refresh(true)} />
            </View>
          </View>
        ) : null}
      </View>

      {/* Bottom sheet list */}
      <View style={[styles.sheet, { height: sheetHeight as number, backgroundColor: colors.surface, borderTopStartRadius: radii.sheet, borderTopEndRadius: radii.sheet, paddingBottom: insets.bottom }, shadows.elevated]}>
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.lineStrong }]} />
          <View style={styles.sheetHeader}>
            <Text variant="h3">{t('map.listTitle')}</Text>
            <Text variant="caption" muted>
              {isFallback ? t('map.fallbackNotice') : t('map.results', { count: list.length })}
            </Text>
          </View>
        </Pressable>
        <FlashList<Company>
          data={list}
          keyExtractor={(c) => c.id}
          extraData={selected}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }}>
              <CompanyListRow company={item} subcategoryLabel={actions.subcategoryLabel(item)} selected={item.id === selected} onPress={(c) => (selected === c.id ? actions.openCompany(c) : selectCompany(c))} />
            </View>
          )}
          ListEmptyComponent={companies.isLoading ? <SkeletonList rows={3} /> : <EmptyState compact icon="map" title={t('map.noResults')} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, start: 0, end: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  markerWrap: { alignItems: 'center' },
  marker: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  markerTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  sheet: { position: 'absolute', start: 0, end: 0, bottom: 0 },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, gap: 8 },
  handle: { width: 44, height: 5, borderRadius: 3 },
  sheetHeader: { width: '100%', paddingHorizontal: 16, gap: 2 },
});
