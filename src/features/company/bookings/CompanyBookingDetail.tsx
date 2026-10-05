import React, { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Avatar, BottomSheet, Button, Card, ConfirmContent, EmptyState, Header, Icon, Screen, Skeleton, StatusPill, Tag, Text, toast, type BottomSheetRef } from '@/components/ui';
import { BookingTimeline } from '@/components/shared';
import { useBooking, useUpdateBookingStatus } from '@/data/hooks';
import type { BookingStatus } from '@/domain/types';
import { useI18n } from '@/i18n';
import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@/lib/phone';
import { useTheme } from '@/theme/ThemeProvider';

/** Booking detail for company + admin workspaces with status transitions. */
export const CompanyBookingDetail = ({ admin }: { admin?: boolean }) => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, localized, formatDate, formatTime, formatMoney, areaName } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const booking = useBooking(id);
  const update = useUpdateBookingStatus();
  const cancelRef = useRef<BottomSheetRef>(null);
  const b = booking.data;

  const transition = async (status: BookingStatus) => {
    if (!b) return;
    try {
      await update.mutateAsync({ id: b.id, status });
      toast.success(status === 'COMPLETED' ? t('cw.booking.completed') : t('cw.booking.updated'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (booking.isLoading || !b) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('orders.details')} variant="workspace" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={200} radius={radii.card} />
          {!booking.isLoading ? <EmptyState title={t('common.noResults')} /> : null}
        </View>
      </Screen>
    );
  }
  const next: { status: BookingStatus; label: string; icon: 'check' | 'play' | 'circle-check' }[] = b.status === 'PENDING' ? [{ status: 'CONFIRMED', label: t('cw.booking.confirm'), icon: 'check' }] : b.status === 'CONFIRMED' ? [{ status: 'IN_PROGRESS', label: t('cw.booking.start'), icon: 'play' }, { status: 'COMPLETED', label: t('cw.booking.complete'), icon: 'circle-check' }] : b.status === 'IN_PROGRESS' ? [{ status: 'COMPLETED', label: t('cw.booking.complete'), icon: 'circle-check' }] : [];

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('orders.details')} subtitle={b.code} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.row}>
            <Avatar name={b.customerName} size={52} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" muted>
                {t('cw.booking.customer')}
              </Text>
              <Text variant="h3" lines={1}>
                {b.customerName}
              </Text>
              <Text variant="caption" numeric muted>
                {formatPhone(b.customerPhone)}
              </Text>
            </View>
            <StatusPill status={b.status} label={t(`status.${b.status}` as 'status.PENDING')} size="md" />
          </View>
          <BookingTimeline status={b.status} />
          <View style={styles.row}>
            <Button label={t('company.call')} variant="soft" size="sm" leftIcon="phone" style={{ flex: 1 }} onPress={() => Linking.openURL(buildTelUrl(b.customerPhone)).catch(() => undefined)} />
            <Button label={t('company.whatsapp')} variant="soft" size="sm" leftIcon="message-circle-more" style={{ flex: 1 }} onPress={() => Linking.openURL(buildWhatsAppUrl(b.customerPhone, '')).catch(() => undefined)} />
          </View>
        </Card>
        <Card style={{ gap: 10 }}>
          {admin ? (
            <View style={styles.row}>
              <Avatar uri={b.companyLogoUrl} name={localized(b.companyName)} size={36} rounded="squircle" />
              <Text variant="title" weight="semibold">
                {localized(b.companyName)}
              </Text>
            </View>
          ) : null}
          {[
            [t('booking.service'), b.serviceName ? localized(b.serviceName) : b.productName ? localized(b.productName) : ''],
            ...(b.staffName ? [[t('booking.staffLabel'), localized(b.staffName)]] : []),
            [t('common.date'), `${formatDate(b.date, 'long')} · ${formatTime(b.time)}`],
            [t('cw.bookings.kind.SERVICE'), t(`cw.bookings.kind.${b.kind}` as 'cw.bookings.kind.SERVICE')],
            [t('booking.paymentMethod'), `${t(`paymentMethod.${b.paymentMethod}` as 'paymentMethod.CARD')} · ${t(`paymentStatus.${b.paymentStatus}` as 'paymentStatus.PAID')}`],
            [t('common.total'), formatMoney(b.total)],
          ].map(([label, value]) => (
            <View key={label} style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
              <Text variant="bodySm" muted>
                {label}
              </Text>
              <Text variant="bodySm" weight="semibold" align="end" style={{ flex: 1 }}>
                {value}
              </Text>
            </View>
          ))}
          {b.notes ? (
            <Text variant="bodySm" muted>
              {t('common.notes')}: {b.notes}
            </Text>
          ) : null}
        </Card>
        {b.mode === 'HOME' && b.address ? (
          <Card style={{ gap: 6 }}>
            <View style={styles.row}>
              <Icon name="map-pin" size={18} color={colors.primary} />
              <Text variant="title" weight="semibold">
                {t('cw.booking.address')}
              </Text>
              <Tag label={t('serviceMode.HOME')} tone="home" appearance="tint" />
            </View>
            <Text variant="bodySm">
              {b.address.label} · {areaName(b.address.area)}
            </Text>
            <Text variant="bodySm" muted>
              {b.address.details}
            </Text>
          </Card>
        ) : null}
        {next.map((n) => (
          <Button key={n.status} label={n.label} size="lg" fullWidth leftIcon={n.icon} loading={update.isPending} onPress={() => transition(n.status)} />
        ))}
        {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' ? <Button label={t('cw.booking.cancel')} variant="danger" fullWidth onPress={() => cancelRef.current?.open()} /> : null}
      </View>
      <BottomSheet ref={cancelRef}>
        <ConfirmContent
          title={t('orders.cancelConfirm')}
          confirmLabel={t('cw.booking.cancel')}
          cancelLabel={t('common.back')}
          danger
          onCancel={() => cancelRef.current?.close()}
          onConfirm={async () => {
            cancelRef.current?.close();
            await transition('CANCELLED');
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
