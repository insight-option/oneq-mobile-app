import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet, Button, Chip, EmptyState, Header, IconButton, Screen, SegmentedControl, SkeletonCard, Text, type BottomSheetRef } from '@/components/ui';
import { CompanyCard } from '@/components/shared';
import { useCompanies } from '@/data/hooks';
import type { Company, CompanySort, ServiceMode } from '@/domain/types';
import { AREA_KEYS, useI18n } from '@/i18n';
import { useUserLocation } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';
import { SORT_OPTIONS, useCompanyActions } from './useCatalogHelpers';

export const CompaniesScreen = () => {
  const params = useLocalSearchParams<{ categoryId?: string; subcategoryId?: string; sort?: string; area?: string; query?: string; title?: string }>();
  const router = useRouter();
  const { t, areaName, localized } = useI18n();
  const { colors, spacing } = useTheme();
  const [sort, setSort] = useState<CompanySort | null>((params.sort as CompanySort) ?? null);
  const [area, setArea] = useState<string | null>(params.area ?? null);
  const [mode, setMode] = useState<ServiceMode | 'ALL'>('ALL');
  const [openNow, setOpenNow] = useState(false);
  const sheet = useRef<BottomSheetRef>(null);
  const { point } = useUserLocation(sort === 'nearest');
  const companies = useCompanies({ categoryId: params.categoryId, subcategoryId: params.subcategoryId, sort: sort ?? 'featured', area: area ?? undefined, serviceMode: mode === 'ALL' ? undefined : mode, openNow, query: params.query, near: sort === 'nearest' ? point : undefined });
  const actions = useCompanyActions();
  const category = actions.categories.find((c) => c.id === params.categoryId);
  const title = params.title ?? (category ? localized(category.name) : t('common.all'));

  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas}>
      <Header title={title} variant="maroon" compact right={<IconButton name="sliders-horizontal" variant="glass" onPress={() => sheet.current?.open()} />} />
      <FlashList<Company>
        data={companies.data ?? []}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingHorizontal: spacing.gutter }]} style={{ marginTop: spacing.lg }}>
              {SORT_OPTIONS.map((o) => (
                <Chip key={o.value} label={t(o.key)} selected={sort === o.value} onPress={() => setSort(sort === o.value ? null : o.value)} />
              ))}
            </ScrollView>
            <View style={{ paddingHorizontal: spacing.gutter, paddingVertical: spacing.md }}>
              <Text variant="bodySm" muted>
                {companies.isLoading ? t('common.loading') : t('common.results', { count: companies.data?.length ?? 0 })}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg }}>
            <CompanyCard company={item} subcategoryLabel={actions.subcategoryLabel(item)} onPress={actions.openCompany} onBook={actions.book} onToggleFavorite={actions.favorite} isFavorite={actions.favorites.includes(item.id)} showDistance={sort === 'nearest'} />
          </View>
        )}
        ListEmptyComponent={
          companies.isLoading ? (
            <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.lg }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState title={t('category.noCompanies')} body={t('category.tryFilter')} actionLabel={t('common.reset')} onAction={() => { setSort(null); setArea(null); setMode('ALL'); setOpenNow(false); }} />
          )
        }
        contentContainerStyle={{ paddingBottom: spacing.huge }}
        showsVerticalScrollIndicator={false}
      />
      <BottomSheet ref={sheet} title={t('category.filters')}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodySm" weight="semibold">
              {t('category.serviceMode')}
            </Text>
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: 'ALL', label: t('common.all') },
                { value: 'ONSITE', label: t('serviceMode.ONSITE') },
                { value: 'HOME', label: t('serviceMode.HOME') },
              ]}
            />
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodySm" weight="semibold">
              {t('category.area')}
            </Text>
            <View style={styles.wrap}>
              <Chip label={t('category.allAreas')} size="sm" variant="outline" selected={!area} onPress={() => setArea(null)} />
              {AREA_KEYS.map((k) => (
                <Chip key={k} label={areaName(k)} size="sm" variant="outline" selected={area === k} onPress={() => setArea(area === k ? null : k)} />
              ))}
            </View>
          </View>
          <Chip label={t('sort.openNow')} icon="clock" selected={openNow} onPress={() => setOpenNow((v) => !v)} />
          <Button label={t('common.apply')} fullWidth onPress={() => sheet.current?.close()} />
          <Button label={t('common.reset')} variant="ghost" fullWidth onPress={() => { setArea(null); setMode('ALL'); setOpenNow(false); setSort(null); sheet.current?.close(); router.setParams({ sort: '' } as never); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({ chips: { gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
