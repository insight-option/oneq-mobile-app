import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet, Button, Card, Chip, ConfirmContent, GalleryGrid, Header, Icon, Input, Screen, Skeleton, Switch, Text, TextArea, toast, type BottomSheetRef } from '@/components/ui';
import { repo } from '@/data';
import { useDeleteProduct, useDeleteService, useMyCompany, useProducts, useServices, useUpsertProduct, useUpsertService } from '@/data/hooks';
import type { Product, Service, SubscriptionPlan } from '@/domain/types';
import { useI18n } from '@/i18n';
import { id as makeId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';

const pickImage = async (purpose: 'service' | 'product', multiple = false): Promise<string[]> => {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: multiple, selectionLimit: multiple ? 6 : 1 });
  if (res.canceled) return [];
  return Promise.all(res.assets.map((a) => repo.profile.uploadImage(a.uri, purpose)));
};

const FormRow = ({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, { borderTopColor: colors.line }]}>
      <View style={{ flex: 1 }}>
        <Text variant="bodySm" weight="semibold">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
};

const PlanEditor = ({ plans, onChange }: { plans: SubscriptionPlan[]; onChange: (p: SubscriptionPlan[]) => void }) => {
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const update = (i: number, patch: Partial<SubscriptionPlan>) => onChange(plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  return (
    <View style={{ gap: spacing.md }}>
      {plans.map((p, i) => (
        <View key={p.id} style={[styles.plan, { borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.row}>
            <Input label={t('cw.service.form.planName')} value={p.name.ar} onChangeText={(v) => update(i, { name: { ...p.name, ar: v } })} containerStyle={{ flex: 1 }} />
            <Pressable onPress={() => onChange(plans.filter((_, idx) => idx !== i))} hitSlop={8} style={{ paddingTop: 26 }}>
              <Icon name="trash-2" size={20} color={colors.danger} />
            </Pressable>
          </View>
          <Text variant="caption" weight="semibold">
            {t('cw.service.form.sessions')}
          </Text>
          <View style={styles.row}>
            {([1, 2, 3] as const).map((n) => (
              <Chip key={n} label={t(`booking.plan.perWeek${n}` as 'booking.plan.perWeek1')} size="sm" selected={p.sessionsPerWeek === n} onPress={() => update(i, { sessionsPerWeek: n })} />
            ))}
          </View>
          <View style={styles.row}>
            <Input label={t('cw.service.form.weeks')} value={String(p.durationWeeks)} onChangeText={(v) => update(i, { durationWeeks: Number(v.replace(/\D/g, '')) || 4 })} keyboardType="number-pad" numeric ltr containerStyle={{ flex: 1 }} />
            <Input label={t('cw.service.form.planPrice')} value={String(p.price)} onChangeText={(v) => update(i, { price: Number(v.replace(/[^\d.]/g, '')) || 0 })} keyboardType="decimal-pad" numeric ltr containerStyle={{ flex: 1 }} />
            <Input label={t('cw.service.form.planOffer')} value={p.offerPrice ? String(p.offerPrice) : ''} onChangeText={(v) => update(i, { offerPrice: v ? Number(v.replace(/[^\d.]/g, '')) : null })} keyboardType="decimal-pad" numeric ltr containerStyle={{ flex: 1 }} />
          </View>
          <View style={styles.row}>
            <Switch value={Boolean(p.isPopular)} onValueChange={(v) => update(i, { isPopular: v })} size="sm" />
            <Text variant="caption" muted>
              {t('cw.service.form.popular')}
            </Text>
          </View>
        </View>
      ))}
      <Button label={t('cw.service.form.addPlan')} variant="soft" leftIcon="plus" onPress={() => onChange([...plans, { id: makeId('plan'), name: { ar: `باقة ${plans.length + 1}`, en: `Plan ${plans.length + 1}` }, sessionsPerWeek: 1, durationWeeks: 4, price: 0, features: [] }])} />
    </View>
  );
};

const FormSkeleton = ({ title }: { title: string }) => {
  const { colors, spacing, radii } = useTheme();
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={title} variant="workspace" compact />
      <View style={{ padding: spacing.gutter }}>
        <Skeleton height={300} radius={radii.card} />
      </View>
    </Screen>
  );
};

/* ---------- Service form ---------- */
type ServiceFormState = { nameAr: string; nameEn: string; descAr: string; descEn: string; price: string; durationMin: string; imageUrl: string | null; requiresStaff: boolean; allowOneTime: boolean; allowSubscription: boolean; plans: SubscriptionPlan[]; isActive: boolean };
const initialServiceForm = (existing: Service | null, hasStaff: boolean): ServiceFormState =>
  existing
    ? { nameAr: existing.name.ar, nameEn: existing.name.en, descAr: existing.description.ar, descEn: existing.description.en, price: String(existing.price), durationMin: String(existing.durationMin), imageUrl: existing.imageUrl ?? null, requiresStaff: existing.requiresStaff, allowOneTime: existing.allowOneTime, allowSubscription: existing.allowSubscription, plans: existing.subscriptionPlans, isActive: existing.isActive }
    : { nameAr: '', nameEn: '', descAr: '', descEn: '', price: '', durationMin: '45', imageUrl: null, requiresStaff: hasStaff, allowOneTime: true, allowSubscription: false, plans: [], isActive: true };

export const ServiceForm = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { t } = useI18n();
  const company = useMyCompany();
  const services = useServices(company.data?.id);
  const existing = services.data?.find((s) => s.id === id) ?? null;
  if (company.isLoading || (!isNew && services.isLoading)) return <FormSkeleton title={t('cw.service.form.edit')} />;
  return <ServiceFormBody key={existing?.id ?? 'new'} id={id} isNew={isNew} existing={existing} companyId={company.data?.id} hasStaff={Boolean(company.data?.hasStaff)} count={services.data?.length ?? 0} />;
};

const ServiceFormBody = ({ id, isNew, existing, companyId, hasStaff, count }: { id: string; isNew: boolean; existing: Service | null; companyId: string | undefined; hasStaff: boolean; count: number }) => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const upsert = useUpsertService();
  const del = useDeleteService(companyId);
  const delRef = useRef<BottomSheetRef>(null);
  const [form, setForm] = useState<ServiceFormState>(() => initialServiceForm(existing, hasStaff));

  const save = async () => {
    const price = Number(form.price);
    if (!form.nameAr.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t('cw.service.form.invalid'));
      return;
    }
    try {
      await upsert.mutateAsync({
        id: isNew ? undefined : id,
        name: { ar: form.nameAr.trim(), en: form.nameEn.trim() || form.nameAr.trim() },
        description: { ar: form.descAr.trim(), en: form.descEn.trim() || form.descAr.trim() },
        price,
        offerPrice: existing?.offerPrice ?? null,
        offerEndsAt: existing?.offerEndsAt ?? null,
        offerImageUrl: existing?.offerImageUrl ?? null,
        durationMin: Number(form.durationMin) || 45,
        imageUrl: form.imageUrl,
        allowOneTime: form.allowOneTime,
        allowSubscription: form.allowSubscription,
        subscriptionPlans: form.allowSubscription ? form.plans : [],
        requiresStaff: form.requiresStaff,
        isActive: form.isActive,
        sortOrder: existing?.sortOrder ?? count + 1,
      });
      toast.success(t('cw.service.form.saved'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={isNew ? t('cw.service.form.new') : t('cw.service.form.edit')} variant="workspace" compact right={!isNew ? <Button label={t('common.delete')} size="sm" variant="danger" onPress={() => delRef.current?.open()} /> : undefined} />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Pressable
            onPress={async () => {
              const [u] = await pickImage('service');
              if (u) setForm((f) => ({ ...f, imageUrl: u }));
            }}
            style={[styles.imagePick, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md, borderColor: colors.lineStrong }]}>
            {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.imageOverlay}>
              <Icon name="image-plus" size={22} color="#FFFFFF" />
              <Text variant="caption" color="#FFFFFF" weight="semibold">
                {t('cw.service.form.image')}
              </Text>
            </View>
          </Pressable>
          <Input label={t('cw.service.form.nameAr')} value={form.nameAr} onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))} />
          <Input label={t('cw.service.form.nameEn')} value={form.nameEn} onChangeText={(v) => setForm((f) => ({ ...f, nameEn: v }))} ltr />
          <TextArea label={t('cw.service.form.descAr')} value={form.descAr} onChangeText={(v) => setForm((f) => ({ ...f, descAr: v }))} />
          <TextArea label={t('cw.service.form.descEn')} value={form.descEn} onChangeText={(v) => setForm((f) => ({ ...f, descEn: v }))} ltr />
          <View style={styles.row}>
            <Input label={t('cw.service.form.price')} value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" numeric ltr containerStyle={{ flex: 1 }} />
            <Input label={t('cw.service.form.duration')} value={form.durationMin} onChangeText={(v) => setForm((f) => ({ ...f, durationMin: v.replace(/\D/g, '') }))} keyboardType="number-pad" numeric ltr containerStyle={{ flex: 1 }} />
          </View>
        </Card>
        <Card padding={spacing.md}>
          <FormRow label={t('cw.service.form.requiresStaff')} value={form.requiresStaff} onChange={(v) => setForm((f) => ({ ...f, requiresStaff: v }))} />
          <FormRow label={t('cw.service.form.allowOneTime')} value={form.allowOneTime} onChange={(v) => setForm((f) => ({ ...f, allowOneTime: v }))} />
          <FormRow label={t('cw.service.form.allowSubscription')} value={form.allowSubscription} onChange={(v) => setForm((f) => ({ ...f, allowSubscription: v }))} />
          <FormRow label={t('cw.service.form.active')} value={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
        </Card>
        {form.allowSubscription ? (
          <Card style={{ gap: spacing.md }}>
            <Text variant="title" weight="bold">
              {t('cw.service.form.plans')}
            </Text>
            <PlanEditor plans={form.plans} onChange={(plans) => setForm((f) => ({ ...f, plans }))} />
          </Card>
        ) : null}
        <Button label={t('common.save')} size="lg" fullWidth loading={upsert.isPending} onPress={save} />
      </View>
      <BottomSheet ref={delRef}>
        <ConfirmContent
          title={t('cw.service.form.deleteConfirm')}
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

/* ---------- Product form ---------- */
type ProductFormState = { nameAr: string; nameEn: string; descAr: string; descEn: string; price: string; stock: string; imageUrls: string[]; isActive: boolean };
const initialProductForm = (existing: Product | null): ProductFormState =>
  existing
    ? { nameAr: existing.name.ar, nameEn: existing.name.en, descAr: existing.description.ar, descEn: existing.description.en, price: String(existing.price), stock: existing.stock != null ? String(existing.stock) : '', imageUrls: existing.imageUrls, isActive: existing.isActive }
    : { nameAr: '', nameEn: '', descAr: '', descEn: '', price: '', stock: '', imageUrls: [], isActive: true };

export const ProductForm = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { t } = useI18n();
  const company = useMyCompany();
  const products = useProducts(company.data?.id);
  const existing = products.data?.find((p) => p.id === id) ?? null;
  if (company.isLoading || (!isNew && products.isLoading)) return <FormSkeleton title={t('cw.product.form.edit')} />;
  return <ProductFormBody key={existing?.id ?? 'new'} id={id} isNew={isNew} existing={existing} companyId={company.data?.id} />;
};

