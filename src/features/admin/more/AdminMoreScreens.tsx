import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, BarChart, BottomSheet, Button, Card, ConfirmContent, EmptyState, Header, Input, ListRow, RatingPill, Screen, SegmentedControl, Skeleton, SkeletonList, Sparkline, Tag, Text, TextArea, toast, type BottomSheetRef, type IconName } from '@/components/ui';
import { NotificationRow } from '@/components/shared';
import { useAdminActivity, useAdminBroadcast, useAdminCategories, useAdminCompanies, useAdminCustomers, useAdminNotifications, useAdminPerformance } from '@/data/hooks';
import type { AppNotification, StatsRange } from '@/domain/types';
import { useI18n, type TKey } from '@/i18n';
import { formatPhone } from '@/lib/phone';
import { useTheme } from '@/theme/ThemeProvider';
import { useWorkspaceSignOut } from '@/features/company/shell/WorkspaceHeader';
import { LanguageScreen } from '@/features/customer/profile/ProfileSubScreens';
import { ActivityRow, AdminHeader } from '../shell/AdminShell';

/* ---------- More tab ---------- */
export const AdminMoreScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const signOut = useWorkspaceSignOut();
  const items: { icon: IconName; label: string; route: string }[] = [
    { icon: 'chart-line', label: t('ad.more.performance'), route: '/(admin)/performance' },
    { icon: 'bell-ring', label: t('ad.more.notifications'), route: '/(admin)/notifications' },
    { icon: 'users', label: t('ad.more.customers'), route: '/(admin)/customers' },
    { icon: 'message-circle', label: t('ad.more.broadcast'), route: '/(admin)/broadcast' },
    { icon: 'languages', label: t('ad.more.language'), route: '/(admin)/language' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AdminHeader />
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, gap: spacing.md, paddingBottom: 110 }}>
        <Text variant="h1">{t('tabs.admin.more')}</Text>
        <Card padding={0}>
          {items.map((it, i) => (
            <ListRow key={it.label} icon={it.icon} title={it.label} divider={i < items.length - 1} onPress={() => router.push(it.route as never)} />
          ))}
        </Card>
        <Card padding={0}>
          <ListRow icon="log-out" title={t('ad.more.logout')} danger chevron={false} onPress={() => void signOut()} />
        </Card>
      </ScrollView>
    </View>
  );
};

export const AdminLanguageScreen = () => <LanguageScreen workspace />;

/* ---------- Performance ---------- */
const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1 }}>
    <Text variant="caption" muted>
      {label}
    </Text>
    <Text variant="bodySm" weight="bold" numeric>
      {value}
    </Text>
  </View>
);

