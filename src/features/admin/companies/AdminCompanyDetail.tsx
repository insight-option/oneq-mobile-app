import React, { useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AreaChart, Avatar, BottomSheet, Button, Card, ConfirmContent, DateStrip, EmptyState, Header, Icon, IconBubble, KpiCard, PriceTag, ProgressBar, RatingPill, Screen, SegmentedControl, Skeleton, StatusPill, Tag, Text, toast, type BottomSheetRef } from '@/components/ui';
import { RatingSummary, ReviewCard, ServiceRow, StaffCard } from '@/components/shared';
import { useAdminBookingsByDay, useAdminDeleteCompany, useAdminPerformance, useAdminResendInvitation, useAdminSetCompanyActive, useCategories, useCompany, useCompanyReviews, useProducts, useServices, useStaff } from '@/data/hooks';
import type { Weekday } from '@/domain/types';
import { useI18n, type TKey } from '@/i18n';
import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@/lib/phone';
import { todayStr } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import { completionOf } from '@/features/company/shell/CompanyShell';
import { CompanyBookingRow } from '@/features/company/bookings/CompanyBookingsScreen';
import { adminCompanyStatus } from '../shell/AdminShell';

type Tab = 'overview' | 'services' | 'staff' | 'bookings' | 'reviews';

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
      <Text variant="bodySm" muted>
        {label}
      </Text>
      <Text variant="bodySm" weight="semibold" align="end" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
};

