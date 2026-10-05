import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip, EmptyState, Header, IconButton, Screen, SkeletonCard, Text } from '@/components/ui';
import { AudienceTile, CategoryTile, CompanyCard } from '@/components/shared';
import { useCategory, useCompanies } from '@/data/hooks';
import type { Audience, Company, CompanySort } from '@/domain/types';
import { AREA_KEYS, useI18n } from '@/i18n';
import { useUserLocation } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';
import { SORT_OPTIONS, useCompanyActions } from './useCatalogHelpers';

export const CategoryScreen = () => {
  const { id, sub: subParam, audience: audienceParam } = useLocalSearchParams<{ id: string; sub?: string; audience?: string }>();
  const router = useRouter();
  const { t, localized, areaName } = useI18n();
  const { colors, spacing } = useTheme();
  const category = useCategory(id);
  const [sub, setSub] = useState<string | null>(subParam ?? null);
  const [sort, setSort] = useState<CompanySort | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience | null>((audienceParam as Audience) ?? null);
  const { point } = useUserLocation(sort === 'nearest');
  const needsAudience = Boolean(category.data?.requiresAudience) && !audience;
  const companies = useCompanies({ categoryId: id, subcategoryId: sub ?? undefined, sort: sort ?? undefined, area: area ?? undefined, audience: audience ?? undefined, near: sort === 'nearest' ? point : undefined }, { enabled: Boolean(id) && !needsAudience });
  const actions = useCompanyActions();
  const title = category.data ? localized(category.data.name) : '';
  const areas = useMemo(() => AREA_KEYS.filter((k) => (companies.data ?? []).some((c) => c.area === k) || k === area), [companies.data, area]);

  const header = (
    <View>
      {category.data?.requiresAudience ? (
        <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, gap: spacing.md }}>
          <Text variant="h3">{t('category.chooseAudience')}</Text>
          <View style={styles.audienceRow}>
            <AudienceTile label={t('category.men')} icon="mars" tone="men" selected={audience === 'men'} onPress={() => setAudience('men')} />
            <AudienceTile label={t('category.women')} icon="venus" tone="women" selected={audience === 'women'} onPress={() => setAudience('women')} />
          </View>
        </View>
      ) : null}
      {!needsAudience ? (
        <>
          <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.lg }}>
            <Text variant="h3">{t('category.chooseSpecialty')}</Text>
          </View>
          <View style={[styles.grid, { paddingHorizontal: spacing.gutter, marginTop: spacing.md }]}>
            <CategoryTile label={t('category.all')} icon="grid-2x2" selected={!sub} onPress={() => setSub(null)} style={styles.tile} />
            {(category.data?.subcategories ?? []).map((s) => (
              <CategoryTile key={s.id} label={localized(s.name)} icon={s.icon} selected={sub === s.id} onPress={() => setSub(sub === s.id ? null : s.id)} style={styles.tile} />
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingHorizontal: spacing.gutter }]} style={{ marginTop: spacing.lg }}>
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.value} label={t(o.key)} selected={sort === o.value} onPress={() => setSort(sort === o.value ? null : o.value)} />
            ))}
          </ScrollView>
          {areas.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingHorizontal: spacing.gutter }]} style={{ marginTop: spacing.sm }}>
              <Chip label={t('category.allAreas')} icon="map-pin" variant="outline" selected={!area} onPress={() => setArea(null)} size="sm" />
              {areas.map((k) => (
                <Chip key={k} label={areaName(k)} icon="map-pin" variant="outline" size="sm" selected={area === k} onPress={() => setArea(area === k ? null : k)} />
              ))}
            </ScrollView>
          ) : null}
          <View style={{ paddingHorizontal: spacing.gutter, paddingVertical: spacing.md }}>
            <Text variant="bodySm" muted>
              {companies.isLoading ? t('common.loading') : t('common.results', { count: companies.data?.length ?? 0 })}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas}>
      <Header title={title} subtitle={t('category.chooseSpecialtyHint', { category: title })} variant="maroon" compact right={<IconButton name="search" variant="glass" onPress={() => router.push('/(customer)/search' as never)} />} />
      <FlashList<Company>
        data={needsAudience ? [] : (companies.data ?? [])}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg }}>
            <CompanyCard company={item} subcategoryLabel={actions.subcategoryLabel(item)} onPress={actions.openCompany} onBook={actions.book} onToggleFavorite={actions.favorite} isFavorite={actions.favorites.includes(item.id)} showDistance={sort === 'nearest'} />
          </View>
        )}
        ListEmptyComponent={
          needsAudience ? null : companies.isLoading ? (
            <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.lg }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState title={t('category.noCompanies')} body={t('category.tryFilter')} actionLabel={t('common.reset')} onAction={() => { setSub(null); setSort(null); setArea(null); }} />
          )
        }
        contentContainerStyle={{ paddingBottom: spacing.huge }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '31%', flex: undefined },
  chips: { gap: 8 },
  audienceRow: { flexDirection: 'row', gap: 12 },
});
