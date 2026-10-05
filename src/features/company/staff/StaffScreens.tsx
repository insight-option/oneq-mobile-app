import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Avatar, BottomSheet, Button, Card, Chip, ConfirmContent, EmptyState, FAB, Header, Input, RatingPill, Screen, Select, Skeleton, SkeletonList, StatusPill, Switch, Text, TextArea, toast, type BottomSheetRef } from '@/components/ui';
import { repo } from '@/data';
import { useDeleteStaff, useMyCompany, useStaff, useUpsertStaff } from '@/data/hooks';
import type { Staff, StaffTitle, Weekday, WeeklyAvailability } from '@/domain/types';
import { useI18n, WEEK_ORDER } from '@/i18n';
import { makeAvailability, minutesToTime } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import { CompanyHeader } from '../shell/CompanyShell';

const TITLES: StaffTitle[] = ['consultant', 'specialist', 'resident', 'doctor', 'trainer', 'stylist', 'employee', 'engineer', 'contractor'];
const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => minutesToTime(i * 30));

export const StaffListScreen = () => {
  const router = useRouter();
  const { t, localized, formatMoney } = useI18n();
  const { colors, spacing } = useTheme();
  const company = useMyCompany();
  const staff = useStaff(company.data?.id);
  const upsert = useUpsertStaff();
  const toggle = async (s: Staff) => {
    try {
      await upsert.mutateAsync({ ...s, isAvailable: !s.isAvailable });
      toast.success(s.isAvailable ? t('cw.staff.paused') : t('cw.staff.activated'));
    } catch {
      toast.error(t('common.error'));
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <CompanyHeader />
      <FlashList<Staff>
        data={staff.data ?? []}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={{ padding: spacing.gutter, gap: spacing.md }}>
            <Text variant="h1">{t('cw.staff.title')}</Text>
            <Text variant="bodySm" muted>
              {t('cw.staff.subtitle', { company: company.data ? localized(company.data.name) : '' })}
            </Text>
            <Button label={t('cw.staff.add')} leftIcon="user-plus" onPress={() => router.push('/(company)/staff/new' as never)} />
          </View>
        }
        renderItem={({ item: s }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }}>
            <Card padding={spacing.md} style={{ gap: spacing.sm }}>
              <View style={styles.row}>
                <Avatar uri={s.photoUrl} name={localized(s.name)} size={56} rounded="squircle" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="title" weight="bold" lines={1}>
                    {localized(s.name)}
                  </Text>
                  <Text variant="caption" muted>
                    {t(`staffTitle.${s.title}` as 'staffTitle.doctor')} · {s.specialties.map((x) => localized(x)).join('، ')}
                  </Text>
                  <View style={styles.row}>
                    <RatingPill value={s.ratingAvg} count={s.ratingCount} />
                    {typeof s.pricePerSession === 'number' ? (
                      <Text variant="caption" numeric weight="semibold">
                        {formatMoney(s.pricePerSession)} / {t('common.session')}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <StatusPill status={s.isAvailable ? 'active' : 'inactive'} label={s.isAvailable ? t('common.active') : t('cw.staff.pause')} />
              </View>
              <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: spacing.sm }]}>
                <Text variant="caption" muted>
                  {t('cw.staff.bookingsMonth')}: <Text variant="caption" numeric weight="bold">{s.bookingCount}</Text>
                </Text>
                <View style={styles.row}>
                  <Button label={t('common.edit')} size="sm" variant="outline" leftIcon="pencil" onPress={() => router.push(`/(company)/staff/${s.id}` as never)} />
                  <Button label={s.isAvailable ? t('cw.staff.pause') : t('cw.staff.activate')} size="sm" variant={s.isAvailable ? 'ghost' : 'soft'} leftIcon="power" onPress={() => toggle(s)} />
                </View>
              </View>
            </Card>
          </View>
        )}
        ListEmptyComponent={staff.isLoading ? <SkeletonList rows={3} /> : <EmptyState icon="users" title={t('cw.staff.empty')} body={t('cw.staff.emptyBody')} actionLabel={t('cw.staff.add')} onAction={() => router.push('/(company)/staff/new' as never)} />}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />
      <FAB icon="user-plus" bottomOffset={64} onPress={() => router.push('/(company)/staff/new' as never)} />
    </View>
  );
};

