import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Chip, ConfirmContent, EmptyState, Screen, SegmentedControl, SkeletonList, Text, toast, type BottomSheetRef } from '@/components/ui';
import { BookingCard, SubscriptionCard } from '@/components/shared';
import { useCancelBooking, useMyBookings, useMySubscriptions } from '@/data/hooks';
import type { Booking, Subscription } from '@/domain/types';
import { useI18n } from '@/i18n';
import { todayStr } from '@/lib/time';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { RatingSheet, type RatingSheetRef } from './RatingSheet';

type Filter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export const OrdersScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const signedIn = useIsSignedIn();
  const bookings = useMyBookings();
  const subscriptions = useMySubscriptions();
  const cancel = useCancelBooking();
  const [segment, setSegment] = useState<'bookings' | 'subscriptions'>('bookings');
  const [filter, setFilter] = useState<Filter>('all');
  const ratingRef = useRef<RatingSheetRef>(null);
  const confirmRef = useRef<BottomSheetRef>(null);
  const [toCancel, setToCancel] = useState<Booking | null>(null);

  const list = useMemo(() => {
    const today = todayStr();
    const all = bookings.data ?? [];
    switch (filter) {
      case 'upcoming':
        return all.filter((b) => (b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS') && b.date >= today);
      case 'completed':
        return all.filter((b) => b.status === 'COMPLETED');
      case 'cancelled':
        return all.filter((b) => b.status === 'CANCELLED');
      default:
        return all;
    }
  }, [bookings.data, filter]);

  const onCancel = useCallback((b: Booking) => {
    setToCancel(b);
    confirmRef.current?.open();
  }, []);
  const confirmCancel = useCallback(async () => {
    if (!toCancel) return;
    try {
      await cancel.mutateAsync(toCancel.id);
      toast.success(t('orders.cancelled'));
    } catch {
      toast.error(t('common.error'));
    }
    confirmRef.current?.close();
  }, [toCancel, cancel, t]);
  const onRebook = useCallback((b: Booking) => router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: b.companyId, serviceId: b.serviceId ?? '', productId: b.productId ?? '', staffId: b.staffId ?? '' } } as never), [router]);
  const onRate = useCallback((b: Booking) => ratingRef.current?.open(b), []);
  const openOrder = useCallback((b: Booking) => router.push(`/(customer)/order/${b.id}` as never), [router]);
  const openSub = useCallback((s: Subscription) => router.push(`/(customer)/subscription/${s.id}` as never), [router]);

  const header = (
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: spacing.gutter, gap: spacing.md, backgroundColor: colors.canvas, paddingBottom: spacing.md }}>
      <Text variant="h1">{t('orders.title')}</Text>
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'bookings', label: t('orders.bookings') },
          { value: 'subscriptions', label: t('orders.subscriptions') },
        ]}
      />
      {segment === 'bookings' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'upcoming', 'completed', 'cancelled'] as Filter[]).map((f) => (
            <Chip key={f} label={t(`orders.filter.${f}` as 'orders.filter.all')} selected={filter === f} onPress={() => setFilter(f)} size="sm" />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  if (!signedIn) {
    return (
      <Screen mode="fixed" edges={[]} background={colors.canvas}>
        {header}
        <EmptyState icon="log-in" title={t('orders.guestTitle')} body={t('orders.guestBody')} actionLabel={t('common.signIn')} onAction={() => void requireAuth('generic')} />
      </Screen>
    );
  }

  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas}>
      {segment === 'bookings' ? (
        <FlashList<Booking>
          data={list}
          keyExtractor={(b) => b.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg }}>
              <BookingCard booking={item} onPress={openOrder} onCancel={onCancel} onRate={onRate} onRebook={onRebook} />
            </View>
          )}
          ListEmptyComponent={bookings.isLoading ? <SkeletonList rows={3} /> : <EmptyState icon="calendar-check" title={t('orders.empty')} body={t('orders.emptyBody')} actionLabel={t('orders.browse')} onAction={() => router.push('/(customer)/(tabs)' as never)} />}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          onRefresh={() => bookings.refetch()}
          refreshing={bookings.isRefetching}
        />
      ) : (
        <FlashList<Subscription>
          data={subscriptions.data ?? []}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg }}>
              <SubscriptionCard sub={item} onPress={openSub} />
            </View>
          )}
          ListEmptyComponent={subscriptions.isLoading ? <SkeletonList rows={2} avatar={false} /> : <EmptyState icon="repeat" title={t('orders.emptySubs')} body={t('orders.emptySubsBody')} actionLabel={t('orders.browse')} onAction={() => router.push('/(customer)/(tabs)' as never)} />}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          onRefresh={() => subscriptions.refetch()}
          refreshing={subscriptions.isRefetching}
        />
      )}
      <RatingSheet ref={ratingRef} />
      <BottomSheet ref={confirmRef}>
        <ConfirmContent title={t('orders.cancelConfirm')} body={t('orders.cancelConfirmBody')} confirmLabel={t('orders.cancel')} cancelLabel={t('common.back')} onConfirm={confirmCancel} onCancel={() => confirmRef.current?.close()} danger />
      </BottomSheet>
    </Screen>
  );
};


