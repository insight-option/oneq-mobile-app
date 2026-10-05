import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Avatar, Card, Chip, EmptyState, Select, SegmentedControl, SkeletonList, StatusPill, Tag, Text } from '@/components/ui';
import { useCompanyBookings } from '@/data/hooks';
import type { Booking, BookingStatus } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { CompanyHeader } from '../shell/CompanyShell';

type Range = 'today' | 'week' | 'month';
type Kind = 'ALL' | 'SERVICE' | 'PRODUCT' | 'SUBSCRIPTION';
const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const CompanyBookingRow = ({ booking: b, onPress }: { booking: Booking; onPress: (b: Booking) => void }) => {
  const { t, localized, formatMoney, formatDate, formatTime } = useI18n();
  const { colors, spacing } = useTheme();
  return (
    <Card padding={spacing.md} onPress={() => onPress(b)} style={styles.row}>
      <Avatar name={b.customerName} size={44} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.between}>
          <Text variant="title" weight="semibold" lines={1} style={{ flex: 1 }}>
            {b.customerName}
          </Text>
          <Text variant="bodySm" numeric weight="bold">
            {formatMoney(b.total)}
          </Text>
        </View>
        <Text variant="caption" muted lines={1}>
          {b.serviceName ? localized(b.serviceName) : b.productName ? localized(b.productName) : ''}
          {b.staffName ? ` · ${localized(b.staffName)}` : ''}
        </Text>
        <View style={styles.chips}>
          <Tag label={t(`cw.bookings.kind.${b.kind}` as 'cw.bookings.kind.SERVICE')} tone={b.kind === 'SUBSCRIPTION' ? 'primary' : b.kind === 'PRODUCT' ? 'gold' : 'onsite'} appearance="tint" icon={b.kind === 'SUBSCRIPTION' ? 'repeat' : b.kind === 'PRODUCT' ? 'package' : 'sparkles'} />
          <StatusPill status={b.status} label={t(`status.${b.status}` as 'status.PENDING')} />
          {b.mode === 'HOME' ? <Tag label={t('serviceMode.HOME')} tone="home" appearance="tint" icon="house" /> : null}
          <Text variant="caption" muted>
            {formatDate(b.date, 'short')} · {formatTime(b.time)}
          </Text>
        </View>
      </View>
      <View style={{ width: 0, height: 0, borderColor: colors.line }} />
    </Card>
  );
};

export const CompanyBookingsScreen = () => {
  const router = useRouter();
  const { t, formatMoney } = useI18n();
  const { colors, spacing } = useTheme();
  const [range, setRange] = useState<Range>('week');
  const [kind, setKind] = useState<Kind>('ALL');
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const bookings = useCompanyBookings({ range, kind: kind === 'ALL' ? undefined : kind, status: status ?? undefined });
  const list = useMemo(() => bookings.data ?? [], [bookings.data]);
  const total = useMemo(() => list.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + b.total, 0), [list]);

  const header = (
    <View style={{ padding: spacing.gutter, gap: spacing.md }}>
      <View>
        <Text variant="h1">{t('cw.bookings.title')}</Text>
        <Text variant="bodySm" muted>
          {t('cw.bookings.subtitle')}
        </Text>
      </View>
      <Card style={{ gap: spacing.md }}>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: t('cw.bookings.today') },
            { value: 'week', label: t('cw.bookings.week') },
            { value: 'month', label: t('cw.bookings.month') },
          ]}
        />
        <Select
          value={kind}
          onChange={setKind}
          compact
          options={[
            { value: 'ALL', label: t('cw.bookings.allTypes') },
            { value: 'SERVICE', label: t('cw.bookings.kind.SERVICE'), icon: 'sparkles' },
            { value: 'PRODUCT', label: t('cw.bookings.kind.PRODUCT'), icon: 'package' },
            { value: 'SUBSCRIPTION', label: t('cw.bookings.kind.SUBSCRIPTION'), icon: 'repeat' },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={t('common.all')} size="sm" variant="outline" selected={!status} onPress={() => setStatus(null)} />
          {STATUSES.map((s) => (
            <Chip key={s} label={t(`status.${s}` as 'status.PENDING')} size="sm" variant="outline" selected={status === s} onPress={() => setStatus(status === s ? null : s)} />
          ))}
        </ScrollView>
        <Text variant="bodySm" weight="bold">
          {t('cw.bookings.summary', { count: list.length, amount: formatMoney(total) })}
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <CompanyHeader />
      <FlashList<Booking>
        data={list}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }}>
            <CompanyBookingRow booking={item} onPress={(b) => router.push(`/(company)/booking/${b.id}` as never)} />
          </View>
        )}
        ListEmptyComponent={bookings.isLoading ? <SkeletonList rows={4} /> : <EmptyState icon="calendar-check" title={t('cw.bookings.empty')} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => bookings.refetch()}
        refreshing={bookings.isRefetching}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});
