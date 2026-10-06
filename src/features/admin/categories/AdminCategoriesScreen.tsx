import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet, Button, Card, CategoryGlyph, CATEGORY_ICON_CHOICES, ConfirmContent, EmptyState, FAB, Header, Icon, Input, isIconName, Screen, Select, Skeleton, SkeletonList, Switch, Tag, Text, TextArea, toast, type BottomSheetRef, type IconName } from '@/components/ui';
import { repo } from '@/data';
import { useAdminCategories, useAdminDeleteCategory, useAdminUpsertCategory } from '@/data/hooks';
import type { Category } from '@/domain/types';
import { useI18n } from '@/i18n';
import { id as makeId } from '@/lib/ids';
import { slugify } from '@/lib/text';
import { useTheme } from '@/theme/ThemeProvider';
import { AdminHeader } from '../shell/AdminShell';

const COLORS = ['#5A0020', '#2563EB', '#FF6B35', '#E84393', '#0EA5E9', '#16A34A', '#9A4516', '#7C3AED', '#DC2626', '#0F766E', '#D97706', '#1F2937'];
const iconOf = (name: string): IconName => (isIconName(name) ? name : 'tags');

/* ---------- List ---------- */
export const AdminCategoriesScreen = () => {
  const router = useRouter();
  const { t, localized } = useI18n();
  const { colors, spacing } = useTheme();
  const categories = useAdminCategories();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AdminHeader />
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, gap: spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View>
          <Text variant="h1">{t('ad.categories.title')}</Text>
          <Text variant="bodySm" muted>
            {t('ad.categories.subtitle')}
          </Text>
        </View>
        {categories.isLoading ? <SkeletonList rows={4} /> : null}
        {(categories.data ?? []).map((c) => (
          <Card key={c.id} padding={spacing.md} onPress={() => router.push(`/(admin)/category/${c.id}` as never)} style={styles.row}>
            <CategoryGlyph name={iconOf(c.icon)} size={48} color={c.color} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.row}>
                <Text variant="title" weight="bold" lines={1} style={{ flex: 1 }}>
                  {localized(c.name)}
                </Text>
                {!c.isActive ? <Tag label={t('common.inactive')} tone="neutral" appearance="tint" /> : null}
                {c.requiresAudience ? <Tag label={t('ad.categories.form.audience')} tone="info" appearance="tint" size="sm" /> : null}
              </View>
              <Text variant="caption" muted>
                {t('ad.categories.subs', { count: c.subcategories.length })} · {t('ad.categories.companies', { count: c.companyCount ?? 0 })}
              </Text>
            </View>
            <Text variant="caption" muted numeric>
              #{c.sortOrder}
            </Text>
            <Icon name="chevron-left" size={18} color={colors.faint} />
          </Card>
        ))}
        {!categories.isLoading && !categories.data?.length ? <EmptyState icon="tags" title={t('common.noResults')} actionLabel={t('ad.categories.create')} onAction={() => router.push('/(admin)/category/new' as never)} /> : null}
      </ScrollView>
      <FAB label={t('ad.categories.create')} bottomOffset={64} onPress={() => router.push('/(admin)/category/new' as never)} />
    </View>
  );
};

/* ---------- Form ---------- */
type SubDraft = { key: string; id?: string; nameAr: string; nameEn: string; icon: IconName };
type CatForm = { nameAr: string; nameEn: string; slug: string; slugTouched: boolean; descAr: string; descEn: string; icon: IconName; color: string; imageUrl: string | null; requiresAudience: boolean; sortOrder: string; isActive: boolean; subs: SubDraft[] };

const fromCategory = (c: Category | null, count: number): CatForm =>
  c
    ? {
        nameAr: c.name.ar,
        nameEn: c.name.en,
        slug: c.slug,
        slugTouched: true,
        descAr: c.description.ar,
        descEn: c.description.en,
        icon: iconOf(c.icon),
        color: c.color,
        imageUrl: c.imageUrl ?? null,
        requiresAudience: Boolean(c.requiresAudience),
        sortOrder: String(c.sortOrder),
        isActive: c.isActive,
        subs: c.subcategories.map((s) => ({ key: s.id, id: s.id, nameAr: s.name.ar, nameEn: s.name.en, icon: iconOf(s.icon) })),
      }
    : { nameAr: '', nameEn: '', slug: '', slugTouched: false, descAr: '', descEn: '', icon: 'sparkles', color: COLORS[0], imageUrl: null, requiresAudience: false, sortOrder: String(count + 1), isActive: true, subs: [] };

