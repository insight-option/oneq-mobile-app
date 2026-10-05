import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, BarChart, Button, Card, HeroStatCard, Icon, IconBubble, KpiCard, ProgressBar, RatingPill, SectionHeader, Skeleton, StatusPill, Text, type IconName } from '@/components/ui';
import { useAdminCompanies, useAdminStats } from '@/data/hooks';
import { CURRENCY, useI18n } from '@/i18n';
import { greetingKeyByHour } from '@/lib/time';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { completionOf } from '@/features/company/shell/CompanyShell';
import { ActivityRow, AdminHeader, adminCompanyStatus } from '../shell/AdminShell';

export const AdminDashboard = () => {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, lang, localized, formatMoney, formatNumber, formatDate } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const session = useSession();
  const stats = useAdminStats('today');
  const pending = useAdminCompanies({ status: 'pending' });
  const s = stats.data;
  const quick: { icon: IconName; label: string; route: string; primary?: boolean }[] = [
    { icon: 'plus', label: t('ad.companies.create'), route: '/(admin)/company/new', primary: true },
    { icon: 'tags', label: t('ad.categories.create'), route: '/(admin)/category/new' },
    { icon: 'bell-ring', label: t('ad.more.broadcast'), route: '/(admin)/broadcast' },
  ];
  const rowStyle = (i: number) => [styles.row, { paddingHorizontal: spacing.lg, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.line }];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AdminHeader />
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 110, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <Text variant="bodySm" muted>
            {t(`cw.greeting.${greetingKeyByHour()}` as 'cw.greeting.morning')}
          </Text>
          <Text variant="h1" lines={1}>
            {t('ad.greeting', { name: session?.name ?? 'OneQ' })}
          </Text>
          <Text variant="bodySm" muted>
            {formatDate(new Date())} · {t('ad.subtitle')}
          </Text>
        </View>
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
        {s ? <HeroStatCard label={t('ad.kpi.revenueToday')} value={formatNumber(s.revenueToday)} suffix={CURRENCY[lang]} icon="trending-up" series={s.bookingsPerDay.map((p) => p.value)} /> : <Skeleton height={170} radius={radii.card} />}
        <View style={styles.grid}>
          {s ? (
            <>
              <KpiCard label={t('ad.kpi.bookingsToday')} value={formatNumber(s.bookingsToday)} icon="calendar-check" style={styles.half} onPress={() => router.push('/(admin)/(tabs)/bookings' as never)} />
              <KpiCard label={t('ad.kpi.activeCompanies')} value={formatNumber(s.activeCompanies)} icon="building-2" suffix={t('ad.kpi.pendingCompanies', { count: s.pendingCompanies })} style={styles.half} onPress={() => router.push('/(admin)/(tabs)/companies' as never)} />
              <KpiCard label={t('ad.kpi.customers')} value={formatNumber(s.customers)} icon="users" style={styles.half} onPress={() => router.push('/(admin)/customers' as never)} />
              <KpiCard label={t('ad.kpi.activeSubs')} value={formatNumber(s.activeSubscriptions)} icon="repeat" style={styles.half} />
            </>
          ) : (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} height={130} radius={radii.card} style={styles.half} />)
          )}
        </View>
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={t('ad.chart.bookings14')} style={{ paddingHorizontal: 0, marginBottom: 0 }} />
          {s ? <BarChart data={s.bookingsPerDay} height={180} /> : <Skeleton height={180} />}
        </Card>
        <Card padding={0}>
          <SectionHeader title={t('ad.byCompanyToday')} actionLabel={t('common.viewAll')} onAction={() => router.push('/(admin)/(tabs)/bookings' as never)} style={{ padding: spacing.lg, marginBottom: 0 }} />
          {(s?.bookingsByCompanyToday ?? []).map((b, i) => (
            <Pressable key={b.companyId} onPress={() => router.push(`/(admin)/company/${b.companyId}` as never)} style={rowStyle(i)}>
              <Avatar name={localized(b.name)} size={40} rounded="squircle" dark />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold" lines={1}>
                  {localized(b.name)}
                </Text>
                <Text variant="caption" muted>
                  {t('ad.bookings.summary', { count: b.count, revenue: formatMoney(b.revenue) })}
                </Text>
              </View>
              <Text variant="h3" numeric>
                {b.count}
              </Text>
            </Pressable>
          ))}
          {s && !s.bookingsByCompanyToday.length ? (
            <Text variant="bodySm" muted align="center" style={{ padding: spacing.lg }}>
              {t('ad.bookings.empty')}
            </Text>
          ) : null}
        </Card>
        <Card padding={0}>
          <SectionHeader title={t('ad.topCompanies')} actionLabel={t('common.viewAll')} onAction={() => router.push('/(admin)/performance' as never)} style={{ padding: spacing.lg, marginBottom: 0 }} />
          {(s?.topCompanies ?? []).map((c, i) => (
            <Pressable key={c.companyId} onPress={() => router.push(`/(admin)/company/${c.companyId}` as never)} style={rowStyle(i)}>
              <View style={[styles.rank, { backgroundColor: i === 0 ? colors.goldTint : colors.surfaceAlt }]}>
                <Text variant="caption" weight="bold" numeric color={i === 0 ? colors.gold : colors.muted}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold" lines={1}>
                  {localized(c.name)}
                </Text>
                <Text variant="caption" muted numeric>
                  {t('ad.performance.bookings')}: {c.bookingCount}
                </Text>
              </View>
              <RatingPill value={c.ratingAvg} />
            </Pressable>
          ))}
        </Card>
        {pending.data?.length ? (
          <Card padding={0}>
            <SectionHeader title={t('ad.pendingCompanies')} subtitle={t('ad.dashboard.pendingBody')} style={{ padding: spacing.lg, marginBottom: 0 }} />
            {pending.data.slice(0, 5).map((c, i) => {
              const comp = completionOf(c);
              const st = adminCompanyStatus(c);
              return (
                <View key={c.id} style={rowStyle(i)}>
                  <Avatar uri={c.logoUrl} name={localized(c.name)} size={40} rounded="squircle" dark />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text variant="title" weight="semibold" lines={1}>
                      {localized(c.name)}
                    </Text>
                    <ProgressBar value={comp.done / comp.total} color={colors.gold} />
                    <View style={styles.row}>
                      <StatusPill status={st.tone} label={t(st.key)} />
                      <Text variant="caption" muted numeric>
                        {comp.done}/{comp.total}
                      </Text>
                    </View>
                  </View>
                  <Button label={t('ad.followUp')} size="sm" variant="soft" onPress={() => router.push(`/(admin)/company/${c.id}` as never)} />
                </View>
              );
            })}
          </Card>
        ) : null}
        <Card padding={0}>
          <SectionHeader title={t('ad.activity')} actionLabel={t('common.viewAll')} onAction={() => router.push('/(admin)/notifications' as never)} style={{ padding: spacing.lg, marginBottom: 0 }} />
          {(s?.recentActivity ?? []).map((a, i) => (
            <ActivityRow
              key={a.id}
              item={a}
              divider={i > 0}
              onPress={(x) => {
                if (x.companyId) router.push(`/(admin)/company/${x.companyId}` as never);
              }}
            />
          ))}
          {s && !s.recentActivity.length ? (
            <Text variant="bodySm" muted align="center" style={{ padding: spacing.lg }}>
              {t('ad.notifications.emptyActivity')}
            </Text>
          ) : null}
        </Card>
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
  half: { width: '47.5%', flexGrow: 0, flexShrink: 0, flexBasis: '47.5%' }, // explicit components: CSS `flex: 0` would mean basis 0% on web, `flex: undefined` does not override on web
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
