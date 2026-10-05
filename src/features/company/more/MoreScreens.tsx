import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Avatar, BottomSheet, Button, Card, Chip, Header, Icon, Input, ListRow, Screen, SegmentedControl, Select, Skeleton, StatusPill, Switch, Tag, Text, TextArea, toast, AreaChart, BarChart, KpiCard, GalleryGrid, type BottomSheetRef, type IconName } from '@/components/ui';
import { CompanyCard, LocationPicker, RatingSummary, ReviewCard } from '@/components/shared';
import { repo } from '@/data';
import { useCategories, useCompanyReviewsMine, useCompanyStats, useCompanySubscriptions, useMyCompany, useReplyReview, useUpdateMyCompany } from '@/data/hooks';
import type { Audience, Company, OpeningHours, Review, ServiceMode, StatsRange, Weekday } from '@/domain/types';
import { AREA_KEYS, useI18n, WEEK_ORDER, daysUntil } from '@/i18n';
import { minutesToTime } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import { CompanyHeader, completionOf } from '../shell/CompanyShell';
import { useWorkspaceSignOut } from '../shell/WorkspaceHeader';
import { NotificationsScreen } from '@/features/customer/notifications/NotificationsScreen';

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => minutesToTime(i * 30));

/* ---------- More tab ---------- */
export const MoreScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const signOut = useWorkspaceSignOut();
  const items: { icon: IconName; label: string; route: string }[] = [
    { icon: 'briefcase', label: t('cw.more.profile'), route: '/(company)/profile' },
    { icon: 'map-pin', label: t('cw.more.location'), route: '/(company)/location' },
    { icon: 'clock', label: t('cw.more.hours'), route: '/(company)/hours' },
    { icon: 'image', label: t('cw.more.media'), route: '/(company)/media' },
    { icon: 'repeat', label: t('cw.more.subscriptions'), route: '/(company)/subscriptions' },
    { icon: 'star', label: t('cw.more.reviews'), route: '/(company)/reviews' },
    { icon: 'chart-line', label: t('cw.more.analytics'), route: '/(company)/analytics' },
    { icon: 'bell', label: t('cw.more.notifications'), route: '/(company)/notifications' },
    { icon: 'languages', label: t('cw.more.language'), route: '/(company)/language' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <CompanyHeader />
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, gap: spacing.md, paddingBottom: 110 }}>
        <Text variant="h1">{t('tabs.company.more')}</Text>
        <Card padding={0}>
          {items.map((it, i) => (
            <ListRow key={it.label} icon={it.icon} title={it.label} divider={i < items.length - 1} onPress={() => router.push(it.route as never)} />
          ))}
        </Card>
        <Card padding={0}>
          <ListRow icon="log-out" title={t('cw.more.logout')} danger chevron={false} onPress={() => void signOut()} />
        </Card>
      </ScrollView>
    </View>
  );
};

/* ---------- Business profile ---------- */
export const CompanyProfileScreen = () => {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const company = useMyCompany();
  if (!company.data) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('cw.profile.title')} variant="workspace" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={300} />
        </View>
      </Screen>
    );
  }
  return <CompanyProfileForm key={company.data.id} company={company.data} />;
};

type ProfileFormState = Partial<Company> & { nameAr: string; nameEn: string; taglineAr: string; descAr: string; descEn: string; amenityInput: string };

