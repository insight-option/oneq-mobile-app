import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Carousel, Icon, IconButton, SectionHeader, Skeleton, SkeletonCard, Text, toast, type BottomSheetRef } from '@/components/ui';
import { CategoryTile, CompanyCard, CompanyListRow, HeroSlideCard, OfferRowCard, heroFromCompany, heroFromOffer, type HeroSlide } from '@/components/shared';
import { useCategories, useCompanies, useFeatured, useMe, useOffers, usePopular, useToggleFavorite, useTopRated, useUnreadCount } from '@/data/hooks';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useUserLocation } from '@/lib/location';
import { greetingKeyByHour } from '@/lib/time';
import { requireAuth, useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { LocationSheet } from './LocationSheet';

const CARD_W = 300;

export const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t, localized, areaName } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const session = useSession();
  const locationRef = useRef<BottomSheetRef>(null);
  const unread = useUnreadCount();
  const categories = useCategories();
  const offers = useOffers(8);
  const topRated = useTopRated(6);
  const popular = usePopular(8);
  const featured = useFeatured(8);
  const me = useMe();
  const toggleFavorite = useToggleFavorite();
  // Do not prompt for location on Home; the Map tab requests it. Show the nearest section only once a real fix exists.
  const { point, isFallback, status, manualArea } = useUserLocation(false);
  const hasFix = (status === 'granted' || status === 'manual') && !isFallback;
  const locationLabel = manualArea ? areaName(manualArea) : hasFix ? t('home.location.current') : t('home.location');
  const nearest = useCompanies({ near: point, sort: 'nearest', limit: 6 }, { enabled: hasFix });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  }, [qc]);

  const slides = useMemo<HeroSlide[]>(() => {
    if (offers.data?.length) return offers.data.map((o) => heroFromOffer(o, localized, t('home.hero.offer')));
    if (topRated.data?.length) return topRated.data.map((c) => heroFromCompany(c, localized, t('home.hero.top'), 'gold'));
    return (popular.data ?? []).map((c) => heroFromCompany(c, localized, t('home.hero.popular'), 'primary'));
  }, [offers.data, topRated.data, popular.data, localized, t]);

  const subcatLabel = useCallback(
    (c: Company) => {
      const cat = categories.data?.find((x) => x.id === c.categoryId);
      const sub = cat?.subcategories.find((s) => c.subcategoryIds.includes(s.id));
      return sub ? localized(sub.name) : cat ? localized(cat.name) : undefined;
    },
    [categories.data, localized],
  );

  const openCompany = useCallback((c: Company) => router.push(`/(customer)/company/${c.id}` as never), [router]);
  const book = useCallback(
    async (c: Company) => {
      if (!(await requireAuth('book'))) return;
      router.push(`/(customer)/booking/${c.id}` as never);
    },
    [router],
  );
  const favorite = useCallback(
    async (c: Company) => {
      if (!(await requireAuth('favorite'))) return;
      const added = await toggleFavorite.mutateAsync(c.id);
      toast.success(added ? t('company.favoriteAdded') : t('company.favoriteRemoved'));
    },
    [toggleFavorite, t],
  );
  const favorites = useMemo(() => me.data?.favorites ?? [], [me.data?.favorites]);

  const renderCard = useCallback(
    ({ item }: { item: Company }) => (
      <CompanyCard company={item} subcategoryLabel={subcatLabel(item)} onPress={openCompany} onBook={book} onToggleFavorite={favorite} isFavorite={favorites.includes(item.id)} width={CARD_W} />
    ),
    [subcatLabel, openCompany, book, favorite, favorites],
  );

  const loading = categories.isLoading || featured.isLoading;

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingBottom: spacing.huge + 72 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
      {/* Header */}
      <LinearGradient colors={[brand.maroonLight, brand.maroon, brand.maroonDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10, borderBottomStartRadius: radii.sheet, borderBottomEndRadius: radii.sheet }]}>
        <View pointerEvents="none" style={styles.glowA} />
        <View pointerEvents="none" style={styles.glowB} />
        {/* bell · greeting · location — the location pill opens the area picker (nearest-first sections follow it) */}
        <View style={styles.headerRow}>
          <IconButton name="bell" variant="glass" size={44} iconSize={20} badge={Boolean(unread.data)} onPress={() => router.push('/(customer)/notifications' as never)} accessibilityLabel={t('notifications.title')} />
          <View style={styles.greeting}>
            <Text variant="caption" color="rgba(255,255,255,0.78)" align="center">
              {t(`cw.greeting.${greetingKeyByHour()}` as 'cw.greeting.morning')}
            </Text>
            <Text variant="h2" color="#FFFFFF" lines={1} align="center">
              {t('home.greeting', { name: session?.name ?? t('common.guest') })}
            </Text>
          </View>
          <Pressable onPress={() => locationRef.current?.open()} style={[styles.locationPill, { borderRadius: radii.pill }]} hitSlop={6} accessibilityLabel={t('home.location.title')}>
            <Icon name="map-pin" size={14} color="#FFFFFF" />
            <Text variant="caption" weight="semibold" color="#FFFFFF" lines={1} style={{ maxWidth: 84 }}>
              {locationLabel}
            </Text>
            <Icon name="chevron-down" size={13} color="rgba(255,255,255,0.85)" rtlAware={false} />
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/(customer)/search' as never)} style={[styles.search, { borderRadius: radii.pill }, shadows.card]}>
          <Icon name="search" size={18} color={colors.primary} />
          <Text variant="bodySm" color={colors.muted} style={{ flex: 1 }} lines={1}>
            {t('home.searchPlaceholder')}
          </Text>
          <View style={[styles.searchKey, { backgroundColor: colors.tint, borderRadius: radii.pill }]}>
            <Icon name="sparkles" size={14} color={colors.primary} />
          </View>
        </Pressable>
      </LinearGradient>
      <LocationSheet ref={locationRef} />

      {/* Hero carousel — directly under the search bar */}
      <View style={{ marginTop: spacing.lg }}>
        {slides.length ? (
          <Carousel data={slides} keyExtractor={(s) => s.id} height={210} renderItem={({ item }) => <HeroSlideCard slide={item} ctaLabel={t('home.hero.cta')} onPress={() => router.push(`/(customer)/company/${item.companyId}` as never)} />} />
        ) : (
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <Skeleton height={210} radius={radii.media} />
          </View>
        )}
      </View>

      {/* Categories */}
      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader title={t('home.services')} />
        <View style={[styles.grid, { paddingHorizontal: spacing.gutter }]}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={118} radius={radii.card} style={{ width: '31%' }} />)
            : (categories.data ?? []).map((cat) => (
                <CategoryTile key={cat.id} label={localized(cat.name)} icon={cat.icon} color={cat.color} onPress={() => router.push(`/(customer)/category/${cat.id}` as never)} style={styles.tile} />
              ))}
        </View>
      </View>

      {/* Featured */}
      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader title={t('home.featured')} actionLabel={t('common.viewAll')} onAction={() => router.push({ pathname: '/(customer)/companies', params: { sort: 'featured' } } as never)} />
        {featured.isLoading ? (
          <View style={{ paddingHorizontal: spacing.gutter, width: CARD_W + spacing.gutter }}>
            <SkeletonCard />
          </View>
        ) : (
          <FlatList data={featured.data ?? []} keyExtractor={(c) => c.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md }} renderItem={renderCard} initialNumToRender={3} windowSize={4} />
        )}
      </View>

      {/* Offers */}
      {offers.data?.length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('home.offers')} icon="tag" actionLabel={t('common.viewAll')} onAction={() => router.push({ pathname: '/(customer)/companies', params: { sort: 'hasOffer' } } as never)} />
          <FlatList data={offers.data} keyExtractor={(o) => o.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md }} renderItem={({ item }) => <OfferRowCard offer={item} onPress={() => router.push(`/(customer)/company/${item.companyId}` as never)} />} initialNumToRender={3} />
        </View>
      ) : null}

      {/* Nearest */}
      {hasFix && nearest.data?.length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('home.nearest')} actionLabel={t('common.viewAll')} onAction={() => router.push('/(customer)/(tabs)/map' as never)} />
          <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}>
            {nearest.data.slice(0, 4).map((c) => (
              <CompanyListRow key={c.id} company={c} subcategoryLabel={subcatLabel(c)} onPress={openCompany} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Popular */}
      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader title={t('home.popular')} actionLabel={t('common.viewAll')} onAction={() => router.push({ pathname: '/(customer)/companies', params: { sort: 'mostBooked' } } as never)} />
        <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.lg }}>
          {(popular.data ?? []).slice(0, 5).map((c) => (
            <CompanyCard key={c.id} company={c} subcategoryLabel={subcatLabel(c)} onPress={openCompany} onBook={book} onToggleFavorite={favorite} isFavorite={favorites.includes(c.id)} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 20, gap: 14, overflow: 'hidden' },
  glowA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)', top: -90, end: -70 },
  glowB: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(212,168,83,0.16)', bottom: -60, start: -30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { flex: 1, alignItems: 'center', gap: 2 },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 11, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', height: 46, paddingStart: 16, paddingEnd: 6 },
  searchKey: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  // three per row on every platform: explicit basis, no grow (CSS `flex: 1` would pull all tiles into one row)
  tile: { width: '31%', flexGrow: 0, flexShrink: 0, flexBasis: '31%' },
});