export const AdminCategoryForm = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const categories = useAdminCategories();
  const existing = categories.data?.find((c) => c.id === id) ?? null;
  if (categories.isLoading) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={isNew ? t('ad.categories.form.new') : t('ad.categories.form.edit')} variant="workspace" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={300} radius={radii.card} />
        </View>
      </Screen>
    );
  }
  return <AdminCategoryFormBody key={existing?.id ?? 'new'} isNew={isNew} existing={existing} count={categories.data?.length ?? 0} />;
};

const AdminCategoryFormBody = ({ isNew, existing, count }: { isNew: boolean; existing: Category | null; count: number }) => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const upsert = useAdminUpsertCategory();
  const del = useAdminDeleteCategory();
  const delRef = useRef<BottomSheetRef>(null);
  const [form, setForm] = useState<CatForm>(() => fromCategory(existing, count));
  const patch = (p: Partial<CatForm>) => setForm((f) => ({ ...f, ...p }));
  const patchSub = (key: string, p: Partial<SubDraft>) => setForm((f) => ({ ...f, subs: f.subs.map((s) => (s.key === key ? { ...s, ...p } : s)) }));
  const iconOptions = CATEGORY_ICON_CHOICES.map((i) => ({ value: i, label: i, icon: i }));

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [16, 9] });
    if (res.canceled || !res.assets[0]) return;
    const url = await repo.profile.uploadImage(res.assets[0].uri, 'company');
    patch({ imageUrl: url });
  };

  const save = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      toast.error(t('ad.categories.form.invalid'));
      return;
    }
    try {
      await upsert.mutateAsync({
        id: isNew ? undefined : existing?.id,
        slug: form.slug.trim() || slugify(form.nameEn),
        name: { ar: form.nameAr.trim(), en: form.nameEn.trim() },
        description: { ar: form.descAr.trim(), en: form.descEn.trim() || form.descAr.trim() },
        icon: form.icon,
        color: form.color,
        imageUrl: form.imageUrl,
        sortOrder: Number(form.sortOrder) || count + 1,
        isActive: form.isActive,
        requiresAudience: form.requiresAudience,
        subcategories: form.subs
          .filter((s) => s.nameAr.trim())
          .map((s, i) => ({ id: s.id, slug: slugify(s.nameEn || s.nameAr) || `sub-${i + 1}`, name: { ar: s.nameAr.trim(), en: s.nameEn.trim() || s.nameAr.trim() }, icon: s.icon, sortOrder: i + 1 })),
      });
      toast.success(t('ad.categories.form.saved'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const remove = async () => {
    if (!existing) return;
    try {
      await del.mutateAsync(existing.id);
      toast.success(t('ad.categories.deleted'));
      router.back();
    } catch (e) {
      toast.error(e instanceof Error && e.message === 'CATEGORY_HAS_COMPANIES' ? t('ad.categories.form.deleteBlocked', { count: existing.companyCount ?? 0 }) : t('common.error'));
    }
  };

  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={isNew ? t('ad.categories.form.new') : t('ad.categories.form.edit')} variant="workspace" compact right={!isNew ? <Button label={t('common.delete')} size="sm" variant="danger" onPress={() => delRef.current?.open()} /> : undefined} />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Pressable onPress={pickImage} style={[styles.imagePick, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md, borderColor: colors.lineStrong }]}>
            {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={[styles.preview, { backgroundColor: form.color }]}>
              <Icon name={form.icon} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.imageLabel}>
              <Icon name="image-plus" size={16} color="#FFFFFF" />
              <Text variant="caption" weight="semibold" color="#FFFFFF">
                {t('ad.categories.form.image')}
              </Text>
            </View>
          </Pressable>
          <Input label={t('ad.categories.form.nameAr')} value={form.nameAr} onChangeText={(v) => patch({ nameAr: v })} />
          <Input label={t('ad.categories.form.nameEn')} value={form.nameEn} onChangeText={(v) => patch({ nameEn: v, slug: form.slugTouched ? form.slug : slugify(v) })} ltr />
          <Input label={t('ad.categories.form.slug')} value={form.slug} onChangeText={(v) => patch({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, ''), slugTouched: true })} ltr />
          <TextArea label={t('ad.categories.form.descAr')} value={form.descAr} onChangeText={(v) => patch({ descAr: v })} />
          <TextArea label={t('ad.categories.form.descEn')} value={form.descEn} onChangeText={(v) => patch({ descEn: v })} ltr />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodySm" weight="semibold">
            {t('ad.categories.form.icon')}
          </Text>
          <View style={styles.wrap}>
            {CATEGORY_ICON_CHOICES.map((i) => (
              <Pressable key={i} onPress={() => patch({ icon: i })} style={[styles.iconCell, { borderRadius: radii.md, backgroundColor: form.icon === i ? colors.primary : colors.surfaceAlt, borderColor: form.icon === i ? colors.primary : colors.line }]}>
                <Icon name={i} size={20} color={form.icon === i ? colors.onPrimary : colors.ink} />
              </Pressable>
            ))}
          </View>
          <Text variant="bodySm" weight="semibold">
            {t('ad.categories.form.color')}
          </Text>
          <View style={styles.wrap}>
            {COLORS.map((c) => (
              <Pressable key={c} onPress={() => patch({ color: c })} style={[styles.swatch, { backgroundColor: c, borderColor: form.color === c ? colors.ink : 'transparent' }]}>
                {form.color === c ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
              </Pressable>
            ))}
          </View>
          <Input label={t('ad.categories.form.sortOrder')} value={form.sortOrder} onChangeText={(v) => patch({ sortOrder: v.replace(/\D/g, '') })} keyboardType="number-pad" numeric ltr />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" weight="semibold" style={{ flex: 1 }}>
              {t('ad.categories.form.audience')}
            </Text>
            <Switch value={form.requiresAudience} onValueChange={(v) => patch({ requiresAudience: v })} />
          </View>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" weight="semibold">
              {t('ad.categories.form.active')}
            </Text>
            <Switch value={form.isActive} onValueChange={(v) => patch({ isActive: v })} />
          </View>
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title" weight="bold">
            {t('ad.categories.form.subcategories')}
          </Text>
          {form.subs.map((s) => (
            <View key={s.key} style={[styles.sub, { borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.row}>
                <Input label={t('ad.categories.form.subNameAr')} value={s.nameAr} onChangeText={(v) => patchSub(s.key, { nameAr: v })} containerStyle={{ flex: 1 }} />
                <Pressable onPress={() => patch({ subs: form.subs.filter((x) => x.key !== s.key) })} hitSlop={8} style={{ paddingTop: 26 }}>
                  <Icon name="trash-2" size={20} color={colors.danger} />
                </Pressable>
              </View>
              <Input label={t('ad.categories.form.subNameEn')} value={s.nameEn} onChangeText={(v) => patchSub(s.key, { nameEn: v })} ltr />
              <Select label={t('ad.categories.form.subIcon')} value={s.icon} onChange={(v) => patchSub(s.key, { icon: v })} options={iconOptions} compact />
            </View>
          ))}
          <Button label={t('ad.categories.form.addSub')} variant="soft" leftIcon="plus" onPress={() => patch({ subs: [...form.subs, { key: makeId('tmp'), nameAr: '', nameEn: '', icon: 'sparkles' }] })} />
        </Card>
        <Button label={t('common.save')} size="lg" fullWidth loading={upsert.isPending} onPress={save} />
      </View>
      <BottomSheet ref={delRef}>
        <ConfirmContent
          title={t('ad.categories.form.deleteConfirm')}
          body={t('common.cannotUndo')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onCancel={() => delRef.current?.close()}
          onConfirm={() => {
            delRef.current?.close();
            void remove();
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imagePick: { height: 140, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  preview: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  imageLabel: { position: 'absolute', bottom: 10, end: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(42,0,15,0.7)', paddingHorizontal: 12, height: 30, borderRadius: 15 },
  iconCell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  sub: { padding: 12, borderWidth: 1, gap: 10 },
});