const CompanyProfileForm = ({ company: c }: { company: Company }) => {
  const router = useRouter();
  const { t, localized } = useI18n();
  const { colors, spacing } = useTheme();
  const categories = useCategories();
  const update = useUpdateMyCompany();
  const [form, setForm] = useState<ProfileFormState>(() => ({ ...c, nameAr: c.name.ar, nameEn: c.name.en, taglineAr: c.tagline?.ar ?? '', descAr: c.description.ar, descEn: c.description.en, amenityInput: '' }));
  const category = categories.data?.find((x) => x.id === c.categoryId);
  const completion = completionOf(c);

  const save = async (patchActive?: boolean) => {
    try {
      await update.mutateAsync({
        name: { ar: form.nameAr.trim(), en: form.nameEn.trim() || form.nameAr.trim() },
        tagline: form.taglineAr ? { ar: form.taglineAr, en: form.taglineAr } : null,
        description: { ar: form.descAr, en: form.descEn || form.descAr },
        phone: form.phone ?? c.phone,
        whatsapp: form.whatsapp ?? c.whatsapp,
        email: form.email ?? c.email,
        subcategoryIds: form.subcategoryIds ?? c.subcategoryIds,
        serviceMode: form.serviceMode ?? c.serviceMode,
        offersSubscriptions: form.offersSubscriptions ?? c.offersSubscriptions,
        hasStaff: form.hasStaff ?? c.hasStaff,
        audience: form.audience ?? c.audience,
        amenities: form.amenities ?? c.amenities,
        acceptsInsurance: form.acceptsInsurance ?? c.acceptsInsurance,
        ...(typeof patchActive === 'boolean' ? { isActive: patchActive } : {}),
      });
      toast.success(t('cw.profile.saved'));
      if (typeof patchActive !== 'boolean') router.back();
    } catch (e) {
      toast.error(e instanceof Error && e.message === 'PROFILE_INCOMPLETE' ? t('cw.profile.activeHint') : t('common.error'));
    }
  };

  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={t('cw.profile.title')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Input label={t('cw.profile.nameAr')} value={form.nameAr} onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))} />
          <Input label={t('cw.profile.nameEn')} value={form.nameEn} onChangeText={(v) => setForm((f) => ({ ...f, nameEn: v }))} ltr />
          <Input label={t('cw.profile.tagline')} value={form.taglineAr} onChangeText={(v) => setForm((f) => ({ ...f, taglineAr: v }))} />
          <TextArea label={t('cw.profile.descAr')} value={form.descAr} onChangeText={(v) => setForm((f) => ({ ...f, descAr: v }))} />
          <TextArea label={t('cw.profile.descEn')} value={form.descEn} onChangeText={(v) => setForm((f) => ({ ...f, descEn: v }))} ltr />
          <Input label={t('cw.profile.phone')} value={form.phone ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" ltr leftIcon="phone" />
          <Input label={t('cw.profile.whatsapp')} value={form.whatsapp ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, whatsapp: v }))} keyboardType="phone-pad" ltr leftIcon="message-circle-more" />
          <Input label={t('cw.profile.email')} value={form.email ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" ltr leftIcon="mail" />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodySm" weight="semibold">
            {t('cw.profile.category')}: {category ? localized(category.name) : ''}
          </Text>
          <Text variant="bodySm" weight="semibold">
            {t('cw.profile.subcategories')}
          </Text>
          <View style={styles.wrap}>
            {(category?.subcategories ?? []).map((s) => {
              const sel = (form.subcategoryIds ?? []).includes(s.id);
              return <Chip key={s.id} label={localized(s.name)} size="sm" selected={sel} onPress={() => setForm((f) => ({ ...f, subcategoryIds: sel ? (f.subcategoryIds ?? []).filter((x) => x !== s.id) : [...(f.subcategoryIds ?? []), s.id] }))} />;
            })}
          </View>
          <Text variant="bodySm" weight="semibold">
            {t('cw.profile.serviceMode')}
          </Text>
          <SegmentedControl
            value={(form.serviceMode ?? 'ONSITE') as ServiceMode}
            onChange={(v) => setForm((f) => ({ ...f, serviceMode: v }))}
            options={[
              { value: 'ONSITE', label: t('serviceMode.ONSITE') },
              { value: 'HOME', label: t('serviceMode.HOME') },
              { value: 'BOTH', label: t('serviceMode.BOTH') },
            ]}
          />
          <Text variant="caption" muted>
            {t('cw.profile.serviceModeHint')}
          </Text>
          <Text variant="bodySm" weight="semibold">
            {t('cw.profile.audience')}
          </Text>
          <SegmentedControl
            value={(form.audience ?? 'mixed') as Audience}
            onChange={(v) => setForm((f) => ({ ...f, audience: v }))}
            options={[
              { value: 'mixed', label: t('audience.mixed') },
              { value: 'men', label: t('audience.men') },
              { value: 'women', label: t('audience.women') },
            ]}
          />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" weight="semibold">
              {t('cw.profile.offersSubscriptions')}
            </Text>
            <Switch value={Boolean(form.offersSubscriptions)} onValueChange={(v) => setForm((f) => ({ ...f, offersSubscriptions: v }))} />
          </View>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="bodySm" weight="semibold">
              {t('cw.profile.hasStaff')}
            </Text>
            <Switch value={Boolean(form.hasStaff)} onValueChange={(v) => setForm((f) => ({ ...f, hasStaff: v }))} />
          </View>
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="bodySm" weight="semibold">
            {t('cw.profile.amenities')}
          </Text>
          <View style={styles.wrap}>
            {(form.amenities ?? []).map((a) => (
              <Chip key={a} label={a} size="sm" icon="x" onPress={() => setForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))} />
            ))}
          </View>
          <View style={styles.row}>
            <Input value={form.amenityInput} onChangeText={(v) => setForm((f) => ({ ...f, amenityInput: v }))} placeholder="wifi" containerStyle={{ flex: 1 }} />
            <Button label={t('common.add')} variant="soft" onPress={() => form.amenityInput.trim() && setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), f.amenityInput.trim()], amenityInput: '' }))} />
          </View>
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" weight="semibold">
                {t('cw.profile.active')}
              </Text>
              <Text variant="caption" muted>
                {t('cw.profile.activeHint')}
              </Text>
            </View>
            <Switch value={c.isActive} disabled={!completion.complete} onValueChange={(v) => void save(v)} />
          </View>
        </Card>
        <Button label={t('common.save')} size="lg" fullWidth loading={update.isPending} onPress={() => save()} />
      </View>
    </Screen>
  );
};