export const AdminPerformanceScreen = () => {
  const router = useRouter();
  const { t, localized, formatMoney, formatNumber } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const [range, setRange] = useState<StatsRange>('month');
  const perf = useAdminPerformance(range);
  const companies = useAdminCompanies();
  const categories = useAdminCategories();
  const logo = useMemo(() => new Map((companies.data ?? []).map((c) => [c.id, c.logoUrl ?? null] as const)), [companies.data]);
  const catName = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, localized(c.name)] as const)), [categories.data, localized]);
  const rows = perf.data ?? [];
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('ad.performance.title')} subtitle={t('ad.performance.subtitle')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: 'month', label: t('cw.bookings.month') },
            { value: '6m', label: t('cw.analytics.6m') },
            { value: '12m', label: t('cw.analytics.12m') },
          ]}
        />
        {perf.isLoading ? <Skeleton height={220} radius={radii.card} /> : null}
        {rows.length ? (
          <Card style={{ gap: spacing.md }}>
            <Text variant="title" weight="bold">
              {t('ad.performance.revenue')}
            </Text>
            <BarChart data={rows.slice(0, 8).map((r) => ({ label: localized(r.name).slice(0, 10), value: Math.round(r.revenue) }))} height={180} />
          </Card>
        ) : null}
        {rows.map((r, i) => (
          <Card key={r.companyId} padding={spacing.md} onPress={() => router.push(`/(admin)/company/${r.companyId}` as never)} style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <View style={[styles.rank, { backgroundColor: i < 3 ? colors.goldTint : colors.surfaceAlt }]}>
                <Text variant="caption" weight="bold" numeric color={i < 3 ? colors.gold : colors.muted}>
                  {i + 1}
                </Text>
              </View>
              <Avatar uri={logo.get(r.companyId)} name={localized(r.name)} size={40} rounded="squircle" dark />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="bold" lines={1}>
                  {localized(r.name)}
                </Text>
                <Text variant="caption" muted lines={1}>
                  {catName.get(r.categoryId) ?? ''}
                </Text>
              </View>
              <RatingPill value={r.ratingAvg} count={r.ratingCount} />
            </View>
            <View style={styles.row}>
              <Stat label={t('ad.performance.bookings')} value={formatNumber(r.bookings)} />
              <Stat label={t('ad.performance.revenue')} value={formatMoney(r.revenue, { compact: true })} />
              <Stat label={t('ad.performance.subs')} value={formatNumber(r.activeSubscriptions)} />
              <Sparkline data={r.trend.map((p) => p.value)} height={32} width={90} color={colors.primary} />
            </View>
          </Card>
        ))}
        {!perf.isLoading && !rows.length ? <EmptyState icon="chart-line" title={t('ad.performance.empty')} /> : null}
      </View>
    </Screen>
  );
};

/* ---------- Notifications + activity ---------- */
export const AdminNotificationsScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState<'activity' | 'notifications'>('activity');
  const activity = useAdminActivity(80);
  const notifications = useAdminNotifications();
  const open = (n: AppNotification) => {
    if (n.route) router.push(n.route as never);
  };
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('ad.notifications.title')} subtitle={t('ad.notifications.subtitle')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'activity', label: t('ad.notifications.activity'), count: activity.data?.length },
            { value: 'notifications', label: t('notifications.title'), count: notifications.data?.filter((n) => !n.read).length },
          ]}
        />
        {tab === 'activity' ? (
          <Card padding={0}>
            {(activity.data ?? []).map((a, i) => (
              <ActivityRow
                key={a.id}
                item={a}
                divider={i > 0}
                onPress={(x) => {
                  if (x.companyId) router.push(`/(admin)/company/${x.companyId}` as never);
                }}
              />
            ))}
            {activity.isLoading ? <SkeletonList rows={5} /> : null}
            {!activity.isLoading && !activity.data?.length ? (
              <Text variant="bodySm" muted align="center" style={{ padding: spacing.lg }}>
                {t('ad.notifications.emptyActivity')}
              </Text>
            ) : null}
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {(notifications.data ?? []).map((n) => (
              <NotificationRow key={n.id} item={n} onPress={open} />
            ))}
            {!notifications.isLoading && !notifications.data?.length ? <EmptyState icon="bell" title={t('notifications.empty')} /> : null}
          </View>
        )}
      </View>
    </Screen>
  );
};

