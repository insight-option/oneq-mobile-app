import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Card, Chip, DateStrip, EmptyState, Select, SkeletonList, Text } from '@/components/ui';
import { useAdminBookingsByDay, useAdminCompanies } from '@/data/hooks';
import type { Booking, BookingStatus } from '@/domain/types';
import { useI18n, type TKey } from '@/i18n';
import { todayStr } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import { CompanyBookingRow } from '@/features/company/bookings/CompanyBookingsScreen';
import { AdminHeader } from '../shell/AdminShell';

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

type Group = { id: string; name: Booking['companyName']; logo: string | null | undefined; items: Booking[]; revenue: number };

/** All bookings of the platform for one day, grouped by company. */
export const AdminBookingsScreen = () => {
  const router = useRouter();
  const { t, localized, formatMoney } = useI18n();
  const { colors, spacing } = useTheme();
  const [date, setDate] = useState(todayStr());
  const [companyId, setCompanyId] = useState<string>('ALL');
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const bookings = useAdminBookingsByDay(date);
  const companies = useAdminCompanies();
  const list = useMemo(() => (bookings.data ?? []).filter((b) => (companyId === 'ALL' || b.companyId === companyId) && (!status || b.status === status)), [bookings.data, companyId, status]);
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    list.forEach((b) => {
      const g = map.get(b.companyId) ?? { id: b.companyId, name: b.companyName, logo: b.companyLogoUrl, items: [], revenue: 0 };
      g.items.push(b);
      if (b.status !== 'CANCELLED') g.revenue += b.total;
      map.set(b.companyId, g);
    });
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [list]);
  const revenue = list.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + b.total, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AdminHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 110, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.gutter }}>
          <Text variant="h1">{t('ad.bookings.title')}</Text>
          <Text variant="bodySm" muted>
            {t('ad.bookings.subtitle')}
          </Text>
        </View>
        <DateStrip value={date} onChange={setDate} days={17} startOffset={-3} />
        <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.md }}>
          <Card style={{ gap: spacing.md }}>
            <Select label={t('ad.bookings.company')} value={companyId} onChange={setCompanyId} options={[{ value: 'ALL', label: t('ad.bookings.allCompanies') }, ...(companies.data ?? []).map((c) => ({ value: c.id, label: localized(c.name) }))]} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label={t('common.all')} selected={!status} onPress={() => setStatus(null)} variant="outline" size="sm" />
              {STATUSES.map((s) => (
                <Chip key={s} label={t(`status.${s}` as TKey)} selected={status === s} onPress={() => setStatus(status === s ? null : s)} variant="outline" size="sm" />
              ))}
            </ScrollView>
            <Text variant="bodySm" weight="bold" numeric>
              {t('ad.bookings.summary', { count: list.length, revenue: formatMoney(revenue) })}
            </Text>
          </Card>
          {bookings.isLoading ? <SkeletonList rows={4} /> : null}
          {groups.map((g) => (
            <View key={g.id} style={{ gap: spacing.sm }}>
              <View style={styles.row}>
                <Avatar uri={g.logo} name={localized(g.name)} size={32} rounded="squircle" dark />
                <Text variant="title" weight="bold" style={{ flex: 1 }} lines={1} onPress={() => router.push(`/(admin)/company/${g.id}` as never)}>
                  {localized(g.name)}
                </Text>
                <Text variant="caption" muted numeric>
                  {t('ad.bookings.summary', { count: g.items.length, revenue: formatMoney(g.revenue) })}
                </Text>
              </View>
              {g.items.map((b) => (
                <CompanyBookingRow key={b.id} booking={b} onPress={(x) => router.push(`/(admin)/booking/${x.id}` as never)} />
              ))}
            </View>
          ))}
          {!bookings.isLoading && !list.length ? <EmptyState icon="calendar-check" title={t('ad.bookings.empty')} /> : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