export const AvailabilityEditor = ({ value, onChange }: { value: WeeklyAvailability; onChange: (v: WeeklyAvailability) => void }) => {
  const { t, weekdayName } = useI18n();
  const { colors, radii } = useTheme();
  const update = (d: Weekday, patch: Partial<WeeklyAvailability[Weekday]>) => onChange({ ...value, [d]: { ...value[d], ...patch } });
  const copyAll = () => {
    const first = value[6];
    const next = { ...value } as WeeklyAvailability;
    WEEK_ORDER.forEach((d) => (next[d] = { ...first }));
    onChange(next);
  };
  const options = TIME_OPTIONS.map((tm) => ({ value: tm, label: tm }));
  return (
    <View style={{ gap: 8 }}>
      {WEEK_ORDER.map((d) => (
        <View key={d} style={[styles.dayRow, { backgroundColor: value[d].available ? colors.surface : colors.surfaceAlt, borderColor: colors.line, borderRadius: radii.md }]}>
          <Switch value={value[d].available} onValueChange={(v) => update(d, { available: v })} size="sm" />
          <Text variant="bodySm" weight="semibold" style={{ width: 62 }} lines={1}>
            {weekdayName(d)}
          </Text>
          {value[d].available ? (
            <View style={[styles.row, { flex: 1 }]}>
              <View style={{ flex: 1 }}>
                <Select value={value[d].from} onChange={(v) => update(d, { from: v })} options={options} compact />
              </View>
              <Text variant="caption" muted>
                {t('cw.hours.to')}
              </Text>
              <View style={{ flex: 1 }}>
                <Select value={value[d].to} onChange={(v) => update(d, { to: v })} options={options} compact />
              </View>
            </View>
          ) : (
            <Text variant="caption" muted style={{ flex: 1 }}>
              {t('staff.unavailable')}
            </Text>
          )}
        </View>
      ))}
      <Button label={t('cw.staff.form.copyAll')} variant="ghost" size="sm" leftIcon="copy" onPress={copyAll} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
};

export const StaffForm = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const company = useMyCompany();
  const staff = useStaff(company.data?.id);
  const existing = staff.data?.find((s) => s.id === id) ?? null;
  if (company.isLoading || (!isNew && staff.isLoading)) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('cw.staff.form.edit')} variant="workspace" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={300} radius={radii.card} />
        </View>
      </Screen>
    );
  }
  return <StaffFormBody key={existing?.id ?? 'new'} id={id} isNew={isNew} existing={existing} companyId={company.data?.id} />;
};

type StaffFormState = { nameAr: string; nameEn: string; title: StaffTitle; bioAr: string; photoUrl: string | null; years: string; specialties: string[]; newSpec: string; price: string; isAvailable: boolean; availability: WeeklyAvailability };
const initialStaffForm = (existing: Staff | null): StaffFormState =>
  existing
    ? { nameAr: existing.name.ar, nameEn: existing.name.en, title: existing.title, bioAr: existing.bio?.ar ?? '', photoUrl: existing.photoUrl ?? null, years: String(existing.experienceYears), specialties: existing.specialties.map((s) => s.ar), newSpec: '', price: existing.pricePerSession ? String(existing.pricePerSession) : '', isAvailable: existing.isAvailable, availability: existing.availability }
    : { nameAr: '', nameEn: '', title: 'employee', bioAr: '', photoUrl: null, years: '3', specialties: [], newSpec: '', price: '', isAvailable: true, availability: makeAvailability('10:00', '20:00', [5]) };