/* ---------- Customers ---------- */
export const AdminCustomersScreen = () => {
  const { t, formatNumber, formatDate } = useI18n();
  const { colors, spacing } = useTheme();
  const [query, setQuery] = useState('');
  const customers = useAdminCustomers();
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers.data ?? []).filter((u) => !q || u.name.toLowerCase().includes(q) || (u.phone ?? '').includes(q));
  }, [customers.data, query]);
  return (
    <Screen edges={[]} background={colors.canvas} keyboard>
      <Header title={t('ad.customers.title')} subtitle={t('ad.customers.subtitle', { count: customers.data?.length ?? 0 })} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <Input value={query} onChangeText={setQuery} placeholder={t('common.search')} leftIcon="search" />
        {customers.isLoading ? <SkeletonList rows={5} /> : null}
        {list.map((u) => (
          <Card key={u.id} padding={spacing.md} style={styles.row}>
            <Avatar uri={u.avatarUrl} name={u.name} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" weight="semibold" lines={1}>
                {u.name}
              </Text>
              <Text variant="caption" muted numeric lines={1}>
                {formatPhone(u.phone)}
                {u.email ? ` · ${u.email}` : ''}
              </Text>
              <Text variant="caption" muted>
                {t('ad.customers.joined', { date: formatDate(u.createdAt, 'short') })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text variant="bodySm" weight="bold" numeric color={colors.gold}>
                {t('ad.customers.points', { points: formatNumber(u.loyalty?.points ?? 0) })}
              </Text>
              {u.loyalty ? <Tag label={t(`tier.${u.loyalty.tier}` as TKey)} tone="gold" appearance="tint" /> : null}
            </View>
          </Card>
        ))}
        {!customers.isLoading && !list.length ? <EmptyState icon="users" title={t('ad.customers.empty')} /> : null}
      </View>
    </Screen>
  );
};

/* ---------- Broadcast ---------- */
export const AdminBroadcastScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const broadcast = useAdminBroadcast();
  const confirmRef = useRef<BottomSheetRef>(null);
  const [form, setForm] = useState({ titleAr: '', titleEn: '', bodyAr: '', bodyEn: '', route: '' });
  const valid = Boolean(form.titleAr.trim() && form.bodyAr.trim());
  const preview: AppNotification = {
    id: 'preview',
    audience: 'CUSTOMERS',
    type: 'SYSTEM',
    title: { ar: form.titleAr || '…', en: form.titleEn || form.titleAr || '…' },
    body: { ar: form.bodyAr || '…', en: form.bodyEn || form.bodyAr || '…' },
    route: form.route || null,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const send = async () => {
    confirmRef.current?.close();
    try {
      await broadcast.mutateAsync({ title: { ar: form.titleAr.trim(), en: form.titleEn.trim() || form.titleAr.trim() }, body: { ar: form.bodyAr.trim(), en: form.bodyEn.trim() || form.bodyAr.trim() }, route: form.route.trim() || undefined });
      toast.success(t('ad.broadcast.sent'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };
  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={t('ad.broadcast.title')} subtitle={t('ad.broadcast.subtitle')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Input label={t('ad.broadcast.titleAr')} value={form.titleAr} onChangeText={(v) => setForm((f) => ({ ...f, titleAr: v }))} />
          <Input label={t('ad.broadcast.titleEn')} value={form.titleEn} onChangeText={(v) => setForm((f) => ({ ...f, titleEn: v }))} ltr />
          <TextArea label={t('ad.broadcast.bodyAr')} value={form.bodyAr} onChangeText={(v) => setForm((f) => ({ ...f, bodyAr: v }))} />
          <TextArea label={t('ad.broadcast.bodyEn')} value={form.bodyEn} onChangeText={(v) => setForm((f) => ({ ...f, bodyEn: v }))} ltr />
          <Input label={t('ad.broadcast.route')} value={form.route} onChangeText={(v) => setForm((f) => ({ ...f, route: v }))} placeholder="/(customer)/(tabs)/gifts" ltr />
        </Card>
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" weight="bold" color={colors.gold}>
            {t('ad.broadcast.preview')}
          </Text>
          <NotificationRow item={preview} onPress={() => undefined} />
        </View>
        <Button label={t('ad.broadcast.send')} size="lg" fullWidth leftIcon="bell-ring" loading={broadcast.isPending} onPress={() => (valid ? confirmRef.current?.open() : toast.error(t('ad.broadcast.invalid')))} />
      </View>
      <BottomSheet ref={confirmRef}>
        <ConfirmContent title={t('ad.broadcast.send')} body={t('ad.broadcast.subtitle')} confirmLabel={t('ad.broadcast.send')} cancelLabel={t('common.cancel')} onCancel={() => confirmRef.current?.close()} onConfirm={() => void send()} />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
