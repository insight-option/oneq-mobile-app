import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Avatar, Card, Chip, EmptyState, FAB, Icon, Input, RatingPill, SegmentedControl, SkeletonList, StatusPill, Text } from '@/components/ui';
import { useAdminCategories, useAdminCompanies } from '@/data/hooks';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { AdminHeader, adminCompanyStatus } from '../shell/AdminShell';

type Status = 'all' | 'active' | 'inactive' | 'pending';

export const AdminCompanyRow = ({ company: c, categoryName, onPress }: { company: Company; categoryName?: string; onPress: (c: Company) => void }) => {
  const { t, localized, areaName } = useI18n();
  const { colors, spacing } = useTheme();
  const st = adminCompanyStatus(c);
  return (
    <Card padding={spacing.md} onPress={() => onPress(c)} style={styles.row}>
      <Avatar uri={c.logoUrl} name={localized(c.name)} size={52} rounded="squircle" dark />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="title" weight="bold" lines={1}>
          {localized(c.name)}
        </Text>
        <Text variant="caption" muted lines={1}>
          {[categoryName, areaName(c.area)].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.chips}>
          <StatusPill status={st.tone} label={t(st.key)} />
          {c.ratingCount ? <RatingPill value={c.ratingAvg} count={c.ratingCount} /> : null}
          <Text variant="caption" muted numeric>
            {c.bookingCount} {t('ad.performance.bookings')}
          </Text>
        </View>
      </View>
      <Icon name="chevron-left" size={18} color={colors.faint} />
    </Card>
  );
};

export const AdminCompaniesScreen = () => {
  const router = useRouter();
  const { t, localized } = useI18n();
  const { colors, spacing } = useTheme();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('all');
  const categories = useAdminCategories();
  const companies = useAdminCompanies({ query: query.trim() || undefined, categoryId: categoryId ?? undefined, status: status === 'all' ? undefined : status });
  const catName = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, localized(c.name)] as const)), [categories.data, localized]);

  const header = (
    <View style={{ padding: spacing.gutter, gap: spacing.md }}>
      <View>
        <Text variant="h1">{t('ad.companies.title')}</Text>
        <Text variant="bodySm" muted>
          {t('ad.companies.subtitle', { count: companies.data?.length ?? 0 })}
        </Text>
      </View>
      <Input value={query} onChangeText={setQuery} placeholder={t('ad.companies.search')} leftIcon="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('common.all')} selected={!categoryId} onPress={() => setCategoryId(null)} variant="outline" />
        {(categories.data ?? []).map((c) => (
          <Chip key={c.id} label={localized(c.name)} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} variant="outline" />
        ))}
      </ScrollView>
      <SegmentedControl
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: t('ad.companies.status.all') },
          { value: 'active', label: t('ad.companies.status.active') },
          { value: 'inactive', label: t('ad.companies.status.inactive') },
          { value: 'pending', label: t('ad.companies.status.pending') },
        ]}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AdminHeader />
      <FlashList<Company>
        data={companies.data ?? []}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }}>
            <AdminCompanyRow company={item} categoryName={catName.get(item.categoryId)} onPress={(c) => router.push(`/(admin)/company/${c.id}` as never)} />
          </View>
        )}
        ListEmptyComponent={companies.isLoading ? <SkeletonList rows={4} /> : <EmptyState icon="building-2" title={t('ad.companies.empty')} actionLabel={t('ad.companies.create')} onAction={() => router.push('/(admin)/company/new' as never)} />}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <FAB label={t('ad.companies.create')} bottomOffset={64} onPress={() => router.push('/(admin)/company/new' as never)} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
