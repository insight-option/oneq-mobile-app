import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, DateStrip, Header, Icon, IconBubble, Input, PhoneInput, PriceTag, Select, Skeleton, StepDots, Switch, Tag, Text, TextArea, TimeSlotGrid, toast } from '@/components/ui';
import { ProductCard, ServiceRow, StaffCard } from '@/components/shared';
import { useCompany, useCreateBooking, useLoyalty, useMe, useProducts, useServices, useStaff, useTimeSlots } from '@/data/hooks';
import type { PaymentMethod, SavedAddress, Service, Staff, SubscriptionPlan, Weekday } from '@/domain/types';
import { AREA_KEYS, useI18n } from '@/i18n';
import { isValidQatarPhone } from '@/lib/phone';
import { id as makeId } from '@/lib/ids';
import { haptic } from '@/lib/haptics';
import { useBookingDraft } from '@/store/bookingDraft';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

type Step = 'item' | 'mode' | 'type' | 'staff' | 'datetime' | 'gift' | 'confirm' | 'payment';

export const BookingWizard = () => {
  const params = useLocalSearchParams<{ companyId: string; serviceId?: string; productId?: string; staffId?: string; planId?: string; giftId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, localized, formatMoney, formatDate, formatTime, areaName } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const signedIn = useIsSignedIn();
  const company = useCompany(params.companyId);
  const services = useServices(params.companyId);
  const products = useProducts(params.companyId);
  const staff = useStaff(params.companyId);
  const loyalty = useLoyalty();
  const me = useMe();
  const create = useCreateBooking();
  const { draft, start, set, setResult } = useBookingDraft();
  const [stepIndex, setStepIndex] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [newAddress, setNewAddress] = useState<{ label: string; area: string | null; details: string }>({ label: '', area: null, details: '' });

  // Start a fresh draft for this company / entry point (the route keys this component by its params).
  useEffect(() => {
    start({ companyId: params.companyId, serviceId: params.serviceId ?? null, productId: params.productId ?? null, staffId: params.staffId ?? null, planId: params.planId ?? null, kind: params.productId ? 'PRODUCT' : params.planId ? 'SUBSCRIPTION' : 'SERVICE', giftId: params.giftId ?? null });
  }, [params.companyId, params.serviceId, params.productId, params.staffId, params.planId, params.giftId, start]);

  // Guests are asked to sign in before using the wizard.
  useEffect(() => {
    if (signedIn) return;
    requireAuth('book').then((ok) => {
      if (!ok) router.back();
    });
  }, [signedIn, router]);

  const c = company.data;
  const service = useMemo(() => services.data?.find((s) => s.id === draft.serviceId) ?? null, [services.data, draft.serviceId]);
  const product = useMemo(() => products.data?.find((p) => p.id === draft.productId) ?? null, [products.data, draft.productId]);
  const plan = useMemo<SubscriptionPlan | null>(() => service?.subscriptionPlans.find((p) => p.id === draft.planId) ?? null, [service, draft.planId]);
  const staffMember = useMemo(() => staff.data?.find((s) => s.id === draft.staffId) ?? null, [staff.data, draft.staffId]);

  const steps = useMemo<Step[]>(() => {
    if (!c) return ['item'];
    const out: Step[] = ['item'];
    if (c.serviceMode === 'BOTH' || c.serviceMode === 'HOME') out.push('mode');
    if (service?.allowSubscription && service.subscriptionPlans.length) out.push('type');
    if (c.hasStaff && (service ? service.requiresStaff : false)) out.push('staff');
    out.push('datetime', 'gift', 'confirm', 'payment');
    return out;
  }, [c, service]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    if (c?.serviceMode === 'HOME' && draft.mode !== 'HOME') set({ mode: 'HOME' });
    if (c?.serviceMode === 'ONSITE' && draft.mode !== 'ONSITE') set({ mode: 'ONSITE' });
  }, [c?.serviceMode, draft.mode, set]);

  const slots = useTimeSlots(c && draft.date ? { companyId: c.id, date: draft.date, staffId: draft.staffId, durationMin: service?.durationMin } : null);

  const basePrice = plan ? plan.offerPrice ?? plan.price : service ? service.offerPrice ?? service.price : product ? product.offerPrice ?? product.price : 0;
  const points = loyalty.data?.points ?? 0;
  const redeemable = Math.min(Math.floor(points / 100) * 100, Math.floor(basePrice / 10) * 100);
  const discount = draft.paymentMethod === 'POINTS' ? basePrice : draft.usePoints ? redeemable / 10 : 0;
  const total = Math.max(0, basePrice - discount);
  const canPayWithPoints = points >= Math.ceil(basePrice / 10) * 100 && basePrice > 0;

  const titleKey: Record<Step, string> = {
    item: product || draft.kind === 'PRODUCT' ? t('booking.step.product') : t('booking.step.service'),
    mode: t('booking.step.mode'),
    type: t('booking.step.type'),
    staff: c?.categoryId === 'cat_clinics' ? t('booking.step.doctor') : c?.categoryId === 'cat_gyms' ? t('booking.step.trainer') : t('booking.step.staff'),
    datetime: t('booking.step.date'),
    gift: t('booking.step.gift'),
    confirm: t('booking.step.confirm'),
    payment: t('booking.step.payment'),
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 'item':
        return Boolean(draft.serviceId || draft.productId);
      case 'mode':
        return draft.mode === 'ONSITE' || Boolean(draft.address);
      case 'type':
        return draft.kind !== 'SUBSCRIPTION' || Boolean(draft.planId);
      case 'staff':
        return true;
      case 'datetime':
        return Boolean(draft.date && draft.time);
      case 'gift':
        return !draft.isGift || (draft.giftName.trim().length > 0 && isValidQatarPhone(`+974${draft.giftPhone}`));
      case 'confirm':
        return true;
      case 'payment':
        return draft.paymentMethod !== 'CARD' || (cardNumber.replace(/\s/g, '').length >= 15 && cardName.trim().length > 1 && cardExpiry.length >= 4 && cardCvv.length >= 3);
      default:
        return true;
    }
  };

  const errorForStep = (): string | null => {
    switch (step) {
      case 'item':
        return t('booking.errors.selectService');
      case 'mode':
        return t('booking.errors.address');
      case 'datetime':
        return t('booking.errors.selectDate');
      case 'gift':
        return t('booking.errors.recipient');
      case 'payment':
        return t('booking.errors.card');
      default:
        return null;
    }
  };

  const next = useCallback(() => {
    if (!canContinue()) {
      const msg = errorForStep();
      if (msg) toast.error(msg);
      return;
    }
    haptic.light();
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draft, steps.length, cardNumber, cardName, cardExpiry, cardCvv]);

  const back = useCallback(() => {
    if (stepIndex === 0) router.back();
    else setStepIndex((i) => i - 1);
  }, [stepIndex, router]);

  const submit = async () => {
    if (!c || !canContinue()) {
      toast.error(t('booking.errors.card'));
      return;
    }
    try {
      const result = await create.mutateAsync({
        companyId: c.id,
        kind: draft.kind,
        serviceId: draft.serviceId ?? undefined,
        productId: draft.productId ?? undefined,
        staffId: draft.staffId,
        mode: draft.mode,
        date: draft.date ?? '',
        time: draft.time ?? '',
        address: draft.mode === 'HOME' ? draft.address : null,
        paymentMethod: draft.paymentMethod,
        usePoints: draft.paymentMethod === 'POINTS' ? undefined : draft.usePoints ? redeemable : 0,
        notes: draft.notes || undefined,
        gift: draft.isGift ? { recipientName: draft.giftName.trim(), recipientPhone: `+974${draft.giftPhone}`, message: draft.giftMessage || undefined } : null,
        planId: draft.kind === 'SUBSCRIPTION' ? draft.planId ?? undefined : undefined,
      });
      setResult(result);
      haptic.success();
      router.replace({ pathname: '/(customer)/booking/success', params: { id: result.booking.id } } as never);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      toast.error(code === 'INSUFFICIENT_POINTS' ? t('booking.errors.insufficientPoints') : code === 'ADDRESS_REQUIRED' ? t('booking.errors.address') : t('booking.errors.failed'));
    }
  };

  const addAddress = () => {
    if (!newAddress.area || !newAddress.details.trim()) {
      toast.error(t('booking.errors.address'));
      return;
    }
    const addr: SavedAddress = { id: makeId('addr'), label: newAddress.label || t('profile.addresses.title'), area: newAddress.area, details: newAddress.details.trim(), location: null };
    set({ address: addr });
    setNewAddress({ label: '', area: null, details: '' });
  };

  const renderStep = () => {
    if (!c) return <Skeleton height={200} radius={radii.card} />;
    switch (step) {
      case 'item':
        return (
          <View style={{ gap: spacing.md }}>
            {draft.kind === 'PRODUCT' || (draft.productId && !draft.serviceId) ? (
              <View style={styles.productGrid}>
                {(products.data ?? []).map((p) => (
                  <ProductCard key={p.id} product={p} width={'47%' as unknown as number} selected={draft.productId === p.id} onPress={(pr) => set({ productId: pr.id, serviceId: null, kind: 'PRODUCT', planId: null })} />
                ))}
              </View>
            ) : (
              (services.data ?? []).map((s: Service) => <ServiceRow key={s.id} service={s} selected={draft.serviceId === s.id} onPress={(svc) => set({ serviceId: svc.id, productId: null, kind: draft.kind === 'SUBSCRIPTION' && svc.allowSubscription ? 'SUBSCRIPTION' : 'SERVICE', planId: draft.kind === 'SUBSCRIPTION' && svc.allowSubscription ? draft.planId : null, staffId: svc.requiresStaff ? draft.staffId : null })} />)
            )}
            {services.isLoading ? <Skeleton height={90} radius={radii.md} /> : null}
          </View>
        );
      case 'mode':
        return (
          <View style={{ gap: spacing.md }}>
            {c.serviceMode === 'BOTH'
              ? (['ONSITE', 'HOME'] as const).map((m) => (
                  <Pressable key={m} onPress={() => set({ mode: m })} style={[styles.option, { backgroundColor: draft.mode === m ? colors.tint : colors.surface, borderColor: draft.mode === m ? colors.primary : colors.line, borderRadius: radii.card }, shadows.card]}>
                    <IconBubble name={m === 'HOME' ? 'house' : 'building-2'} size={48} />
                    <View style={{ flex: 1 }}>
                      <Text variant="title" weight="semibold">
                        {m === 'HOME' ? t('booking.mode.home') : t('booking.mode.onsite')}
                      </Text>
                      <Text variant="caption" muted>
                        {m === 'HOME' ? t('booking.mode.homeDesc') : t('booking.mode.onsiteDesc')}
                      </Text>
                    </View>
                    {draft.mode === m ? <Icon name="circle-check" size={22} color={colors.primary} /> : null}
                  </Pressable>
                ))
              : null}
            {draft.mode === 'HOME' ? (
              <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                <Text variant="h3">{t('booking.chooseAddress')}</Text>
                {(me.data?.addresses ?? []).map((a) => (
                  <Pressable key={a.id} onPress={() => set({ address: a })} style={[styles.option, { backgroundColor: draft.address?.id === a.id ? colors.tint : colors.surface, borderColor: draft.address?.id === a.id ? colors.primary : colors.line, borderRadius: radii.md }]}>
                    <Icon name="map-pin" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text variant="title" weight="semibold">
                        {a.label}
                      </Text>
                      <Text variant="caption" muted lines={2}>
                        {areaName(a.area)} · {a.details}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {draft.address && !(me.data?.addresses ?? []).some((a) => a.id === draft.address?.id) ? (
                  <View style={[styles.option, { backgroundColor: colors.tint, borderColor: colors.primary, borderRadius: radii.md }]}>
                    <Icon name="map-pin" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text variant="title" weight="semibold">
                        {draft.address.label}
                      </Text>
                      <Text variant="caption" muted lines={2}>
                        {areaName(draft.address.area)} · {draft.address.details}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <Card style={{ gap: spacing.md }}>
                  <Text variant="title" weight="semibold">
                    {t('booking.addAddress')}
                  </Text>
                  <Input label={t('booking.addressLabel')} value={newAddress.label} onChangeText={(v) => setNewAddress((a) => ({ ...a, label: v }))} leftIcon="tag" />
                  <Select label={t('profile.addresses.area')} value={newAddress.area} onChange={(v) => setNewAddress((a) => ({ ...a, area: v }))} options={AREA_KEYS.map((k) => ({ value: k, label: areaName(k), icon: 'map-pin' as const }))} placeholder={t('common.select')} />
                  <TextArea label={t('booking.addressDetails')} value={newAddress.details} onChangeText={(v) => setNewAddress((a) => ({ ...a, details: v }))} />
                  <Button label={t('common.add')} variant="soft" onPress={addAddress} />
                </Card>
              </View>
            ) : null}
          </View>
        );
      case 'type':
        return (
          <View style={{ gap: spacing.md }}>
            {(['SERVICE', 'SUBSCRIPTION'] as const).map((k) => (
              <Pressable key={k} onPress={() => set({ kind: k, planId: k === 'SERVICE' ? null : draft.planId })} style={[styles.option, { backgroundColor: draft.kind === k ? colors.tint : colors.surface, borderColor: draft.kind === k ? colors.primary : colors.line, borderRadius: radii.card }, shadows.card]}>
                <IconBubble name={k === 'SERVICE' ? 'calendar-check' : 'repeat'} size={48} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="semibold">
                    {k === 'SERVICE' ? t('booking.type.oneTime') : t('booking.type.subscription')}
                  </Text>
                  <Text variant="caption" muted>
                    {k === 'SERVICE' ? t('booking.type.oneTimeDesc') : t('booking.type.subscriptionDesc')}
                  </Text>
                </View>
                {draft.kind === k ? <Icon name="circle-check" size={22} color={colors.primary} /> : null}
              </Pressable>
            ))}
            {draft.kind === 'SUBSCRIPTION' && service
              ? service.subscriptionPlans.map((p) => (
                  <Pressable key={p.id} onPress={() => set({ planId: p.id })} style={[styles.plan, { backgroundColor: draft.planId === p.id ? colors.tint : colors.surface, borderColor: draft.planId === p.id ? colors.primary : colors.line, borderRadius: radii.card }, shadows.card]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.row}>
                        <Text variant="title" weight="bold">
                          {localized(p.name)}
                        </Text>
                        {p.isPopular ? <Tag label={t('booking.plan.popular')} tone="primary" icon="crown" /> : null}
                      </View>
                      <Text variant="caption" muted>
                        {t(`booking.plan.perWeek${p.sessionsPerWeek}` as 'booking.plan.perWeek1')} · {t('booking.plan.weeks', { n: p.durationWeeks })} · {t('booking.plan.sessions', { n: p.durationWeeks * p.sessionsPerWeek })}
                      </Text>
                      {p.features.map((f, i) => (
                        <View key={i} style={styles.feature}>
                          <Icon name="check" size={12} color={colors.success} strokeWidth={3} />
                          <Text variant="caption" muted>
                            {localized(f)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <PriceTag price={p.price} offerPrice={p.offerPrice} align="end" />
                  </Pressable>
                ))
              : null}
          </View>
        );
      case 'staff':
        return (
          <View style={{ gap: spacing.md }}>
            <Pressable onPress={() => set({ staffId: null })} style={[styles.option, { backgroundColor: !draft.staffId ? colors.tint : colors.surface, borderColor: !draft.staffId ? colors.primary : colors.line, borderRadius: radii.card }, shadows.card]}>
              <IconBubble name="users" size={48} />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold">
                  {t('staff.anyStaff')}
                </Text>
                <Text variant="caption" muted>
                  {t('staff.anyStaffDesc')}
                </Text>
              </View>
              {!draft.staffId ? <Icon name="circle-check" size={22} color={colors.primary} /> : null}
            </Pressable>
            <View style={styles.productGrid}>
              {(staff.data ?? []).map((s: Staff) => (
                <StaffCard key={s.id} staff={s} width={'47%' as unknown as number} selected={draft.staffId === s.id} onPress={(m) => set({ staffId: m.id })} compact />
              ))}
            </View>
          </View>
        );
      case 'datetime':
        return (
          <View style={{ gap: spacing.lg }}>
            <View style={{ marginHorizontal: -spacing.gutter }}>
              <DateStrip value={draft.date} onChange={(d) => set({ date: d, time: null })} isDisabled={(_d, wd: Weekday) => !c.openingHours[wd]?.open || (staffMember ? !staffMember.availability[wd]?.available : false)} />
            </View>
            {draft.date ? (
              <View style={{ gap: spacing.md }}>
                <Text variant="h3">{t('booking.chooseTime')}</Text>
                {slots.isLoading ? (
                  <Skeleton height={120} radius={radii.md} />
                ) : slots.data?.length ? (
                  <TimeSlotGrid slots={slots.data} value={draft.time} onChange={(time) => set({ time })} />
                ) : (
                  <Card>
                    <Text variant="bodySm" muted align="center">
                      {t('booking.noSlots')}
                    </Text>
                  </Card>
                )}
              </View>
            ) : null}
          </View>
        );
      case 'gift':
        return (
          <View style={{ gap: spacing.md }}>
            <Card style={styles.giftToggle}>
              <IconBubble name="gift" size={48} background={colors.goldTint} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold">
                  {t('booking.gift.toggle')}
                </Text>
                <Text variant="caption" muted>
                  {t('booking.gift.toggleDesc')}
                </Text>
              </View>
              <Switch value={draft.isGift} onValueChange={(v) => set({ isGift: v })} />
            </Card>
            {draft.isGift ? (
              <Card style={{ gap: spacing.md }}>
                <Input label={t('booking.gift.recipientName')} value={draft.giftName} onChangeText={(v) => set({ giftName: v })} leftIcon="user" />
                <PhoneInput label={t('booking.gift.recipientPhone')} value={draft.giftPhone} onChange={(v) => set({ giftPhone: v })} />
                <TextArea label={t('booking.gift.message')} placeholder={t('booking.gift.messagePlaceholder')} value={draft.giftMessage} onChangeText={(v) => set({ giftMessage: v })} />
              </Card>
            ) : null}
          </View>
        );
      case 'confirm':
        return (
          <View style={{ gap: spacing.md }}>
            <Card style={{ gap: spacing.md }}>
              <View style={styles.row}>
                <Avatar uri={c.logoUrl} name={localized(c.name)} size={44} rounded="squircle" />
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="bold">
                    {localized(c.name)}
                  </Text>
                  <Text variant="caption" muted>
                    {areaName(c.area)}
                  </Text>
                </View>
              </View>
              {[
                [t('booking.service'), service ? localized(service.name) : product ? localized(product.name) : ''],
                plan ? [t('booking.subscription'), `${localized(plan.name)} · ${t(`booking.plan.perWeek${plan.sessionsPerWeek}` as 'booking.plan.perWeek1')}`] : null,
                [t('booking.place'), draft.mode === 'HOME' ? `${t('company.serviceMode.HOME')} · ${draft.address?.label ?? ''}` : t('company.serviceMode.ONSITE')],
                staffMember ? [t('booking.staffLabel'), localized(staffMember.name)] : null,
                [t('common.date'), draft.date ? formatDate(draft.date) : ''],
                [t('common.time'), draft.time ? formatTime(draft.time) : ''],
                draft.isGift ? [t('booking.giftTo'), `${draft.giftName} · +974 ${draft.giftPhone}`] : null,
              ]
                .filter(Boolean)
                .map((row) => {
                  const [label, value] = row as [string, string];
                  return (
                    <View key={label} style={styles.summaryRow}>
                      <Text variant="bodySm" muted>
                        {label}
                      </Text>
                      <Text variant="bodySm" weight="semibold" align="end" style={{ flex: 1 }}>
                        {value}
                      </Text>
                    </View>
                  );
                })}
            </Card>
            <Card style={{ gap: spacing.sm }}>
              <Text variant="title" weight="bold">
                {t('booking.priceBreakdown')}
              </Text>
              <View style={styles.summaryRow}>
                <Text variant="bodySm" muted>
                  {t('booking.price')}
                </Text>
                <Text variant="bodySm" numeric weight="semibold">
                  {formatMoney(basePrice)}
                </Text>
              </View>
              {signedIn && redeemable > 0 ? (
                <View style={[styles.summaryRow, { paddingVertical: 6 }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySm" weight="semibold">
                      {t('booking.pointsUse')}
                    </Text>
                    <Text variant="caption" muted>
                      {t('booking.pointsAvailable', { points })} · {t('booking.pointsValue', { points: redeemable, amount: formatMoney(redeemable / 10) })}
                    </Text>
                  </View>
                  <Switch value={draft.usePoints} onValueChange={(v) => set({ usePoints: v })} />
                </View>
              ) : null}
              {discount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text variant="bodySm" color={colors.success}>
                    {t('booking.discount')}
                  </Text>
                  <Text variant="bodySm" numeric weight="semibold" color={colors.success}>
                    -{formatMoney(discount)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.summaryRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 10 }]}>
                <Text variant="title" weight="bold">
                  {t('booking.total')}
                </Text>
                <Text variant="h3" numeric color={colors.primary}>
                  {formatMoney(total)}
                </Text>
              </View>
              <View style={[styles.row, { backgroundColor: colors.goldTint, borderRadius: radii.sm, padding: 10 }]}>
                <Icon name="coins" size={16} color={colors.gold} />
                <Text variant="caption" color={colors.gold} weight="semibold">
                  {t('booking.pointsEarn', { points: Math.round(total) + 20 })}
                </Text>
              </View>
            </Card>
            <TextArea label={t('common.notes')} value={draft.notes} onChangeText={(v) => set({ notes: v })} />
          </View>
        );
      case 'payment':
        return (
          <View style={{ gap: spacing.md }}>
            <Text variant="bodySm" muted>
              {t('booking.payment.secure')}
            </Text>
            {(
              [
                { m: 'CARD', icon: 'credit-card', title: t('booking.payment.card'), desc: t('booking.payment.cardDesc'), enabled: true },
                { m: 'CASH', icon: 'wallet', title: t('booking.payment.cash'), desc: t('booking.payment.cashDesc'), enabled: true },
                { m: 'POINTS', icon: 'coins', title: t('booking.payment.points'), desc: t('booking.payment.pointsDesc'), enabled: canPayWithPoints },
                { m: 'BNPL', icon: 'receipt', title: t('booking.payment.bnpl'), desc: t('booking.payment.bnplDesc'), enabled: basePrice >= 100 },
              ] as { m: PaymentMethod; icon: 'credit-card' | 'wallet' | 'coins' | 'receipt'; title: string; desc: string; enabled: boolean }[]
            ).map((o) => (
              <Pressable key={o.m} disabled={!o.enabled} onPress={() => set({ paymentMethod: o.m, usePoints: o.m === 'POINTS' ? false : draft.usePoints })} style={[styles.option, { backgroundColor: draft.paymentMethod === o.m ? colors.tint : colors.surface, borderColor: draft.paymentMethod === o.m ? colors.primary : colors.line, borderRadius: radii.card, opacity: o.enabled ? 1 : 0.45 }, shadows.card]}>
                <IconBubble name={o.icon} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="semibold">
                    {o.title}
                  </Text>
                  <Text variant="caption" muted>
                    {o.desc}
                  </Text>
                </View>
                {draft.paymentMethod === o.m ? <Icon name="circle-check" size={22} color={colors.primary} /> : null}
              </Pressable>
            ))}
            {draft.paymentMethod === 'CARD' ? (
              <Card style={{ gap: spacing.md }}>
                <Input label={t('booking.card.number')} value={cardNumber} onChangeText={(v) => setCardNumber(v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))} keyboardType="number-pad" leftIcon="credit-card" ltr numeric placeholder="0000 0000 0000 0000" />
                <Input label={t('booking.card.name')} value={cardName} onChangeText={setCardName} leftIcon="user" autoCapitalize="words" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label={t('booking.card.expiry')} value={cardExpiry} onChangeText={(v) => setCardExpiry(v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/'))} keyboardType="number-pad" ltr numeric placeholder="MM/YY" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label={t('booking.card.cvv')} value={cardCvv} onChangeText={(v) => setCardCvv(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" ltr numeric secureTextEntry placeholder="•••" />
                  </View>
                </View>
              </Card>
            ) : null}
            <Card style={[styles.summaryRow, { paddingVertical: 14 }]}>
              <Text variant="title" weight="bold">
                {t('booking.total')}
              </Text>
              <Text variant="h3" numeric color={colors.primary}>
                {formatMoney(total)}
              </Text>
            </Card>
          </View>
        );
      default:
        return null;
    }
  };

  const isLast = step === 'payment';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title={titleKey[step]} variant="maroon" compact onBack={back}>
        <StepDots count={steps.length} index={Math.min(stepIndex, steps.length - 1)} />
      </Header>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 140 }}>
        {company.isLoading ? <Skeleton height={200} radius={radii.card} /> : renderStep()}
      </ScrollView>
      <View style={[styles.sticky, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.line }, shadows.elevated]}>
        <View style={{ flex: 1 }}>
          {basePrice > 0 ? (
            <>
              <Text variant="caption" muted>
                {t('common.total')}
              </Text>
              <Text variant="numeric" numeric weight="bold" color={colors.primary}>
                {formatMoney(total)}
              </Text>
            </>
          ) : null}
        </View>
        <Button label={isLast ? (draft.paymentMethod === 'CARD' ? t('booking.confirmPayAndBook') : t('booking.confirmBooking')) : t('common.continue')} size="lg" rightIcon={isLast ? 'check' : 'arrow-left'} loading={create.isPending} onPress={isLast ? submit : next} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  giftToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sticky: { position: 'absolute', start: 0, end: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
