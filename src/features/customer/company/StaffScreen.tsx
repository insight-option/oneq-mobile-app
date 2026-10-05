import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Chip, EmptyState, Icon, IconButton, RatingPill, SectionHeader, Skeleton, Tag, Text } from '@/components/ui';
import { RatingSummary, ReviewCard } from '@/components/shared';
import { useCompany, useStaffMember, useStaffReviews } from '@/data/hooks';
import type { Weekday } from '@/domain/types';
import { useI18n, WEEK_ORDER } from '@/i18n';
import { requireAuth } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

export const StaffScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, localized, formatTime, weekdayName, formatMoney } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const staff = useStaffMember(id);
  const company = useCompany(staff.data?.companyId);
  const reviews = useStaffReviews(id);
  const s = staff.data;
  const today = new Date().getDay() as Weekday;
  const distribution = useMemo(() => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    (reviews.data ?? []).forEach((r) => (d[r.rating] += 1));
    return d;
  }, [reviews.data]);

  if (staff.isLoading || !s) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, padding: spacing.gutter, paddingTop: insets.top + 60, gap: spacing.md }}>
        <Skeleton circle height={120} style={{ alignSelf: 'center' }} />
        <Skeleton height={24} width="50%" style={{ alignSelf: 'center' }} />
        {!staff.isLoading ? <EmptyState title={t('staff.notFound')} actionLabel={t('common.back')} onAction={() => router.back()} /> : null}
      </View>
    );
  }
  const availableToday = s.isAvailable && s.availability[today]?.available;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: 300, backgroundColor: colors.primaryDeep }}>
          {s.photoUrl ? <Image source={{ uri: s.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" /> : null}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(42,0,15,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={[styles.top, { top: insets.top + 8 }]}>
            <IconButton name="arrow-right" variant="glass" onPress={() => router.back()} />
          </View>
          <View style={styles.heroText}>
            <Tag label={t(`staffTitle.${s.title}` as 'staffTitle.doctor')} tone="light" />
            <Text variant="h1" color="#FFFFFF">
              {localized(s.name)}
            </Text>
            <View style={styles.row}>
              <RatingPill value={s.ratingAvg} count={s.ratingCount} light />
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                {t('staff.experience', { years: s.experienceYears })}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
          {company.data ? (
            <Card padding={spacing.md} onPress={() => router.push(`/(customer)/company/${company.data?.id}` as never)} style={styles.companyRow}>
              <Avatar uri={company.data.logoUrl} name={localized(company.data.name)} size={44} rounded="squircle" />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold" lines={1}>
                  {localized(company.data.name)}
                </Text>
                <Text variant="caption" muted>
                  {t('company.staffCount', { count: company.data.staffCount })}
                </Text>
              </View>
              <Icon name="chevron-left" size={18} color={colors.faint} />
            </Card>
          ) : null}
          <View style={styles.statRow}>
            <Card style={styles.stat} padding={spacing.md}>
              <Text variant="caption" muted>
                {t('staff.experienceLabel')}
              </Text>
              <Text variant="h3" numeric>
                {s.experienceYears}
              </Text>
            </Card>
            <Card style={styles.stat} padding={spacing.md}>
              <Text variant="caption" muted>
                {t('company.ratingTitle')}
              </Text>
              <Text variant="h3" numeric>
                {s.ratingAvg.toFixed(1)}
              </Text>
            </Card>
            {typeof s.pricePerSession === 'number' ? (
              <Card style={styles.stat} padding={spacing.md}>
                <Text variant="caption" muted>
                  {t('common.price')}
                </Text>
                <Text variant="h3" numeric color={colors.primary}>
                  {formatMoney(s.pricePerSession, { withoutCurrency: true })}
                </Text>
              </Card>
            ) : null}
          </View>
          {s.bio ? (
            <View>
              <SectionHeader title={t('staff.about')} style={{ paddingHorizontal: 0 }} />
              <Card>
                <Text variant="body">{localized(s.bio)}</Text>
              </Card>
            </View>
          ) : null}
          <View>
            <SectionHeader title={t('staff.specialties')} style={{ paddingHorizontal: 0 }} />
            <View style={styles.wrap}>
              {s.specialties.map((sp, i) => (
                <Chip key={i} label={localized(sp)} icon="sparkles" />
              ))}
            </View>
          </View>
          <View>
            <SectionHeader title={t('staff.availability')} subtitle={availableToday ? t('staff.availableToday') : t('staff.unavailableToday')} style={{ paddingHorizontal: 0 }} />
            <View style={styles.wrap}>
              {WEEK_ORDER.map((d) => {
                const a = s.availability[d];
                const on = s.isAvailable && a?.available;
                return (
                  <View key={d} style={[styles.day, { backgroundColor: on ? colors.primary : colors.surfaceAlt, borderRadius: radii.md, borderWidth: d === today ? 2 : 0, borderColor: colors.gold }, on ? shadows.card : null]}>
                    <Text variant="caption" weight="bold" color={on ? '#FFFFFF' : colors.faint}>
                      {weekdayName(d, true)}
                    </Text>
                    <Text variant="caption" numeric color={on ? 'rgba(255,255,255,0.85)' : colors.faint} style={{ fontSize: 10 }}>
                      {on ? `${formatTime(a.from)}` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View>
            <SectionHeader title={t('staff.reviews')} subtitle={t('company.reviewsCount', { count: s.ratingCount })} style={{ paddingHorizontal: 0 }} />
            <Card>
              {s.ratingCount > 0 ? <RatingSummary avg={s.ratingAvg} count={s.ratingCount} distribution={distribution} basedOnLabel={t('company.ratingBasedOn', { count: s.ratingCount })} /> : null}
              {(reviews.data ?? []).map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
              {!reviews.data?.length && !reviews.isLoading ? (
                <Text variant="bodySm" muted align="center" style={{ paddingVertical: 12 }}>
                  {t('company.noReviews')}
                </Text>
              ) : null}
            </Card>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.sticky, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.line }, shadows.elevated]}>
        <Button
          label={t('staff.bookWith', { name: localized(s.name).split(' ')[0] })}
          size="lg"
          fullWidth
          leftIcon="calendar-check"
          onPress={async () => {
            if (!(await requireAuth('book'))) return;
            router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: s.companyId, staffId: s.id } } as never);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  top: { position: 'absolute', start: 16 },
  heroText: { position: 'absolute', bottom: 20, start: 16, end: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { width: '12.5%', minWidth: 44, height: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
  sticky: { position: 'absolute', start: 0, end: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