/* ---------- Location ---------- */
export const CompanyLocationScreen = () => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const company = useMyCompany();
  if (!company.data) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('cw.location.title')} variant="workspace" compact />
      </Screen>
    );
  }
  return <CompanyLocationForm key={company.data.id} company={company.data} />;
};

const CompanyLocationForm = ({ company: c }: { company: Company }) => {
  const router = useRouter();
  const { t, areaName } = useI18n();
  const { colors, spacing } = useTheme();
  const update = useUpdateMyCompany();
  const [point, setPoint] = useState(c.location);
  const [area, setArea] = useState<string | null>(c.area);
  const [addrAr, setAddrAr] = useState(c.address.ar);
  const [addrEn, setAddrEn] = useState(c.address.en);
  const save = async () => {
    if (!area) {
      toast.error(t('cw.location.area'));
      return;
    }
    try {
      await update.mutateAsync({ location: point, area, address: { ar: addrAr, en: addrEn || addrAr } });
      toast.success(t('cw.location.saved'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };
  return (
    <Screen edges={[]} background={colors.canvas} keyboard bottomInset={40}>
      <Header title={t('cw.location.title')} subtitle={t('cw.location.hint')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <LocationPicker value={point} onChange={setPoint} useMineLabel={t('cw.location.useMine')} />
        <Card style={{ gap: spacing.md }}>
          <Select label={t('cw.location.area')} value={area} onChange={setArea} options={AREA_KEYS.map((k) => ({ value: k, label: areaName(k), icon: 'map-pin' as const }))} placeholder={t('common.select')} />
          <Input label={t('cw.location.addressAr')} value={addrAr} onChangeText={setAddrAr} />
          <Input label={t('cw.location.addressEn')} value={addrEn} onChangeText={setAddrEn} ltr />
        </Card>
        <Button label={t('common.save')} size="lg" fullWidth loading={update.isPending} onPress={save} />
      </View>
    </Screen>
  );
};

/* ---------- Opening hours ---------- */
export const CompanyHoursScreen = () => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const company = useMyCompany();
  if (!company.data) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('cw.hours.title')} variant="workspace" compact />
      </Screen>
    );
  }
  return <CompanyHoursForm key={company.data.id} company={company.data} />;
};

