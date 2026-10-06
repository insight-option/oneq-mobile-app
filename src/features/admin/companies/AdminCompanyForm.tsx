import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, BottomSheet, Button, Card, Chip, EmptyState, Header, Icon, Input, isIconName, PhoneInput, Screen, SegmentedControl, Select, Skeleton, Switch, Text, TextArea, toast, type BottomSheetRef, type IconName } from '@/components/ui';
import { LocationPicker } from '@/components/shared';
import { repo } from '@/data';
import { useAdminCategories, useAdminCreateCompany, useAdminUpdateCompany, useCompany } from '@/data/hooks';
import type { Audience, Company, GeoPoint, ServiceMode } from '@/domain/types';
import { AREA_KEYS, useI18n } from '@/i18n';
import { formatPhone, localPart, normalizeQatarPhone } from '@/lib/phone';
import { useTheme } from '@/theme/ThemeProvider';
import { DOHA_CENTER } from '@/theme/tokens';

type FormState = {
  categoryId: string | null;
  subcategoryIds: string[];
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  phone: string;
  whatsapp: string;
  area: string | null;
  addressAr: string;
  addressEn: string;
  location: GeoPoint;
  serviceMode: ServiceMode;
  offersSubscriptions: boolean;
  audience: Audience;
  logoUrl: string | null;
};

const fromCompany = (c: Company | null): FormState =>
  c
    ? {
        categoryId: c.categoryId,
        subcategoryIds: c.subcategoryIds,
        nameAr: c.name.ar,
        nameEn: c.name.en,
        descAr: c.description.ar,
        descEn: c.description.en,
        ownerName: '',
        ownerPhone: c.ownerPhone ? localPart(c.ownerPhone) : '',
        ownerEmail: c.ownerEmail ?? c.email ?? '',
        phone: localPart(c.phone),
        whatsapp: c.whatsapp ? localPart(c.whatsapp) : '',
        area: c.area,
        addressAr: c.address.ar,
        addressEn: c.address.en,
        location: c.location,
        serviceMode: c.serviceMode,
        offersSubscriptions: c.offersSubscriptions,
        audience: c.audience,
        logoUrl: c.logoUrl ?? null,
      }
    : { categoryId: null, subcategoryIds: [], nameAr: '', nameEn: '', descAr: '', descEn: '', ownerName: '', ownerPhone: '', ownerEmail: '', phone: '', whatsapp: '', area: null, addressAr: '', addressEn: '', location: DOHA_CENTER, serviceMode: 'ONSITE', offersSubscriptions: false, audience: 'mixed', logoUrl: null };

/** Admin create (no id) / edit (id) company form. The owner signs in later with the phone number entered here. */
export const AdminCompanyForm = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const company = useCompany(id);
  const categories = useAdminCategories();
  if ((id && company.isLoading) || categories.isLoading) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={id ? t('ad.form.edit') : t('ad.form.new')} variant="workspace" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={320} radius={radii.card} />
        </View>
      </Screen>
    );
  }
  if (id && !company.data) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('ad.form.edit')} variant="workspace" compact />
        <EmptyState icon="building-2" title={t('ad.company.notFound')} />
      </Screen>
    );
  }
  return <AdminCompanyFormBody key={id ?? 'new'} existing={company.data ?? null} />;
};

