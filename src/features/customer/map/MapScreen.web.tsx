import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Button, Chip, EmptyState, Icon, IconButton, SkeletonList, Text } from '@/components/ui';
import { CompanyListRow } from '@/components/shared';
import { useCategories, useCompanies, useCompany } from '@/data/hooks';
import type { Company, GeoPoint } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useUserLocation } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';
import { DOHA_CENTER } from '@/theme/tokens';
import { useCompanyActions } from '../catalog/useCatalogHelpers';

/** OpenStreetMap embed (no API key); `marker` pins the selected company. */
const embedUrl = (center: GeoPoint, delta: number, marker: GeoPoint | null): string => {
  const bbox = [center.lng - delta, center.lat - delta, center.lng + delta, center.lat + delta].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker ? `&marker=${marker.lat.toFixed(5)},${marker.lng.toFixed(5)}` : ''}`;
};

/**
 * Web build of the map tab: react-native-maps has no browser implementation, so the nearest-first list is the primary
 * UI and the selected company is previewed on an OpenStreetMap embed with a link to open it in Google Maps.
 */
export const MapScreen = () => {
  const { categoryId: catParam, focus } = useLocalSearchParams<{ categoryId?: string; focus?: string }>();
  const insets = useSafeAreaInsets();
  const { t, localized } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const { point, status, isFallback, refresh } = useUserLocation(true);
  const [categoryId, setCategoryId] = useState<string | null>(catParam ?? null);
  const [selected, setSelected] = useState<string | null>(focus ?? null);
  const categories = useCategories();
  const focused = useCompany(focus);
  const companies = useCompanies({ categoryId: categoryId ?? undefined, near: point, sort: 'nearest', radiusKm: 40, limit: 40 });
  const actions = useCompanyActions();
  const list = useMemo(() => companies.data ?? [], [companies.data]);
  const current = useMemo(() => list.find((c) => c.id === selected) ?? (focused.data && focused.data.id === selected ? focused.data : null) ?? list[0] ?? null, [list, selected, focused.data]);
  const center = current?.location ?? point ?? DOHA_CENTER;
  const mapSrc = embedUrl(center, current ? 0.012 : 0.08, current?.location ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + 8 }}>
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
        <IconButton name="locate-fixed" variant="surface" onPress={() => refresh(true)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: 8, paddingVertical: 10 }}>
        <Chip label={t('common.all')} selected={!categoryId} onPress={() => setCategoryId(null)} variant="outline" />
        {(categories.data ?? []).map((c) => (
          <Chip key={c.id} label={localized(c.name)} icon={c.icon as 'house'} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} variant="outline" />
        ))}
      </ScrollView>
      {status === 'denied' ? (
        <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }}>
          <View style={[styles.banner, { backgroundColor: colors.goldTint, borderRadius: radii.md }]}>
            <Icon name="locate" size={18} color={colors.gold} />
            <Text variant="caption" weight="semibold" color={colors.gold} style={{ flex: 1 }}>
              {t('map.enableLocationBody')}
            </Text>
            <Button label={t('map.enable')} size="sm" onPress={() => refresh(true)} />
          </View>
        </View>
      ) : null}

      <View style={[styles.map, { marginHorizontal: spacing.gutter, borderRadius: radii.card, backgroundColor: colors.surfaceAlt }]}>
        <iframe title="map" src={mapSrc} style={{ border: 0, width: '100%', height: '100%' }} loading="lazy" />
        {current ? (
          <View style={styles.openBtn}>
            <Button label={t('map.openInMaps')} size="sm" variant="cream" leftIcon="map-pin" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${current.location.lat},${current.location.lng}`)} />
          </View>
        ) : null}
      </View>

      <View style={[styles.sheetHeader, { paddingHorizontal: spacing.gutter }]}>
        <Text variant="h3">{t('map.listTitle')}</Text>
        <Text variant="caption" muted>
          {isFallback ? t('map.fallbackNotice') : t('map.results', { count: list.length })}
        </Text>
      </View>
      <FlashList<Company>
        data={list}
        keyExtractor={(c) => c.id}
        extraData={selected}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }}>
            <CompanyListRow company={item} subcategoryLabel={actions.subcategoryLabel(item)} selected={item.id === (current?.id ?? null)} onPress={(c) => (current?.id === c.id ? actions.openCompany(c) : setSelected(c.id))} />
          </View>
        )}
        ListEmptyComponent={companies.isLoading ? <SkeletonList rows={3} /> : <EmptyState compact icon="map" title={t('map.noResults')} />}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  map: { height: 240, overflow: 'hidden', marginBottom: 12 },
  openBtn: { position: 'absolute', bottom: 12, start: 12 },
  sheetHeader: { gap: 2, paddingBottom: 10 },
});
