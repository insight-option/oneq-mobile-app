import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, EmptyState, Icon, IconButton, PriceTag, RatingPill, SectionHeader, Skeleton, Tag, Text, toast } from '@/components/ui';
import { OfferRowCard, ProductCard, RatingSummary, ReviewCard, ServiceRow, StaffCard } from '@/components/shared';
import { useCompany, useCompanyReviews, useMe, useOffers, useProducts, useServices, useStaff, useToggleFavorite } from '@/data/hooks';
import type { Product, Service, Staff, Weekday } from '@/domain/types';
import { useI18n, WEEK_ORDER } from '@/i18n';
import { buildTelUrl, buildWhatsAppUrl } from '@/lib/phone';
import { nextOpenInfo } from '@/lib/time';
import { requireAuth } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { useCompanyActions } from '../catalog/useCatalogHelpers';

const { width: W } = Dimensions.get('window');
const COVER_H = 300;

export const CompanyScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, localized, areaName, formatTime, weekdayName, formatMoney } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const company = useCompany(id);
  const services = useServices(id);
  const products = useProducts(id);
  const staff = useStaff(id);
  const reviews = useCompanyReviews(id);
  const offers = useOffers();
  const me = useMe();
  const toggle = useToggleFavorite();
  const { subcategoryLabel } = useCompanyActions();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const c = company.data;
  const isFavorite = Boolean(c && me.data?.favorites.includes(c.id));
  const openInfo = useMemo(() => (c ? nextOpenInfo(c.openingHours) : { open: false }), [c]);
  const today = new Date().getDay() as Weekday;
  const companyOffers = useMemo(() => (offers.data ?? []).filter((o) => o.companyId === id), [offers.data, id]);
  const gallery = c ? (c.galleryUrls.length ? c.galleryUrls : c.coverUrl ? [c.coverUrl] : []) : [];
  const distribution = useMemo(() => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    (reviews.data ?? []).forEach((r) => (d[r.rating] += 1));
    return d;
  }, [reviews.data]);

  const onGalleryScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / W)), []);

  const book = useCallback(
    async (extra?: Record<string, string>) => {
      if (!c) return;
      if (!(await requireAuth('book'))) return;
      router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: c.id, ...extra } } as never);
    },
    [c, router],
  );
  const favorite = useCallback(async () => {
    if (!c) return;
    if (!(await requireAuth('favorite'))) return;
    const added = await toggle.mutateAsync(c.id);
    toast.success(added ? t('company.favoriteAdded') : t('company.favoriteRemoved'));
  }, [c, toggle, t]);
  const share = useCallback(() => {
    if (!c) return;
    Share.share({ message: `${t('company.shareText', { name: localized(c.name) })}\nhttps://oneq.qa/c/${c.slug}` }).catch(() => undefined);
  }, [c, t, localized]);

  if (company.isLoading || !c) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Skeleton height={COVER_H} radius={0} />
        <View style={{ padding: spacing.gutter, gap: spacing.md }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={120} radius={radii.card} />
        </View>
        {!company.isLoading ? <EmptyState title={t('company.notFound')} actionLabel={t('common.back')} onAction={() => router.back()} /> : null}
      </View>
    );
  }

  const staffLabel = c.categoryId === 'cat_clinics' ? t('company.doctorsCount', { count: c.staffCount }) : c.categoryId === 'cat_gyms' ? t('company.trainersCount', { count: c.staffCount }) : t('company.employeesCount', { count: c.staffCount });
  const staffTitle = c.categoryId === 'cat_clinics' ? t('company.doctors') : c.categoryId === 'cat_gyms' ? t('company.trainers') : t('company.staff');
  const subscriptionServices = (services.data ?? []).filter((s) => s.allowSubscription && s.subscriptionPlans.length);
  const visibleReviews = showAllReviews ? reviews.data ?? [] : (reviews.data ?? []).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover gallery */}
        <View style={{ height: COVER_H, backgroundColor: colors.primaryDeep }}>
          {gallery.length ? (
            <FlatList data={gallery} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(u, i) => `${u}-${i}`} onScroll={onGalleryScroll} scrollEventThrottle={32} renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: W, height: COVER_H }} contentFit="cover" transition={200} cachePolicy="memory-disk" />} />
          ) : null}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.15)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={[styles.coverTop, { top: insets.top + 8 }]}>
            <IconButton name="arrow-right" variant="glass" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/(tabs)'))} />
            <View style={styles.coverActions}>
              <IconButton name="share-2" variant="glass" onPress={share} />
              <IconButton name="heart" variant="glass" color={isFavorite ? '#FF6B8A' : '#FFFFFF'} onPress={favorite} />
            </View>
          </View>
          {gallery.length > 1 ? (
            <View style={styles.galleryPill}>
              <Text variant="caption" numeric color="#FFFFFF" weight="bold">
                {galleryIndex + 1}/{gallery.length}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Floating info card */}
        <View style={{ marginTop: -28, paddingHorizontal: spacing.gutter }}>
          <Card style={{ gap: spacing.md }} shadow="elevated">
            <View style={styles.titleRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h2" lines={2}>
                  {localized(c.name)}
                </Text>
                <View style={styles.chipsRow}>
                  {subcategoryLabel(c) ? <Tag label={subcategoryLabel(c) as string} tone="primary" appearance="tint" size="md" /> : null}
                  {c.isVerified ? <Tag label={t('tag.verified')} tone="success" appearance="tint" icon="badge-check" size="md" /> : null}
                </View>
              </View>
              <RatingPill value={c.ratingAvg} count={c.ratingCount} />
            </View>
            <View style={{ gap: 8 }}>
              <View style={styles.infoRow}>
                <Icon name="map-pin" size={18} color={colors.primary} />
                <Text variant="bodySm" muted style={{ flex: 1 }}>
                  {localized(c.address)} · {areaName(c.area)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="clock" size={18} color={openInfo.open ? colors.success : colors.danger} />
                <Text variant="bodySm" color={openInfo.open ? colors.success : colors.danger} weight="semibold">
                  {openInfo.open ? `${t('company.open')} · ${openInfo.closesAt ? t('company.until', { time: formatTime(openInfo.closesAt) }) : ''}` : openInfo.opensAt ? (openInfo.opensDay === 'today' ? `${t('company.closed')} · ${t('common.opensAt', { time: formatTime(openInfo.opensAt) })}` : `${t('company.closed')} · ${t('company.opensTomorrow', { time: formatTime(openInfo.opensAt) })}`) : t('company.closedToday')}
                </Text>
              </View>
              {c.staffCount > 0 ? (
                <View style={styles.infoRow}>
                  <Icon name="users" size={18} color={colors.primary} />
                  <Text variant="bodySm" muted>
                    {staffLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.actionRow}>
              {[
                { icon: 'phone' as const, label: t('company.call'), onPress: () => Linking.openURL(buildTelUrl(c.phone)).catch(() => undefined) },
                { icon: 'map' as const, label: t('company.map'), onPress: () => router.push({ pathname: '/(customer)/(tabs)/map', params: { focus: c.id } } as never) },
                { icon: 'message-circle-more' as const, label: t('company.whatsapp'), onPress: () => Linking.openURL(buildWhatsAppUrl(c.whatsapp ?? c.phone, '')).catch(() => undefined) },
              ].map((a) => (
                <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.tint, borderRadius: radii.md, opacity: pressed ? 0.8 : 1 }]}>
                  <Icon name={a.icon} size={22} color={colors.primary} />
                  <Text variant="caption" weight="semibold" color={colors.primary}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Service mode */}
        <View style={{ paddingHorizontal: spacing.gutter, marginTop: spacing.lg }}>
          <Card padding={spacing.md} style={styles.modeCard}>
            <View style={[styles.modeIcon, { backgroundColor: colors.tint }]}>
              <Icon name={c.serviceMode === 'HOME' ? 'house' : c.serviceMode === 'BOTH' ? 'repeat' : 'building-2'} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                {t(`company.serviceMode.${c.serviceMode}` as 'company.serviceMode.BOTH')}
              </Text>
              <Text variant="caption" muted>
                {t(`company.serviceMode.${c.serviceMode}.desc` as 'company.serviceMode.BOTH.desc')}
              </Text>
            </View>
            {c.serviceMode === 'BOTH' ? (
              <View style={{ gap: 4 }}>
                <Tag label={t('serviceMode.ONSITE')} tone="onsite" appearance="tint" />
                <Tag label={t('serviceMode.HOME')} tone="home" appearance="tint" />
              </View>
            ) : null}
          </Card>
        </View>

        {/* About */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('company.about')} />
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <Card>
              <Text variant="body" lines={aboutExpanded ? undefined : 3}>
                {localized(c.description)}
              </Text>
              {localized(c.description).length > 120 ? (
                <Pressable onPress={() => setAboutExpanded((v) => !v)} style={{ marginTop: 8 }}>
                  <Text variant="bodySm" weight="semibold" color={colors.primary}>
                    {aboutExpanded ? t('common.readLess') : t('common.readMore')}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          </View>
        </View>

        {/* Hours */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('company.hours')} />
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <Card padding={spacing.md}>
              {WEEK_ORDER.map((d) => {
                const h = c.openingHours[d];
                const isToday = d === today;
                return (
                  <View key={d} style={[styles.hourRow, { backgroundColor: isToday ? colors.tint : 'transparent', borderRadius: radii.sm }]}>
                    <Text variant="bodySm" weight={isToday ? 'bold' : 'medium'} color={isToday ? colors.primary : colors.ink}>
                      {weekdayName(d)}
                      {isToday ? ` · ${t('company.todayLabel')}` : ''}
                    </Text>
                    <Text variant="bodySm" numeric weight="semibold" color={h.open ? colors.ink : colors.danger}>
                      {h.open ? `${formatTime(h.from)} - ${formatTime(h.to)}` : t('common.closed')}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>
        </View>

        {/* Services */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('company.services')} subtitle={services.data?.length ? undefined : t('company.noServices')} />
          <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.md }}>
            {(services.data ?? []).map((s: Service) => (
              <ServiceRow key={s.id} service={s} onPress={(svc) => book({ serviceId: svc.id })} ctaLabel={t('home.bookNow')} />
            ))}
          </View>
        </View>

        {/* Products */}
        {products.data?.length ? (
          <View style={{ marginTop: spacing.xxl }}>
            <SectionHeader title={t('company.products')} />
            <FlatList data={products.data} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(p) => p.id} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md }} renderItem={({ item }: { item: Product }) => <ProductCard product={item} width={160} onPress={(p) => book({ productId: p.id })} />} />
          </View>
        ) : null}

        {/* Staff */}
        {staff.data?.length ? (
          <View style={{ marginTop: spacing.xxl }}>
            <SectionHeader title={staffTitle} subtitle={staffLabel} />
            <FlatList data={staff.data} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(s) => s.id} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md }} renderItem={({ item }: { item: Staff }) => <StaffCard staff={item} onPress={(s) => router.push(`/(customer)/staff/${s.id}` as never)} />} />
          </View>
        ) : null}

        {/* Subscription plans */}
        {c.offersSubscriptions && subscriptionServices.length ? (
          <View style={{ marginTop: spacing.xxl }}>
            <SectionHeader title={t('company.plans')} icon="repeat" />
            <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.md }}>
              {subscriptionServices.slice(0, 2).flatMap((s) =>
                s.subscriptionPlans.map((p) => (
                  <Pressable key={p.id} onPress={() => book({ serviceId: s.id, planId: p.id })} style={({ pressed }) => [styles.plan, { backgroundColor: colors.surface, borderRadius: radii.card, borderColor: p.isPopular ? colors.primary : colors.line, opacity: pressed ? 0.92 : 1 }, shadows.card]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.chipsRow}>
                        <Text variant="title" weight="bold">
                          {localized(p.name)}
                        </Text>
                        {p.isPopular ? <Tag label={t('company.mostChosen')} tone="primary" icon="crown" /> : null}
                      </View>
                      <Text variant="caption" muted>
                        {localized(s.name)} · {t(`booking.plan.perWeek${p.sessionsPerWeek}` as 'booking.plan.perWeek1')} · {t('company.weeks', { n: p.durationWeeks })}
                      </Text>
                      <View style={styles.chipsRow}>
                        {p.features.slice(0, 3).map((f, i) => (
                          <View key={i} style={styles.feature}>
                            <Icon name="check" size={12} color={colors.success} strokeWidth={3} />
                            <Text variant="caption" muted>
                              {localized(f)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <PriceTag price={p.price} offerPrice={p.offerPrice} align="end" />
                  </Pressable>
                )),
              )}
            </View>
          </View>
        ) : null}

        {/* Offers */}
        {companyOffers.length ? (
          <View style={{ marginTop: spacing.xxl }}>
            <SectionHeader title={t('company.offers')} icon="tag" />
            <FlatList data={companyOffers} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(o) => o.id} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md }} renderItem={({ item }) => <OfferRowCard offer={item} onPress={() => book(item.targetType === 'service' ? { serviceId: item.targetId } : { productId: item.targetId })} />} />
          </View>
        ) : null}

        {/* Reviews */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('company.reviews')} subtitle={t('company.reviewsCount', { count: c.ratingCount })} />
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <Card>
              {c.ratingCount > 0 ? <RatingSummary avg={c.ratingAvg} count={reviews.data?.length ?? c.ratingCount} distribution={distribution} basedOnLabel={t('company.ratingBasedOn', { count: c.ratingCount })} /> : null}
              {visibleReviews.map((r) => (
                <ReviewCard key={r.id} review={r} yourReplyLabel={localized(c.name)} />
              ))}
              {!reviews.data?.length && !reviews.isLoading ? (
                <Text variant="bodySm" muted align="center" style={{ paddingVertical: 12 }}>
                  {t('company.noReviews')}
                </Text>
              ) : null}
              {(reviews.data?.length ?? 0) > 3 && !showAllReviews ? <Button label={t('company.viewAllReviews')} variant="ghost" size="sm" onPress={() => setShowAllReviews(true)} style={{ alignSelf: 'center', marginTop: 8 }} /> : null}
            </Card>
          </View>
        </View>
        {c.amenities.length ? (
          <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.gutter }}>
            <View style={styles.chipsRow}>
              {c.amenities.map((a) => (
                <Chip key={a} label={a} size="sm" variant="outline" />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.sticky, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.line }, shadows.elevated]}>
        <View style={{ flex: 1 }}>
          {typeof c.priceFrom === 'number' ? (
            <>
              <Text variant="caption" muted>
                {t('company.priceFrom')}
              </Text>
              <Text variant="numeric" numeric weight="bold" color={colors.primary}>
                {formatMoney(c.priceFrom)}
              </Text>
            </>
          ) : null}
        </View>
        {c.offersSubscriptions && subscriptionServices.length ? <Button label={t('company.subscribe')} variant="outline" onPress={() => book({ serviceId: subscriptionServices[0].id, planId: subscriptionServices[0].subscriptionPlans[0]?.id ?? '' })} /> : null}
        <Button label={c.serviceMode === 'HOME' ? t('company.orderService') : t('company.book')} size="lg" leftIcon="calendar-check" onPress={() => book()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  coverTop: { position: 'absolute', start: 16, end: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coverActions: { flexDirection: 'row', gap: 8 },
  galleryPill: { position: 'absolute', bottom: 40, end: 16, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sticky: { position: 'absolute', start: 0, end: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
