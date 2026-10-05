import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AreaChart, Avatar, Button, Card, DistributionBar, EmptyState, HeroStatCard, Icon, IconBubble, KpiCard, SectionHeader, Skeleton, StatusPill, Text, toast, type IconName } from '@/components/ui';
import { useCompanyBookings, useCompanyStats, useCompanySubscriptions, useMyCompany } from '@/data/hooks';
import { CURRENCY, useI18n, daysUntil } from '@/i18n';
import { greetingKeyByHour } from '@/lib/time';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { CompanyHeader, CompletionChecklist } from '../shell/CompanyShell';

export const CompanyDashboard = () => {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, lang, localized, formatMoney, formatNumber, formatDate, formatTime } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const session = useSession();
  const company = useMyCompany();
  const stats = useCompanyStats('month');
  const todays = useCompanyBookings({ range: 'week' });
  const subs = useCompanySubscriptions();
  const c = company.data;
  const s = stats.data;
  const expiring = useMemo(() => (subs.data ?? []).filter((x) => x.status === 'ACTIVE' && daysUntil(x.endDate) <= 7).slice(0, 5), [subs.data]);
  const latest = useMemo(() => [...(todays.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [todays.data]);

  if (!company.isLoading && !c) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <CompanyHeader />
        <EmptyState icon="store" title={t('cw.noCompany')} body={t('cw.noCompanyBody')} />
      </View>
    );
  }

  const quick: { icon: IconName; label: string; route: string; primary?: boolean }[] = [
    { icon: 'plus', label: t('cw.quick.addService'), route: '/(company)/service/new', primary: true },
    { icon: 'user-plus', label: t('cw.quick.addStaff'), route: '/(company)/staff/new' },
    { icon: 'image-plus', label: t('cw.quick.updatePhotos'), route: '/(company)/media' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <CompanyHeader />
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 110, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <Text variant="bodySm" muted>
            {t(`cw.greeting.${greetingKeyByHour()}` as 'cw.greeting.morning')}
          </Text>
          <Text variant="h1" lines={1}>
            {c ? localized(c.name) : session?.name}
          </Text>
          <Text variant="bodySm" muted>
            {formatDate(new Date())} · {t('cw.dashboard.subtitle')}
          </Text>
        </View>
        {c ? <CompletionChecklist company={c} /> : null}
        <View style={styles.quickRow}>
          {quick.map((q) => (
            <Pressable key={q.label} onPress={() => router.push(q.route as never)} style={[styles.quick, { backgroundColor: q.primary ? colors.primary : colors.surface, borderColor: colors.line, borderRadius: radii.card }]}>
              <Icon name={q.icon} size={22} color={q.primary ? colors.onPrimary : colors.ink} />
              <Text variant="caption" weight="bold" color={q.primary ? colors.onPrimary : colors.ink} align="center">
                {q.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {s ? <HeroStatCard label={t('cw.kpi.revenueMonth')} value={formatNumber(s.revenue)} suffix={CURRENCY[lang]} delta={s.revenueDeltaPct} deltaLabel={t('cw.kpi.vsLastMonth')} series={s.revenueSeries.map((p) => p.value)} /> : <Skeleton height={170} radius={radii.card} />}
        <View style={styles.grid}>
          {s ? (
            <>
              <KpiCard label={t('cw.kpi.bookingsToday')} value={formatNumber(s.bookingsToday)} icon="calendar-check" style={styles.half} />
              <KpiCard label={t('cw.kpi.bookingsMonth')} value={formatNumber(s.bookingsInRange)} icon="calendar-days" delta={s.bookingsDeltaPct} deltaLabel={t('cw.kpi.vsLastMonth')} style={styles.half} />
              <KpiCard label={t('cw.kpi.newCustomers')} value={formatNumber(s.newCustomers)} icon="user-plus" delta={s.newCustomersDeltaPct} deltaLabel={t('cw.kpi.vsLastMonth')} style={styles.half} />
              <KpiCard label={t('cw.kpi.activeSubs')} value={formatNumber(s.activeSubscriptions)} icon="repeat" style={styles.half} />
              <KpiCard label={t('cw.kpi.avgRating')} value={s.ratingAvg.toFixed(1)} icon="star" suffix={t('company.reviewsCount', { count: s.ratingCount })} style={styles.half} />
              <KpiCard label={t('cw.pendingRatings')} value={formatNumber(s.pendingRatings)} icon="message-circle" style={styles.half} />
            </>
          ) : (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} height={130} radius={radii.card} style={styles.half} />)
          )}
        </View>
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={t('cw.chart.revenue')} subtitle={t('cw.chart.last12')} actionLabel={t('common.viewAll')} onAction={() => router.push('/(company)/analytics' as never)} style={{ paddingHorizontal: 0, marginBottom: 0 }} />
          {s ? <AreaChart data={s.revenueSeries} height={200} /> : <Skeleton height={200} />}
        </Card>
        {s?.bookingsByService.length ? (
          <Card style={{ gap: spacing.md }}>
            <SectionHeader title={t('cw.chart.bookingsByService')} subtitle={t('cw.chart.byService', { count: s.bookingsByService.reduce((a, b) => a + b.count, 0) })} style={{ paddingHorizontal: 0, marginBottom: 0 }} />
            <DistributionBar items={s.bookingsByService.map((b) => ({ label: localized(b.name), value: b.count }))} />
            <View style={[styles.insight, { backgroundColor: colors.goldTint, borderRadius: radii.md }]}>
              <Icon name="crown" size={18} color={colors.gold} />
              <Text variant="bodySm" color={colors.ink} style={{ flex: 1 }}>
                {t('cw.insight.topService', { name: localized(s.bookingsByService[0].name), pct: s.bookingsByService[0].pct })}
              </Text>
            </View>
          </Card>
        ) : null}
        <Card padding={0}>
          <SectionHeader title={t('cw.latestBookings')} actionLabel={t('common.viewAll')} onAction={() => router.push('/(company)/(tabs)/bookings' as never)} style={{ padding: spacing.lg, marginBottom: 0 }} />
          {latest.map((b, i) => (
            <Pressable key={b.id} onPress={() => router.push(`/(company)/booking/${b.id}` as never)} style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
              <Avatar name={b.customerName} size={40} />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold" lines={1}>
                  {b.customerName}
                </Text>
                <Text variant="caption" muted lines={1}>
                  {b.serviceName ? localized(b.serviceName) : b.productName ? localized(b.productName) : ''}
                  {b.staffName ? ` · ${localized(b.staffName)}` : ''} · {dayjs(b.date).isSame(dayjs(), 'day') ? t('common.today') : formatDate(b.date, 'short')} {formatTime(b.time)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text variant="bodySm" numeric weight="bold">
                  {formatMoney(b.total)}
                </Text>
                <StatusPill status={b.status} label={t(`status.${b.status}` as 'status.PENDING')} />
              </View>
            </Pressable>
          ))}
          {!latest.length ? (
            <Text variant="bodySm" muted align="center" style={{ padding: spacing.lg }}>
              {t('cw.bookings.empty')}
            </Text>
          ) : null}
        </Card>
        {expiring.length ? (
          <Card padding={0}>
            <SectionHeader title={t('cw.expiringSoon')} subtitle={t('cw.expiringCount', { count: expiring.length })} style={{ padding: spacing.lg, marginBottom: 0 }} />
            {expiring.map((x, i) => (
              <View key={x.id} style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                <Avatar name={x.customerName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="semibold" lines={1}>
                    {x.customerName}
                  </Text>
                  <Text variant="caption" color={colors.danger} lines={1}>
                    {localized(x.planName)} · {t('sub.endsIn', { days: daysUntil(x.endDate) })}
                  </Text>
                </View>
                <Button label={t('cw.remind')} size="sm" variant="soft" leftIcon="bell-ring" onPress={() => toast.success(t('cw.reminded'))} />
              </View>
            ))}
          </Card>
        ) : null}
        <Pressable onPress={() => qc.invalidateQueries()} style={{ alignSelf: 'center', paddingVertical: 8 }}>
          <View style={styles.row}>
            <IconBubble name="refresh-cw" size={28} iconSize={14} />
            <Text variant="caption" muted>
              {t('common.refresh')}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { width: '47.5%', flex: undefined },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
});