const CompanyHoursForm = ({ company: c }: { company: Company }) => {
  const router = useRouter();
  const { t, weekdayName } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const update = useUpdateMyCompany();
  const [hours, setHours] = useState<OpeningHours>(c.openingHours);
  const options = TIME_OPTIONS.map((tm) => ({ value: tm, label: tm }));
  const set = (d: Weekday, patch: Partial<OpeningHours[Weekday]>) => setHours((h) => (h ? { ...h, [d]: { ...h[d], ...patch } } : h));
  return (
    <Screen edges={[]} background={colors.canvas} bottomInset={40}>
      <Header title={t('cw.hours.title')} subtitle={t('cw.hours.subtitle')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        {hours
          ? WEEK_ORDER.map((d) => (
              <View key={d} style={[styles.dayRow, { backgroundColor: hours[d].open ? colors.surface : colors.surfaceAlt, borderColor: colors.line, borderRadius: radii.md }]}>
                <Switch value={hours[d].open} onValueChange={(v) => set(d, { open: v })} size="sm" />
                <Text variant="bodySm" weight="semibold" style={{ width: 62 }} lines={1}>
                  {weekdayName(d)}
                </Text>
                {hours[d].open ? (
                  <View style={[styles.row, { flex: 1 }]}>
                    <View style={{ flex: 1 }}>
                      <Select value={hours[d].from} onChange={(v) => set(d, { from: v })} options={options} compact />
                    </View>
                    <Text variant="caption" muted>
                      {t('cw.hours.to')}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Select value={hours[d].to} onChange={(v) => set(d, { to: v })} options={options} compact />
                    </View>
                  </View>
                ) : (
                  <Text variant="caption" muted style={{ flex: 1 }}>
                    {t('cw.hours.closed')}
                  </Text>
                )}
              </View>
            ))
          : null}
        <Button label={t('cw.hours.copyAll')} variant="ghost" size="sm" leftIcon="copy" onPress={() => hours && setHours(WEEK_ORDER.reduce((acc, d) => ({ ...acc, [d]: { ...hours[6] } }), {} as OpeningHours))} style={{ alignSelf: 'flex-start' }} />
        <Button label={t('common.save')} size="lg" fullWidth loading={update.isPending} onPress={async () => { if (!hours) return; try { await update.mutateAsync({ openingHours: hours }); toast.success(t('cw.hours.saved')); router.back(); } catch { toast.error(t('common.error')); } }} />
      </View>
    </Screen>
  );
};

/* ---------- Media ---------- */
export const CompanyMediaScreen = () => {
  const { t, localized } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const company = useMyCompany();
  const update = useUpdateMyCompany();
  const c = company.data;
  const pick = async (purpose: 'company', multiple = false, square = false) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: multiple, selectionLimit: multiple ? 8 : 1, allowsEditing: !multiple && square, aspect: square ? [1, 1] : undefined });
    if (res.canceled) return [] as string[];
    return Promise.all(res.assets.map((a) => repo.profile.uploadImage(a.uri, purpose)));
  };
  const patch = async (p: Parameters<typeof update.mutateAsync>[0]) => {
    try {
      await update.mutateAsync(p);
      toast.success(t('cw.media.saved'));
    } catch {
      toast.error(t('common.error'));
    }
  };
  if (!c) return <Screen edges={[]} background={colors.canvas}><Header title={t('cw.media.title')} variant="workspace" compact /></Screen>;
  return (
    <Screen edges={[]} background={colors.canvas} bottomInset={40}>
      <Header title={t('cw.media.title')} subtitle={t('cw.media.subtitle')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title" weight="bold">
            {t('cw.media.cover')}
          </Text>
          <Text variant="caption" muted>
            {t('cw.media.coverHint')}
          </Text>
          <View style={[{ height: 160, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt }]}>
            {c.coverUrl ? <Image source={{ uri: c.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.coverOverlay}>
              <Avatar uri={c.logoUrl} name={localized(c.name)} size={44} dark bordered />
              <Text variant="title" color="#FFFFFF" weight="bold">
                {localized(c.name)}
              </Text>
            </View>
          </View>
          <Button label={t('cw.media.changeCover')} variant="soft" leftIcon="camera" onPress={async () => { const [u] = await pick('company'); if (u) await patch({ coverUrl: u }); }} />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title" weight="bold">
            {t('cw.media.logo')}
          </Text>
          <Text variant="caption" muted>
            {t('cw.media.logoHint')}
          </Text>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Avatar uri={c.logoUrl} name={localized(c.name)} size={96} dark />
            <Button label={t('cw.media.uploadLogo')} leftIcon="upload" onPress={async () => { const [u] = await pick('company', false, true); if (u) await patch({ logoUrl: u }); }} />
          </View>
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title" weight="bold">
            {t('cw.media.gallery')}
          </Text>
          <Text variant="caption" muted>
            {t('cw.media.galleryHint')}
          </Text>
          <GalleryGrid urls={c.galleryUrls} addLabel={t('cw.media.add')} onAdd={async () => { const urls = await pick('company', true); if (urls.length) await patch({ galleryUrls: [...c.galleryUrls, ...urls].slice(0, 12) }); }} onRemove={(i) => patch({ galleryUrls: c.galleryUrls.filter((_, idx) => idx !== i) })} onMove={(from, to) => { const arr = [...c.galleryUrls]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); void patch({ galleryUrls: arr }); }} />
        </Card>
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" weight="bold" color={colors.gold}>
            {t('cw.media.preview')}
          </Text>
          <Text variant="h3">{t('cw.media.previewHint')}</Text>
          <CompanyCard company={c} onPress={() => undefined} />
        </View>
      </View>
    </Screen>
  );
};

/* ---------- Subscriptions ---------- */
export const CompanySubscriptionsScreen = () => {
  const { t, localized, formatDate, formatMoney } = useI18n();
  const { colors, spacing } = useTheme();
  const subs = useCompanySubscriptions();
  const [filter, setFilter] = useState<'ACTIVE' | 'EXPIRED' | 'ALL'>('ACTIVE');
  const list = (subs.data ?? []).filter((s) => filter === 'ALL' || s.status === filter);
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('cw.subs.title')} subtitle={t('cw.subs.subtitle')} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <SegmentedControl value={filter} onChange={setFilter} options={[{ value: 'ACTIVE', label: t('subStatus.ACTIVE') }, { value: 'EXPIRED', label: t('subStatus.EXPIRED') }, { value: 'ALL', label: t('common.all') }]} />
        {subs.isLoading ? <Skeleton height={200} /> : null}
        {list.map((s) => (
          <Card key={s.id} padding={spacing.md} style={styles.row}>
            <Avatar name={s.customerName} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" weight="semibold" lines={1}>
                {s.customerName}
              </Text>
              <Text variant="caption" muted lines={1}>
                {localized(s.serviceName)} · {localized(s.planName)} · {t('sub.sessions', { used: s.usedSessions, total: s.totalSessions })}
              </Text>
              <Text variant="caption" numeric color={s.status === 'ACTIVE' && daysUntil(s.endDate) <= 7 ? colors.danger : colors.muted}>
                {formatDate(s.startDate, 'short')} → {formatDate(s.endDate, 'short')} · {s.status === 'ACTIVE' ? t('sub.daysLeftFull', { days: daysUntil(s.endDate) }) : t(`subStatus.${s.status}` as 'subStatus.ACTIVE')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <StatusPill status={s.status} label={t(`subStatus.${s.status}` as 'subStatus.ACTIVE')} />
              <Text variant="bodySm" numeric weight="bold">
                {formatMoney(s.price)}
              </Text>
            </View>
          </Card>
        ))}
        {!subs.isLoading && !list.length ? (
          <Text variant="bodySm" muted align="center">
            {t('cw.subs.empty')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
};

/* ---------- Reviews ---------- */
export const CompanyReviewsScreen = () => {
  const { t, localized } = useI18n();
  const { colors, spacing } = useTheme();
  const company = useMyCompany();
  const reviews = useCompanyReviewsMine();
  const reply = useReplyReview();
  const sheet = useRef<BottomSheetRef>(null);
  const [target, setTarget] = useState<Review | null>(null);
  const [text, setText] = useState('');
  const dist = useMemo(() => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    (reviews.data ?? []).forEach((r) => (d[r.rating] += 1));
    return d;
  }, [reviews.data]);
  const c = company.data;
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('cw.reviews.title')} subtitle={t('cw.reviews.subtitle', { company: c ? localized(c.name) : '' })} variant="workspace" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        {c ? (
          <Card>
            <RatingSummary avg={c.ratingAvg} count={c.ratingCount} distribution={dist} basedOnLabel={t('cw.reviews.basedOn', { count: c.ratingCount })} />
          </Card>
        ) : null}
        <Card background={colors.surfaceAlt} shadow="none" style={{ gap: 4 }}>
          <View style={styles.row}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text variant="title" weight="bold">
              {t('cw.reviews.noEdit')}
            </Text>
          </View>
          <Text variant="caption" muted>
            {t('cw.reviews.noEditBody')}
          </Text>
        </Card>
        <Card>
          <Text variant="title" weight="bold" style={{ marginBottom: 8 }}>
            {t('cw.reviews.latest')}
          </Text>
          {(reviews.data ?? []).map((r) => (
            <ReviewCard key={r.id} review={r} replyLabel={t('cw.reviews.reply')} yourReplyLabel={t('cw.reviews.yourReply')} onReply={(rv) => { setTarget(rv); setText(''); sheet.current?.open(); }} />
          ))}
          {!reviews.isLoading && !reviews.data?.length ? (
            <Text variant="bodySm" muted align="center">
              {t('cw.reviews.empty')}
            </Text>
          ) : null}
        </Card>
      </View>
      <BottomSheet ref={sheet} title={t('cw.reviews.reply')}>
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          {target ? (
            <Text variant="bodySm" muted>
              {target.customerName}: “{target.comment}”
            </Text>
          ) : null}
          <TextArea placeholder={t('cw.reviews.replyPlaceholder')} value={text} onChangeText={setText} autoFocus />
          <Button label={t('cw.reviews.reply')} fullWidth loading={reply.isPending} onPress={async () => { if (!target || !text.trim()) return; try { await reply.mutateAsync({ id: target.id, text: text.trim() }); toast.success(t('cw.reviews.replied')); sheet.current?.close(); } catch { toast.error(t('common.error')); } }} />
        </View>
      </BottomSheet>
    </Screen>
  );
};

/* ---------- Analytics ---------- */
export const CompanyAnalyticsScreen = () => {
  const { t, localized, formatNumber, formatMoney } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const [range, setRange] = useState<StatsRange>('12m');
  const company = useMyCompany();
  const stats = useCompanyStats(range);
  const s = stats.data;
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('cw.analytics.title')} subtitle={t('cw.analytics.subtitle', { company: company.data ? localized(company.data.name) : '', months: range === '6m' ? 6 : 12 })} variant="workspace" compact right={<Tag label={t('cw.analytics.demo')} tone="gold" appearance="tint" icon="flask-conical" />} />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <SegmentedControl value={range} onChange={setRange} options={[{ value: '6m', label: t('cw.analytics.6m') }, { value: '12m', label: t('cw.analytics.12m') }]} style={{ alignSelf: 'flex-end', width: 200 }} />
        {s ? (
          <>
            <KpiCard label={t('cw.analytics.topService')} value={s.bookingsByService[0] ? localized(s.bookingsByService[0].name) : '—'} suffix={s.bookingsByService[0] ? `${s.bookingsByService[0].pct}%` : undefined} icon="crown" />
            <View style={styles.row}>
              <KpiCard label={t('cw.analytics.newCustomers')} value={formatNumber(s.newCustomers)} icon="user-plus" delta={s.newCustomersDeltaPct} deltaLabel={t('cw.kpi.vsLastMonth')} style={{ flex: 1 }} />
              <KpiCard label={t('cw.analytics.revenue')} value={formatMoney(s.revenue, { compact: true })} icon="trending-up" delta={s.revenueDeltaPct} deltaLabel={t('cw.kpi.vsLastMonth')} style={{ flex: 1 }} />
            </View>
            <Card style={{ gap: spacing.md }}>
              <Text variant="title" weight="bold">
                {t('cw.chart.revenue')}
              </Text>
              <AreaChart data={s.revenueSeries} height={200} />
            </Card>
            <Card style={{ gap: spacing.md }}>
              <Text variant="title" weight="bold">
                {t('cw.analytics.bookingsMonthly')}
              </Text>
              <Text variant="caption" muted>
                {t('cw.analytics.growthHint')}
              </Text>
              <BarChart data={s.revenueSeries.map((p) => ({ label: p.label, value: Math.max(1, Math.round(p.value / 180)) }))} height={180} />
            </Card>
            <Card style={{ gap: spacing.sm }}>
              <Text variant="title" weight="bold">
                {t('cw.analytics.topServices')}
              </Text>
              {s.bookingsByService.map((b, i) => (
                <View key={b.serviceId} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.line }]}>
                  <Text variant="bodySm" weight="semibold" style={{ flex: 1 }} lines={1}>
                    {i + 1}. {localized(b.name)}
                  </Text>
                  <Text variant="bodySm" numeric muted>
                    {b.count} · {b.pct}%
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : (
          <Skeleton height={300} radius={radii.card} />
        )}
      </View>
    </Screen>
  );
};

export const CompanyNotificationsScreen = () => <NotificationsScreen workspace />;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1 },
  coverOverlay: { position: 'absolute', bottom: 12, start: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
});