const StaffFormBody = ({ id, isNew, existing, companyId }: { id: string; isNew: boolean; existing: Staff | null; companyId: string | undefined }) => {
  const router = useRouter();
  const { t, localized } = useI18n();
  const { colors, spacing } = useTheme();
  const upsert = useUpsertStaff();
  const del = useDeleteStaff(companyId);
  const delRef = useRef<BottomSheetRef>(null);
  const [form, setForm] = useState<StaffFormState>(() => initialStaffForm(existing));

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const url = await repo.profile.uploadImage(res.assets[0].uri, 'staff');
    setForm((f) => ({ ...f, photoUrl: url }));
  };
  const save = async () => {
    if (!form.nameAr.trim()) {
      toast.error(t('cw.staff.form.invalid'));
      return;
    }
    try {
      await upsert.mutateAsync({
        id: isNew ? undefined : id,
        name: { ar: form.nameAr.trim(), en: form.nameEn.trim() || form.nameAr.trim() },
        title: form.title,
        bio: form.bioAr.trim() ? { ar: form.bioAr.trim(), en: form.bioAr.trim() } : null,
        photoUrl: form.photoUrl,
        experienceYears: Number(form.years) || 0,
        specialties: form.specialties.map((s) => ({ ar: s, en: s })),
        languages: existing?.languages ?? ['ar', 'en'],
        pricePerSession: form.price ? Number(form.price) : null,
        isAvailable: form.isAvailable,
        availability: form.availability,
        isActive: true,
      });
      toast.success(t('cw.staff.form.saved'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };
  const addSpecialty = () => {
    const v = form.newSpec.trim();
    if (!v) return;
    setForm((f) => ({ ...f, specialties: f.specialties.includes(v) ? f.specialties : [...f.specialties, v], newSpec: '' }));
  };

  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={isNew ? t('cw.staff.form.new') : t('cw.staff.form.edit')} variant="workspace" compact right={!isNew ? <Button label={t('common.delete')} size="sm" variant="danger" onPress={() => delRef.current?.open()} /> : undefined} />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Pressable onPress={pickPhoto} style={{ alignItems: 'center', gap: 6 }}>
            <Avatar uri={form.photoUrl} name={form.nameAr || 'S'} size={96} />
            <Text variant="caption" weight="semibold" color={colors.primary}>
              {t('cw.staff.form.photo')}
            </Text>
          </Pressable>
          <Input label={t('cw.staff.form.nameAr')} value={form.nameAr} onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))} leftIcon="user" />
          <Input label={t('cw.staff.form.nameEn')} value={form.nameEn} onChangeText={(v) => setForm((f) => ({ ...f, nameEn: v }))} ltr />
          <Select label={t('cw.staff.form.title')} value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} options={TITLES.map((x) => ({ value: x, label: t(`staffTitle.${x}` as 'staffTitle.doctor') }))} />
          <TextArea label={t('cw.staff.form.bio')} value={form.bioAr} onChangeText={(v) => setForm((f) => ({ ...f, bioAr: v }))} />
          <View style={styles.row}>
            <Input label={t('cw.staff.form.experience')} value={form.years} onChangeText={(v) => setForm((f) => ({ ...f, years: v.replace(/\D/g, '') }))} keyboardType="number-pad" numeric ltr containerStyle={{ flex: 1 }} />
            <Input label={t('cw.staff.form.price')} value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" numeric ltr containerStyle={{ flex: 1 }} />
          </View>
          <Text variant="bodySm" weight="semibold">
            {t('cw.staff.form.specialties')}
          </Text>
          <View style={styles.wrap}>
            {form.specialties.map((s) => (
              <Chip key={s} label={s} size="sm" icon="x" onPress={() => setForm((f) => ({ ...f, specialties: f.specialties.filter((x) => x !== s) }))} />
            ))}
          </View>
          <View style={styles.row}>
            <Input placeholder={t('cw.staff.form.addSpecialty')} value={form.newSpec} onChangeText={(v) => setForm((f) => ({ ...f, newSpec: v }))} containerStyle={{ flex: 1 }} onSubmitEditing={addSpecialty} />
            <Button label={t('common.add')} variant="soft" onPress={addSpecialty} />
          </View>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" weight="semibold">
              {t('cw.staff.form.available')}
            </Text>
            <Switch value={form.isAvailable} onValueChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))} />
          </View>
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title" weight="bold">
            {t('cw.staff.form.availability')}
          </Text>
          <AvailabilityEditor value={form.availability} onChange={(availability) => setForm((f) => ({ ...f, availability }))} />
        </Card>
        <Button label={t('common.save')} size="lg" fullWidth loading={upsert.isPending} onPress={save} />
        {existing ? (
          <Text variant="caption" muted align="center">
            {localized(existing.name)} · {t('cw.staff.bookingsMonth')}: {existing.bookingCount}
          </Text>
        ) : null}
      </View>
      <BottomSheet ref={delRef}>
        <ConfirmContent
          title={t('cw.staff.form.deleteConfirm')}
          body={t('common.cannotUndo')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onCancel={() => delRef.current?.close()}
          onConfirm={async () => {
            delRef.current?.close();
            await del.mutateAsync(id);
            toast.success(t('common.deleted'));
            router.back();
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1 },
});