const ProductFormBody = ({ id, isNew, existing, companyId }: { id: string; isNew: boolean; existing: Product | null; companyId: string | undefined }) => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const upsert = useUpsertProduct();
  const del = useDeleteProduct(companyId);
  const delRef = useRef<BottomSheetRef>(null);
  const [form, setForm] = useState<ProductFormState>(() => initialProductForm(existing));

  const save = async () => {
    const price = Number(form.price);
    if (!form.nameAr.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t('cw.service.form.invalid'));
      return;
    }
    try {
      await upsert.mutateAsync({
        id: isNew ? undefined : id,
        name: { ar: form.nameAr.trim(), en: form.nameEn.trim() || form.nameAr.trim() },
        description: { ar: form.descAr.trim(), en: form.descEn.trim() || form.descAr.trim() },
        price,
        offerPrice: existing?.offerPrice ?? null,
        offerEndsAt: existing?.offerEndsAt ?? null,
        imageUrls: form.imageUrls,
        stock: form.stock ? Number(form.stock) : null,
        isActive: form.isActive,
      });
      toast.success(t('cw.product.form.saved'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={isNew ? t('cw.product.form.new') : t('cw.product.form.edit')} variant="workspace" compact right={!isNew ? <Button label={t('common.delete')} size="sm" variant="danger" onPress={() => delRef.current?.open()} /> : undefined} />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodySm" weight="semibold">
            {t('cw.product.form.images')}
          </Text>
          <GalleryGrid
            urls={form.imageUrls}
            columns={3}
            addLabel={t('cw.media.add')}
            onAdd={async () => {
              const urls = await pickImage('product', true);
              if (urls.length) setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...urls].slice(0, 6) }));
            }}
            onRemove={(i) => setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, idx) => idx !== i) }))}
            onMove={(from, to) =>
              setForm((f) => {
                const arr = [...f.imageUrls];
                const [m] = arr.splice(from, 1);
                arr.splice(to, 0, m);
                return { ...f, imageUrls: arr };
              })
            }
          />
          <Input label={t('cw.product.form.nameAr')} value={form.nameAr} onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))} />
          <Input label={t('cw.product.form.nameEn')} value={form.nameEn} onChangeText={(v) => setForm((f) => ({ ...f, nameEn: v }))} ltr />
          <TextArea label={t('cw.service.form.descAr')} value={form.descAr} onChangeText={(v) => setForm((f) => ({ ...f, descAr: v }))} />
          <View style={styles.row}>
            <Input label={t('cw.service.form.price')} value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" numeric ltr containerStyle={{ flex: 1 }} />
            <Input label={t('cw.product.form.stock')} value={form.stock} onChangeText={(v) => setForm((f) => ({ ...f, stock: v.replace(/\D/g, '') }))} keyboardType="number-pad" numeric ltr containerStyle={{ flex: 1 }} />
          </View>
          <FormRow label={t('cw.service.form.active')} value={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
        </Card>
        <Button label={t('common.save')} size="lg" fullWidth loading={upsert.isPending} onPress={save} />
      </View>
      <BottomSheet ref={delRef}>
        <ConfirmContent
          title={t('cw.product.form.deleteConfirm')}
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  plan: { padding: 12, borderWidth: 1, gap: 10 },
  imagePick: { height: 150, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { position: 'absolute', bottom: 10, end: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(42,0,15,0.7)', paddingHorizontal: 12, height: 32, borderRadius: 16 },
});
