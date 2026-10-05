import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Carousel, Icon, IconButton, SectionHeader, Skeleton, SkeletonCard, Text, toast } from '@/components/ui';
import { CategoryTile, CompanyCard, CompanyListRow, HeroSlideCard, OfferRowCard, heroFromCompany, heroFromOffer, type HeroSlide } from '@/components/shared';
import { useCategories, useCompanies, useFeatured, useMe, useOffers, usePopular, useToggleFavorite, useTopRated, useUnreadCount } from '@/data/hooks';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useUserLocation } from '@/lib/location';
import { requireAuth, useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GuestBanner } from '@/features/shell/GuestBanner';

const CARD_W = 300;

export const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t, localized } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const session = useSession();
  const unread = useUnreadCount();
  const categories = useCategories();
  const offers = useOffers(8);
  const topRated = useTopRated(6);
  const popular = usePopular(8);
  const featured = useFeatured(8);
  const me = useMe();
  const toggleFavorite = useToggleFavorite();
  // Do not prompt for location on Home; the Map tab requests it. Show the nearest section only once a real fix exists.
  const { point, isFallback, status } = useUserLocation(false);
  const hasFix = status === 'granted' && !isFallback;
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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => router.push('/(customer)/(tabs)/map' as never)} style={styles.locationRow} hitSlop={6}>
              <Icon name="map-pin" size={14} color="rgba(255,255,255,0.85)" />
              <Text variant="caption" weight="semibold" color="rgba(255,255,255,0.9)">
                {t('home.location')}
              </Text>
              <Icon name="chevron-down" size={14} color="rgba(255,255,255,0.75)" rtlAware={false} />
            </Pressable>
            <Text variant="h1" color="#FFFFFF" lines={1}>
              {t('home.greeting', { name: session?.name ?? t('common.guest') })}
            </Text>
          </View>
          <IconButton name="bell" variant="glass" size={44} iconSize={20} badge={Boolean(unread.data)} onPress={() => router.push('/(customer)/notifications' as never)} accessibilityLabel={t('notifications.title')} />
        </View>
        <Pressable onPress={() => router.push('/(customer)/search' as never)} style={[styles.search, { borderRadius: radii.pill }]}>
          <Icon name="search" size={20} color={colors.faint} />
          <Text variant="bodySm" color={colors.faint} style={{ flex: 1 }} lines={1}>
            {t('home.searchPlaceholder')}
          </Text>
        </Pressable>
      </LinearGradient>

      <View style={{ height: spacing.lg }} />
      <GuestBanner />

      {/* Hero carousel */}
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
                <CategoryTile key={cat.id} label={localized(cat.name)} icon={cat.icon} color={cat.color} onPress={() => router.push(`/(customer)/category/${cat.id}` as never)} style={{ width: '31%', flex: undefined }} />
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
  header: { paddingHorizontal: 16, paddingBottom: 22, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', height: 52, paddingHorizontal: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
});
