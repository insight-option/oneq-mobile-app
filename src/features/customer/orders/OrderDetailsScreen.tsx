import React, { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, BottomSheet, Button, Card, ConfirmContent, EmptyState, Header, Icon, Screen, Skeleton, StatusPill, Tag, Text, toast, type BottomSheetRef } from '@/components/ui';
import { BookingTimeline } from '@/components/shared';
import { useBooking, useCancelBooking, useCompany } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { buildTelUrl, buildWhatsAppUrl } from '@/lib/phone';
import { useTheme } from '@/theme/ThemeProvider';
import { RatingSheet, type RatingSheetRef } from './RatingSheet';

export const OrderDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, localized, formatDate, formatTime, formatMoney, areaName } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const booking = useBooking(id);
  const company = useCompany(booking.data?.companyId);
  const cancel = useCancelBooking();
  const ratingRef = useRef<RatingSheetRef>(null);
  const confirmRef = useRef<BottomSheetRef>(null);
  const b = booking.data;

  if (booking.isLoading || !b) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('orders.details')} variant="maroon" compact />
        <View style={{ padding: spacing.gutter, gap: spacing.md }}>
          <Skeleton height={120} radius={radii.card} />
          <Skeleton height={200} radius={radii.card} />
          {!booking.isLoading ? <EmptyState title={t('common.noResults')} /> : null}
        </View>
      </Screen>
    );
  }
  const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
  const canRate = b.status === 'COMPLETED' && !b.companyRated;
  const rows: [string, string][] = [
    [t('booking.service'), b.serviceName ? localized(b.serviceName) : b.productName ? localized(b.productName) : t(`cw.bookings.kind.${b.kind}` as 'cw.bookings.kind.SERVICE')],
    ...(b.staffName ? [[t('booking.staffLabel'), localized(b.staffName)] as [string, string]] : []),
    [t('common.date'), formatDate(b.date, 'long')],
    [t('common.time'), formatTime(b.time)],
    [t('booking.place'), b.mode === 'HOME' ? `${t('company.serviceMode.HOME')}${b.address ? ` · ${b.address.label} · ${areaName(b.address.area)}` : ''}` : t('company.serviceMode.ONSITE')],
    [t('booking.paymentMethod'), t(`paymentMethod.${b.paymentMethod}` as 'paymentMethod.CARD')],
    [t('booking.paymentStatus'), t(`paymentStatus.${b.paymentStatus}` as 'paymentStatus.PAID')],
  ];

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('orders.details')} subtitle={b.code} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.row}>
            <Avatar uri={b.companyLogoUrl} name={localized(b.companyName)} size={52} rounded="squircle" />
            <View style={{ flex: 1 }}>
              <Text variant="h3" lines={1}>
                {localized(b.companyName)}
              </Text>
              <Text variant="caption" muted>
                {t('orders.code')}: {b.code}
              </Text>
            </View>
            <StatusPill status={b.status} label={t(`status.${b.status}` as 'status.PENDING')} size="md" />
          </View>
          {b.isGift ? <Tag label={t('booking.giftTo')} tone="gold" appearance="tint" icon="gift" /> : null}
          <BookingTimeline status={b.status} />
        </Card>
        <Card style={{ gap: 10 }}>
          <Text variant="title" weight="bold">
            {t('common.details')}
          </Text>
          {rows.map(([label, value]) => (
            <View key={label} style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
              <Text variant="bodySm" muted>
                {label}
              </Text>
              <Text variant="bodySm" weight="semibold" align="end" style={{ flex: 1 }}>
                {value}
              </Text>
            </View>
          ))}
          {b.address?.details ? (
            <Text variant="caption" muted>
              {b.address.details}
            </Text>
          ) : null}
        </Card>
        <Card style={{ gap: 8 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" muted>
              {t('booking.price')}
            </Text>
            <Text variant="bodySm" numeric weight="semibold">
              {formatMoney(b.price)}
            </Text>
          </View>
          {b.discount > 0 ? (
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text variant="bodySm" color={colors.success}>
                {t('booking.discount')} ({b.pointsUsed} {t('common.points')})
              </Text>
              <Text variant="bodySm" numeric weight="semibold" color={colors.success}>
                -{formatMoney(b.discount)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
            <Text variant="title" weight="bold">
              {t('common.total')}
            </Text>
            <Text variant="h3" numeric color={colors.primary}>
              {formatMoney(b.total)}
            </Text>
          </View>
          <View style={[styles.row, { backgroundColor: colors.goldTint, borderRadius: radii.sm, padding: 10 }]}>
            <Icon name="coins" size={16} color={colors.gold} />
            <Text variant="caption" color={colors.gold} weight="semibold">
              {b.status === 'COMPLETED' ? `+${b.pointsEarned} ${t('common.points')}` : t('booking.pointsEarn', { points: b.pointsEarned })}
            </Text>
          </View>
        </Card>
        {company.data ? (
          <View style={styles.row}>
            <Button label={t('company.call')} variant="soft" leftIcon="phone" style={{ flex: 1 }} onPress={() => Linking.openURL(buildTelUrl(company.data?.phone ?? '')).catch(() => undefined)} />
            <Button label={t('company.whatsapp')} variant="soft" leftIcon="message-circle-more" style={{ flex: 1 }} onPress={() => Linking.openURL(buildWhatsAppUrl(company.data?.whatsapp ?? company.data?.phone ?? '', '')).catch(() => undefined)} />
            <Button label={t('company.map')} variant="soft" leftIcon="map" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(customer)/(tabs)/map', params: { focus: b.companyId } } as never)} />
          </View>
        ) : null}
        {canRate ? <Button label={t('orders.rate')} size="lg" fullWidth leftIcon="star" onPress={() => ratingRef.current?.open(b)} /> : null}
        {canCancel ? <Button label={t('orders.cancel')} variant="danger" size="lg" fullWidth onPress={() => confirmRef.current?.open()} /> : null}
        {b.status === 'COMPLETED' || b.status === 'CANCELLED' ? <Button label={t('orders.rebook')} variant="outline" size="lg" fullWidth onPress={() => router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: b.companyId, serviceId: b.serviceId ?? '', productId: b.productId ?? '' } } as never)} /> : null}
      </View>
      <RatingSheet ref={ratingRef} />
      <BottomSheet ref={confirmRef}>
        <ConfirmContent
          title={t('orders.cancelConfirm')}
          body={t('orders.cancelConfirmBody')}
          confirmLabel={t('orders.cancel')}
          cancelLabel={t('common.back')}
          danger
          onCancel={() => confirmRef.current?.close()}
          onConfirm={async () => {
            try {
              await cancel.mutateAsync(b.id);
              toast.success(t('orders.cancelled'));
            } catch {
              toast.error(t('common.error'));
            }
            confirmRef.current?.close();
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