const AdminCompanyFormBody = ({ existing }: { existing: Company | null }) => {
  const router = useRouter();
  const { t, localized, areaName } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const categories = useAdminCategories();
  const create = useAdminCreateCompany();
  const update = useAdminUpdateCompany();
  const [form, setForm] = useState<FormState>(() => fromCompany(existing));
  const [created, setCreated] = useState<{ id: string; phone: string } | null>(null);
  const sheet = useRef<BottomSheetRef>(null);
  const isNew = !existing;
  const category = categories.data?.find((c) => c.id === form.categoryId);
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const url = await repo.profile.uploadImage(res.assets[0].uri, 'company');
    patch({ logoUrl: url });
  };

  const submit = async () => {
    if (!form.categoryId || !form.nameAr.trim() || !form.area) {
      toast.error(t('ad.form.invalid'));
      return;
    }
    const name = { ar: form.nameAr.trim(), en: form.nameEn.trim() || form.nameAr.trim() };
    const description = { ar: form.descAr.trim(), en: form.descEn.trim() || form.descAr.trim() };
    const address = { ar: form.addressAr.trim(), en: form.addressEn.trim() || form.addressAr.trim() };
    const whatsapp = normalizeQatarPhone(form.whatsapp);
    const email = form.ownerEmail.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error(t('ad.form.invalidEmail'));
      return;
    }
    try {
      if (!existing) {
        const ownerPhone = normalizeQatarPhone(form.ownerPhone);
        if (!ownerPhone || !form.ownerName.trim()) {
          toast.error(t('ad.form.invalid'));
          return;
        }
        const res = await create.mutateAsync({
          categoryId: form.categoryId,
          subcategoryIds: form.subcategoryIds,
          name,
          description,
          ownerName: form.ownerName.trim(),
          ownerPhone,
          ownerEmail: email,
          phone: normalizeQatarPhone(form.phone) ?? ownerPhone,
          whatsapp,
          area: form.area,
          address,
          location: form.location,
          serviceMode: form.serviceMode,
          offersSubscriptions: form.offersSubscriptions,
          audience: form.audience,
          logoUrl: form.logoUrl,
        });
        setCreated({ id: res.company.id, phone: res.ownerUsername });
        sheet.current?.open();
      } else {
        await update.mutateAsync({
          id: existing.id,
          patch: {
            name,
            description,
            subcategoryIds: form.subcategoryIds,
            area: form.area,
            address,
            location: form.location,
            phone: normalizeQatarPhone(form.phone) ?? existing.phone,
            whatsapp,
            email,
            // the owner e-mail is where "Resend invitation" delivers the temporary password (Cognito is re-synced there)
            ownerEmail: email,
            serviceMode: form.serviceMode,
            offersSubscriptions: form.offersSubscriptions,
            audience: form.audience,
            logoUrl: form.logoUrl,
          },
        });
        toast.success(t('ad.form.updated'));
        router.back();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast.error(msg === 'PHONE_EXISTS' ? t('ad.form.phoneExists') : msg === 'EMAIL_EXISTS' ? t('ad.form.emailExists') : msg === 'INVALID_EMAIL' ? t('ad.form.invalidEmail') : msg === 'INVALID_PHONE' ? t('ad.form.invalid') : t('common.error'));
    }
  };

  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={isNew ? t('ad.form.new') : t('ad.form.edit')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Pressable onPress={pickLogo} style={{ alignItems: 'center', gap: 6 }}>
            <Avatar uri={form.logoUrl} name={form.nameAr || 'Q'} size={92} dark rounded="squircle" />
            <Text variant="caption" weight="semibold" color={colors.primary}>
              {t('ad.form.logo')}
            </Text>
          </Pressable>
          <Select label={t('ad.form.category')} value={form.categoryId} onChange={(v) => patch({ categoryId: v, subcategoryIds: [] })} options={(categories.data ?? []).map((c) => ({ value: c.id, label: localized(c.name), icon: (isIconName(c.icon) ? c.icon : 'tags') as IconName }))} placeholder={t('common.select')} />
          {category ? (
            <>
              <Text variant="bodySm" weight="semibold">
                {t('ad.form.subcategories')}
              </Text>
              <View style={styles.wrap}>
                {category.subcategories.map((s) => {
                  const sel = form.subcategoryIds.includes(s.id);
                  return <Chip key={s.id} label={localized(s.name)} size="sm" selected={sel} onPress={() => patch({ subcategoryIds: sel ? form.subcategoryIds.filter((x) => x !== s.id) : [...form.subcategoryIds, s.id] })} />;
                })}
              </View>
            </>
          ) : null}
          <Input label={t('ad.form.nameAr')} value={form.nameAr} onChangeText={(v) => patch({ nameAr: v })} />
          <Input label={t('ad.form.nameEn')} value={form.nameEn} onChangeText={(v) => patch({ nameEn: v })} ltr />
          <TextArea label={t('ad.form.descAr')} value={form.descAr} onChangeText={(v) => patch({ descAr: v })} />
          <TextArea label={t('ad.form.descEn')} value={form.descEn} onChangeText={(v) => patch({ descEn: v })} ltr />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title" weight="bold">
            {t('ad.company.owner')}
          </Text>
          {isNew ? (
            <>
              <Input label={t('ad.form.ownerName')} value={form.ownerName} onChangeText={(v) => patch({ ownerName: v })} leftIcon="user" />
              <PhoneInput label={t('ad.form.ownerPhone')} value={form.ownerPhone} onChange={(d) => patch({ ownerPhone: d })} />
              <Text variant="caption" muted>
                {t('ad.company.ownerLogin')}
              </Text>
            </>
          ) : (
            <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md, padding: 12 }]}>
              <Icon name="user" size={20} color={colors.primary} />
              <Text variant="bodySm" weight="semibold" numeric style={{ flex: 1 }}>
                {formatPhone(existing.ownerPhone)}
              </Text>
            </View>
          )}
          <Input label={t('ad.form.ownerEmail')} value={form.ownerEmail} onChangeText={(v) => patch({ ownerEmail: v })} keyboardType="email-address" ltr leftIcon="mail" />
          <PhoneInput label={t('ad.form.phone')} value={form.phone} onChange={(d) => patch({ phone: d })} />
          <PhoneInput label={t('ad.form.whatsapp')} value={form.whatsapp} onChange={(d) => patch({ whatsapp: d })} />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Select label={t('ad.form.area')} value={form.area} onChange={(v) => patch({ area: v })} options={AREA_KEYS.map((k) => ({ value: k, label: areaName(k) }))} placeholder={t('common.select')} />
          <Input label={t('ad.form.addressAr')} value={form.addressAr} onChangeText={(v) => patch({ addressAr: v })} />
          <Input label={t('ad.form.addressEn')} value={form.addressEn} onChangeText={(v) => patch({ addressEn: v })} ltr />
          <Text variant="bodySm" weight="semibold">
            {t('ad.form.location')}
          </Text>
          <LocationPicker value={form.location} onChange={(p) => patch({ location: p })} height={220} useMineLabel={t('cw.location.useMine')} />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodySm" weight="semibold">
            {t('ad.form.serviceMode')}
          </Text>
          <SegmentedControl
            value={form.serviceMode}
            onChange={(v) => patch({ serviceMode: v })}
            options={[
              { value: 'ONSITE', label: t('serviceMode.ONSITE') },
              { value: 'HOME', label: t('serviceMode.HOME') },
              { value: 'BOTH', label: t('serviceMode.BOTH') },
            ]}
          />
          <Text variant="bodySm" weight="semibold">
            {t('ad.form.audience')}
          </Text>
          <SegmentedControl
            value={form.audience}
            onChange={(v) => patch({ audience: v })}
            options={[
              { value: 'mixed', label: t('audience.mixed') },
              { value: 'men', label: t('audience.men') },
              { value: 'women', label: t('audience.women') },
            ]}
          />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" weight="semibold">
              {t('ad.form.subscriptions')}
            </Text>
            <Switch value={form.offersSubscriptions} onValueChange={(v) => patch({ offersSubscriptions: v })} />
          </View>
        </Card>
        <Button label={isNew ? t('ad.form.submit') : t('ad.form.save')} size="lg" fullWidth loading={create.isPending || update.isPending} onPress={submit} />
      </View>
      <BottomSheet ref={sheet} title={t('ad.form.created')}>
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <Text variant="bodySm">{t('ad.form.createdBody', { phone: formatPhone(created?.phone) })}</Text>
          <Button
            label={t('ad.form.openDetail')}
            fullWidth
            onPress={() => {
              sheet.current?.close();
              if (created) router.replace(`/(admin)/company/${created.id}` as never);
            }}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