export const AdminCompanyDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, localized, areaName, formatMoney, formatNumber, formatDate, formatTime } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const company = useCompany(id);
  const categories = useCategories();
  const services = useServices(id);
  const products = useProducts(id);
  const staff = useStaff(id);
  const reviews = useCompanyReviews(id);
  const perf = useAdminPerformance('12m');
  const setActive = useAdminSetCompanyActive();
  const deleteCompany = useAdminDeleteCompany();
  const deleteRef = useRef<BottomSheetRef>(null);
  const resendInvite = useAdminResendInvitation();
  const resendRef = useRef<BottomSheetRef>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [date, setDate] = useState(todayStr());
  const dayBookings = useAdminBookingsByDay(date);
  const c = company.data;
  const category = categories.data?.find((x) => x.id === c?.categoryId);
  const row = useMemo(() => perf.data?.find((p) => p.companyId === id) ?? null, [perf.data, id]);
  const dist = useMemo(() => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    (reviews.data ?? []).forEach((r) => {
      d[r.rating] += 1;
    });
    return d;
  }, [reviews.data]);
  const bookings = useMemo(() => (dayBookings.data ?? []).filter((b) => b.companyId === id), [dayBookings.data, id]);

  if (company.isLoading || !c) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('ad.companies.title')} variant="workspace" compact />
        <View style={{ padding: spacing.gutter }}>{company.isLoading ? <Skeleton height={300} radius={radii.card} /> : <EmptyState icon="building-2" title={t('ad.company.notFound')} />}</View>
      </Screen>
    );
  }

  const st = adminCompanyStatus(c);
  const completion = completionOf(c);
  const today = new Date().getDay() as Weekday;
  const hoursToday = c.openingHours[today];
  const subNames = (category?.subcategories ?? [])
    .filter((s) => c.subcategoryIds.includes(s.id))
    .map((s) => localized(s.name))
    .join('، ');
  const toggleActive = async () => {
    try {
      await setActive.mutateAsync({ id: c.id, isActive: !c.isActive });
      toast.success(c.isActive ? t('ad.company.deactivated') : t('ad.company.activated'));
    } catch {
      toast.error(t('common.error'));
    }
  };
  const info: [string, string][] = [
    [t('ad.form.category'), category ? localized(category.name) : '—'],
    [t('ad.form.subcategories'), subNames || '—'],
    [t('ad.form.area'), `${areaName(c.area)} · ${localized(c.address)}`],
    [t('ad.form.serviceMode'), t(`serviceMode.${c.serviceMode}` as TKey)],
    [t('ad.form.audience'), t(`audience.${c.audience}` as TKey)],
    [t('ad.form.subscriptions'), c.offersSubscriptions ? t('common.yes') : t('common.no')],
    [t('cw.profile.hasStaff'), c.hasStaff ? t('common.yes') : t('common.no')],
    [t('ad.company.todayHours'), hoursToday.open ? `${formatTime(hoursToday.from)} – ${formatTime(hoursToday.to)}` : t('cw.hours.closed')],
    [t('common.date'), formatDate(c.createdAt, 'short')],
  ];
  const contact: [string, string][] = [[t('ad.form.phone'), formatPhone(c.phone)], ...(c.whatsapp ? [[t('ad.form.whatsapp'), formatPhone(c.whatsapp)] as [string, string]] : []), ...(c.email ? [[t('common.email'), c.email] as [string, string]] : [])];
  const completionKeys = ['location', 'hours', 'catalog', 'media'] as const;

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={localized(c.name)} subtitle={category ? localized(category.name) : undefined} variant="workspace" compact right={<Button label={t('common.edit')} size="sm" variant="soft" leftIcon="pencil" onPress={() => router.push(`/(admin)/company/edit/${c.id}` as never)} />} />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <View style={{ height: 150, backgroundColor: colors.surfaceAlt }}>{c.coverUrl ? <Image source={{ uri: c.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <View style={styles.row}>
              <Avatar uri={c.logoUrl} name={localized(c.name)} size={56} rounded="squircle" dark bordered />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h3" lines={1}>
                  {localized(c.name)}
                </Text>
                <View style={styles.chips}>
                  <StatusPill status={st.tone} label={t(st.key)} />
                  <Tag label={t(`serviceMode.${c.serviceMode}` as TKey)} tone={c.serviceMode === 'HOME' ? 'home' : 'onsite'} appearance="tint" />
                  {c.offersSubscriptions ? <Tag label={t('booking.type.subscription')} tone="primary" appearance="tint" icon="repeat" /> : null}
                </View>
              </View>
            </View>
            <View style={styles.chips}>
              <RatingPill value={c.ratingAvg} count={c.ratingCount} />
              <Text variant="caption" muted numeric>
                {formatNumber(c.bookingCount)} {t('ad.performance.bookings')}
              </Text>
              <Text variant="caption" muted numeric>
                {formatNumber(c.staffCount)} {t('tabs.company.staff')}
              </Text>
            </View>
            <View style={styles.row}>
              <Button label={c.isActive ? t('ad.company.deactivate') : t('ad.company.activate')} variant={c.isActive ? 'outline' : 'primary'} size="sm" leftIcon={c.isActive ? 'power' : 'circle-check'} loading={setActive.isPending} disabled={!c.isActive && !completion.complete} onPress={toggleActive} style={{ flex: 1 }} />
              <Button label={t('company.call')} variant="soft" size="sm" leftIcon="phone" onPress={() => Linking.openURL(buildTelUrl(c.phone)).catch(() => undefined)} />
              <Button label={t('company.whatsapp')} variant="soft" size="sm" leftIcon="message-circle-more" onPress={() => Linking.openURL(buildWhatsAppUrl(c.whatsapp ?? c.phone, '')).catch(() => undefined)} />
            </View>
            <Button label={t('ad.company.delete')} variant="danger" size="sm" leftIcon="trash-2" loading={deleteCompany.isPending} onPress={() => deleteRef.current?.open()} style={{ alignSelf: 'flex-start' }} />
            {!c.isActive && !completion.complete ? (
              <Text variant="caption" muted>
                {t('cw.profile.activeHint')}
              </Text>
            ) : null}
          </View>
        </Card>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: t('ad.company.tabs.overview') },
            { value: 'services', label: t('ad.company.tabs.services'), count: (services.data?.length ?? 0) + (products.data?.length ?? 0) },
            { value: 'staff', label: t('ad.company.tabs.staff'), count: staff.data?.length },
            { value: 'bookings', label: t('ad.company.tabs.bookings') },
            { value: 'reviews', label: t('ad.company.tabs.reviews'), count: reviews.data?.length },
          ]}
        />
        {tab === 'overview' ? (
          <>
            <Card style={{ gap: 10 }}>
              <Text variant="title" weight="bold">
                {t('ad.company.info')}
              </Text>
              {info.map(([label, value]) => (
                <InfoRow key={label} label={label} value={value} />
              ))}
            </Card>
            <Card style={{ gap: 10 }}>
              <Text variant="title" weight="bold">
                {t('ad.company.contact')}
              </Text>
              {contact.map(([label, value]) => (
                <InfoRow key={label} label={label} value={value} />
              ))}
              <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md, padding: 12 }]}>
                <IconBubble name="user" size={40} iconSize={18} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" muted>
                    {t('ad.company.owner')}
                  </Text>
                  <Text variant="bodySm" weight="semibold" numeric>
                    {formatPhone(c.ownerPhone)}
                    {c.ownerEmail ? ` · ${c.ownerEmail}` : ''}
                  </Text>
                  <Text variant="caption" muted>
                    {t('ad.company.ownerLogin')}
                  </Text>
                  {c.ownerEmail ? (
                    <Button label={t('ad.company.resendInvite')} variant="soft" size="sm" leftIcon="mail" loading={resendInvite.isPending} onPress={() => resendRef.current?.open()} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
                  ) : null}
                </View>
              </View>
            </Card>
            <Card style={{ gap: 10 }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text variant="title" weight="bold">
                  {t('ad.company.completion')}
                </Text>
                <Text variant="caption" weight="bold" numeric color={colors.gold}>
                  {completion.done}/{completion.total}
                </Text>
              </View>
              <ProgressBar value={completion.done / completion.total} color={colors.gold} />
              <View style={styles.chips}>
                {completionKeys.map((k) => (
                  <Tag key={k} label={t(`cw.completion.${k}` as TKey)} tone={c.completion[k] ? 'success' : 'neutral'} appearance="tint" icon={c.completion[k] ? 'circle-check' : 'circle-alert'} />
                ))}
              </View>
            </Card>
            <Card style={{ gap: spacing.md }}>
              <Text variant="title" weight="bold">
                {t('ad.company.performance')}
              </Text>
              {row ? (
                <>
                  <View style={styles.grid}>
                    <KpiCard label={t('ad.performance.bookings')} value={formatNumber(row.bookings)} icon="calendar-check" style={styles.half} />
                    <KpiCard label={t('ad.performance.revenue')} value={formatMoney(row.revenue, { compact: true })} icon="trending-up" style={styles.half} />
                    <KpiCard label={t('ad.performance.rating')} value={row.ratingAvg.toFixed(1)} icon="star" suffix={t('company.reviewsCount', { count: row.ratingCount })} style={styles.half} />
                    <KpiCard label={t('ad.performance.subs')} value={formatNumber(row.activeSubscriptions)} icon="repeat" style={styles.half} />
                  </View>
                  <AreaChart data={row.trend} height={160} />
                  {row.topServices.map((s, i) => (
                    <InfoRow key={`${s.name.ar}-${i}`} label={`${i + 1}. ${localized(s.name)}`} value={String(s.count)} />
                  ))}
                </>
              ) : (
                <Text variant="bodySm" muted>
                  {perf.isLoading ? t('common.loading') : t('ad.company.noPerformance')}
                </Text>
              )}
            </Card>
          </>
        ) : null}
        {tab === 'services' ? (
          <>
            <Card style={{ gap: spacing.sm }}>
              <Text variant="title" weight="bold">
                {t('cw.catalog.services')}
              </Text>
              {(services.data ?? []).map((s) => (
                <ServiceRow key={s.id} service={s} compact />
              ))}
              {!services.data?.length ? (
                <Text variant="bodySm" muted>
                  {t('cw.catalog.emptyServices')}
                </Text>
              ) : null}
            </Card>
            <Card style={{ gap: spacing.sm }}>
              <Text variant="title" weight="bold">
                {t('cw.catalog.products')}
              </Text>
              {(products.data ?? []).map((p) => (
                <View key={p.id} style={[styles.row, { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                  <View style={[styles.thumb, { backgroundColor: colors.surfaceAlt, borderRadius: radii.sm }]}>{p.imageUrls[0] ? <Image source={{ uri: p.imageUrls[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="package" size={18} color={colors.faint} />}</View>
                  <Text variant="bodySm" weight="semibold" style={{ flex: 1 }} lines={1}>
                    {localized(p.name)}
                  </Text>
                  <PriceTag price={p.price} offerPrice={p.offerPrice} align="end" />
                </View>
              ))}
              {!products.data?.length ? (
                <Text variant="bodySm" muted>
                  {t('cw.catalog.emptyProducts')}
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}
        {tab === 'staff' ? (
          <View style={{ gap: spacing.sm }}>
            {(staff.data ?? []).map((s) => (
              <StaffCard key={s.id} staff={s} compact />
            ))}
            {!staff.data?.length ? <EmptyState icon="users" title={t('cw.staff.empty')} compact /> : null}
          </View>
        ) : null}
        {tab === 'bookings' ? (
          <>
            <View style={{ marginHorizontal: -spacing.gutter }}>
              <DateStrip value={date} onChange={setDate} days={17} startOffset={-3} />
            </View>
            <Text variant="caption" muted numeric>
              {t('ad.bookings.summary', { count: bookings.length, revenue: formatMoney(bookings.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.total, 0)) })}
            </Text>
            {bookings.map((b) => (
              <CompanyBookingRow key={b.id} booking={b} onPress={(x) => router.push(`/(admin)/booking/${x.id}` as never)} />
            ))}
            {!bookings.length && !dayBookings.isLoading ? <EmptyState icon="calendar-check" title={t('ad.bookings.empty')} compact /> : null}
          </>
        ) : null}
        {tab === 'reviews' ? (
          <>
            <Card>
              <RatingSummary avg={c.ratingAvg} count={c.ratingCount} distribution={dist} basedOnLabel={t('cw.reviews.basedOn', { count: c.ratingCount })} />
            </Card>
            <Card>
              {(reviews.data ?? []).map((r) => (
                <ReviewCard key={r.id} review={r} yourReplyLabel={t('cw.reviews.yourReply')} />
              ))}
              {!reviews.data?.length ? (
                <Text variant="bodySm" muted align="center">
                  {t('cw.reviews.empty')}
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}
      </View>
      <BottomSheet ref={deleteRef}>
        <ConfirmContent
          title={t('ad.company.deleteTitle')}
          body={t('ad.company.deleteBody')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onCancel={() => deleteRef.current?.close()}
          onConfirm={async () => {
            deleteRef.current?.close();
            try {
              await deleteCompany.mutateAsync(c.id);
              toast.success(t('ad.company.deleted'));
              router.replace('/(admin)/(tabs)/companies' as never);
            } catch {
              toast.error(t('common.error'));
            }
          }}
        />
      </BottomSheet>
      <BottomSheet ref={resendRef}>
        <ConfirmContent
          title={t('ad.company.resendInviteTitle')}
          body={t('ad.company.resendInviteBody', { email: c.ownerEmail ?? '' })}
          confirmLabel={t('ad.company.resendInvite')}
          cancelLabel={t('common.cancel')}
          onCancel={() => resendRef.current?.close()}
          onConfirm={async () => {
            resendRef.current?.close();
            try {
              const res = await resendInvite.mutateAsync(c.id);
              toast.success(t('ad.company.invitationSent', { email: res.email }));
            } catch (e) {
              const msg = e instanceof Error ? e.message : '';
              toast.error(msg === 'NO_EMAIL' ? t('ad.company.noEmail') : msg === 'EMAIL_EXISTS' ? t('ad.form.emailExists') : t('common.error'));
            }
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { width: '47.5%', flexGrow: 0, flexShrink: 0, flexBasis: '47.5%' }, // explicit components: CSS `flex: 0` would mean basis 0% on web, `flex: undefined` does not override on web
  thumb: { width: 44, height: 44, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
