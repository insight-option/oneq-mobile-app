import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Chip, EmptyState, Icon, IconButton, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { CompanyListRow } from '@/components/shared';
import { useSearch } from '@/data/hooks';
import { useI18n, type TKey } from '@/i18n';
import { WEB_INPUT_RESET } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { resolveFont } from '@/theme/typography';
import { useLocaleStore } from '@/store/locale';
import { useCompanyActions } from '../catalog/useCatalogHelpers';

const RECENT_KEY = 'oneq.search.recent';
const POPULAR: TKey[] = ['search.chip.dental', 'search.chip.gyms', 'search.chip.salons', 'search.chip.cleaning', 'search.chip.eyes', 'search.chip.massage'];

export const SearchScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, localized } = useI18n();
  const lang = useLocaleStore((s) => s.lang);
  const { colors, spacing, radii } = useTheme();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const results = useSearch(query);
  const actions = useCompanyActions();

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((v) => v && setRecent(JSON.parse(v) as string[])).catch(() => undefined);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  const commit = useCallback(
    (q: string) => {
      setInput(q);
      setQuery(q);
      const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
      setRecent(next);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => undefined);
    },
    [recent],
  );

  const hasQuery = query.length >= 2;
  const r = results.data;
  const total = r ? r.companies.length + r.services.length + r.staff.length + r.subcategories.length : 0;

  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas} keyboard>
      <View style={[styles.top, { paddingTop: insets.top + 8, paddingHorizontal: spacing.gutter, borderBottomColor: colors.line }]}>
        <View style={styles.titleRow}>
          <Text variant="h1" style={{ flex: 1 }}>
            {t('search.title')}
          </Text>
          <IconButton name="x" variant="soft" onPress={() => router.back()} />
        </View>
        <View style={[styles.field, { backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, borderColor: colors.line }]}>
          <Icon name="search" size={20} color={colors.faint} />
          <TextInput ref={inputRef} value={input} onChangeText={setInput} placeholder={t('search.placeholder')} placeholderTextColor={colors.faint} autoFocus returnKeyType="search" onSubmitEditing={() => input.trim() && commit(input.trim())} style={[styles.input, WEB_INPUT_RESET, { color: colors.ink, fontFamily: resolveFont(lang, 'regular') }]} allowFontScaling={false} />
          {input ? (
            <Pressable onPress={() => setInput('')} hitSlop={8}>
              <Icon name="circle-x" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.huge }} showsVerticalScrollIndicator={false}>
        {!hasQuery ? (
          <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
            {recent.length ? (
              <View>
                <SectionHeader title={t('search.recent')} actionLabel={t('search.clearRecent')} onAction={() => { setRecent([]); AsyncStorage.removeItem(RECENT_KEY).catch(() => undefined); }} />
                <View style={[styles.wrap, { paddingHorizontal: spacing.gutter }]}>
                  {recent.map((q) => (
                    <Chip key={q} label={q} icon="clock" variant="outline" onPress={() => commit(q)} />
                  ))}
                </View>
              </View>
            ) : null}
            <View>
              <SectionHeader title={t('search.popular')} />
              <View style={[styles.wrap, { paddingHorizontal: spacing.gutter }]}>
                {POPULAR.map((k) => (
                  <Chip key={k} label={t(k)} onPress={() => commit(t(k))} />
                ))}
              </View>
            </View>
          </View>
        ) : results.isLoading ? (
          <View style={{ padding: spacing.gutter, gap: spacing.md }}>
            <Skeleton height={64} radius={radii.md} />
            <Skeleton height={64} radius={radii.md} />
            <Skeleton height={64} radius={radii.md} />
          </View>
        ) : total === 0 ? (
          <EmptyState title={t('search.noResults')} body={t('search.tryOther')} />
        ) : (
          <View style={{ paddingTop: spacing.md, gap: spacing.xl }}>
            {r?.subcategories.length ? (
              <View>
                <SectionHeader title={t('search.specialties')} />
                <View style={[styles.wrap, { paddingHorizontal: spacing.gutter }]}>
                  {r.subcategories.map((s) => (
                    <Chip key={s.id} label={`${localized(s.name)} · ${localized(s.category.name)}`} icon="tag" variant="outline" onPress={() => router.push({ pathname: '/(customer)/category/[id]', params: { id: s.categoryId, sub: s.id } } as never)} />
                  ))}
                </View>
              </View>
            ) : null}
            {r?.companies.length ? (
              <View>
                <SectionHeader title={`${t('search.companies')} (${r.companies.length})`} />
                <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}>
                  {r.companies.map((c) => (
                    <CompanyListRow key={c.id} company={c} subcategoryLabel={actions.subcategoryLabel(c)} onPress={actions.openCompany} />
                  ))}
                </View>
              </View>
            ) : null}
            {r?.services.length ? (
              <View>
                <SectionHeader title={`${t('search.services')} (${r.services.length})`} />
                <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}>
                  {r.services.map((s) => (
                    <Pressable key={s.id} onPress={() => router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: s.companyId, serviceId: s.id } } as never)} style={[styles.row, { backgroundColor: colors.surface, borderRadius: radii.md }]}>
                      <Avatar uri={s.company.logoUrl} name={localized(s.company.name)} size={44} rounded="squircle" />
                      <View style={{ flex: 1 }}>
                        <Text variant="title" weight="semibold" lines={1}>
                          {localized(s.name)}
                        </Text>
                        <Text variant="caption" muted lines={1}>
                          {localized(s.company.name)}
                        </Text>
                      </View>
                      <Text variant="bodySm" numeric weight="bold" color={colors.primary}>
                        {s.offerPrice ?? s.price}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {r?.staff.length ? (
              <View>
                <SectionHeader title={`${t('search.staff')} (${r.staff.length})`} />
                <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}>
                  {r.staff.map((s) => (
                    <Pressable key={s.id} onPress={() => router.push(`/(customer)/staff/${s.id}` as never)} style={[styles.row, { backgroundColor: colors.surface, borderRadius: radii.md }]}>
                      <Avatar uri={s.photoUrl} name={localized(s.name)} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text variant="title" weight="semibold" lines={1}>
                          {localized(s.name)}
                        </Text>
                        <Text variant="caption" muted lines={1}>
                          {t(`staffTitle.${s.title}` as 'staffTitle.doctor')} · {localized(s.company.name)}
                        </Text>
                      </View>
                      <Icon name="chevron-left" size={18} color={colors.faint} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { paddingBottom: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
});
