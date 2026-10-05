import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Avatar, Button, Card, Chip, Header, Icon, IconBubble, Input, NumberStepper, PhoneInput, Skeleton, StepDots, Text, TextArea, toast } from '@/components/ui';
import { CompanyListRow, ProductCard, ServiceRow } from '@/components/shared';
import { repo } from '@/data';
import { useCompanies, useCompany, useLoyalty, useProducts, useSendGift, useServices } from '@/data/hooks';
import type { GiftKind, RecipientLookup } from '@/domain/types';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { isValidQatarPhone, normalizeQatarPhone, samePhone } from '@/lib/phone';
import { useGiftDraft } from '@/store/giftDraft';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { useCompanyActions } from '../catalog/useCatalogHelpers';
import { GiftVoucher } from './GiftVoucher';

type Step = 'kind' | 'item' | 'amount' | 'recipient' | 'preview' | 'success';

export const SendGiftWizard = () => {
  const params = useLocalSearchParams<{ kind?: string; companyId?: string; serviceId?: string; productId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, localized, formatMoney } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const session = useSession();
  const loyalty = useLoyalty();
  const send = useSendGift();
  const { draft, set, reset, lastResult, setResult } = useGiftDraft();
  const paramKind = (params.kind as GiftKind | undefined) ?? null;
  const [step, setStep] = useState<Step>(() => (paramKind ? (paramKind === 'POINTS' ? 'amount' : params.serviceId || params.productId ? 'recipient' : 'item') : 'kind'));
  const [companyQuery, setCompanyQuery] = useState('');
  const [lookup, setLookup] = useState<RecipientLookup | null>(null);
  const [checking, setChecking] = useState(false);
  const companies = useCompanies({ query: companyQuery || undefined, limit: 30 }, { enabled: step === 'item' && !draft.companyId });
  const services = useServices(draft.companyId ?? undefined);
  const products = useProducts(draft.companyId ?? undefined);
  const { subcategoryLabel } = useCompanyActions();

  // The route keys this wizard by its params, so the draft is reset once per entry point.
  useEffect(() => {
    reset({ kind: paramKind, companyId: params.companyId ?? null, serviceId: params.serviceId ?? null, productId: params.productId ?? null });
  }, [paramKind, params.companyId, params.serviceId, params.productId, reset]);

  const companyData = useCompany(draft.companyId ?? undefined);
  const company = companyData.data ?? null;
  const service = useMemo(() => services.data?.find((s) => s.id === draft.serviceId) ?? null, [services.data, draft.serviceId]);
  const product = useMemo(() => products.data?.find((p) => p.id === draft.productId) ?? null, [products.data, draft.productId]);
  const balance = loyalty.data?.points ?? 0;
  const itemLabel = draft.kind === 'POINTS' ? t('gift.whatsapp.pointsItem', { points: draft.points }) : service ? localized(service.name) : product ? localized(product.name) : '';
  const amount = draft.kind === 'POINTS' ? null : service ? service.offerPrice ?? service.price : product ? product.offerPrice ?? product.price : null;
  const companyName = company ? localized(company.name) : '';

  const stepsOrder = useMemo<Step[]>(() => (draft.kind === 'POINTS' ? ['kind', 'amount', 'recipient', 'preview'] : ['kind', 'item', 'recipient', 'preview']), [draft.kind]);
  const stepIndex = Math.max(0, stepsOrder.indexOf(step));

  const titles: Record<Step, string> = {
    kind: t('gifts.send.kind'),
    item: t('gifts.send.chooseItem'),
    amount: t('gifts.send.amount'),
    recipient: t('gifts.send.recipient'),
    preview: t('gifts.send.preview'),
    success: t('gifts.send.success'),
  };

  const back = useCallback(() => {
    if (step === 'kind' || step === 'success') {
      router.back();
      return;
    }
    if (step === 'item' && draft.companyId && !params.companyId) {
      set({ companyId: null, serviceId: null, productId: null });
      return;
    }
    setStep(stepsOrder[Math.max(0, stepIndex - 1)]);
  }, [step, draft.companyId, params.companyId, set, stepsOrder, stepIndex, router]);

  const goRecipient = () => {
    if (draft.kind === 'POINTS') {
      if (draft.points < 50) {
        toast.error(t('gifts.errors.minPoints'));
        return;
      }
      if (draft.points > balance) {
        toast.error(t('gifts.errors.insufficient'));
        return;
      }
    } else if (!draft.serviceId && !draft.productId) {
      toast.error(t('gifts.errors.chooseItem'));
      return;
    }
    haptic.light();
    setStep('recipient');
  };

  const checkRecipient = async () => {
    const phone = normalizeQatarPhone(draft.recipientPhone);
    if (!phone || !isValidQatarPhone(phone)) {
      toast.error(t('gifts.errors.recipient'));
      return;
    }
    if (samePhone(phone, session?.phone)) {
      toast.error(t('gifts.errors.selfGift'));
      return;
    }
    setChecking(true);
    try {
      const res = await repo.gifts.lookupRecipient(phone);
      setLookup(res);
      if (res.registered && res.name && !draft.recipientName) set({ recipientName: res.name });
      haptic.light();
      setStep('preview');
    } catch {
      toast.error(t('gifts.lookupError'));
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    try {
      const result = await send.mutateAsync({
        kind: draft.kind ?? 'POINTS',
        recipientPhone: `+974${draft.recipientPhone}`,
        recipientName: draft.recipientName.trim() || undefined,
        message: draft.message.trim() || undefined,
        points: draft.kind === 'POINTS' ? draft.points : undefined,
        companyId: draft.companyId ?? undefined,
        serviceId: draft.serviceId ?? undefined,
        productId: draft.productId ?? undefined,
        paymentMethod: draft.kind === 'POINTS' ? undefined : draft.paymentMethod,
      });
      setResult(result);
      haptic.success();
      setStep('success');
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      toast.error(code === 'MIN_POINTS' ? t('gifts.errors.minPoints') : code === 'INSUFFICIENT_POINTS' ? t('gifts.errors.insufficient') : code === 'SELF_GIFT' ? t('gifts.errors.selfGift') : t('common.error'));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'kind':
        return (
          <View style={{ gap: spacing.md }}>
            {(
              [
                { k: 'POINTS', icon: 'coins', title: t('gifts.kind.POINTS'), desc: t('gifts.kind.pointsDesc') },
                { k: 'SERVICE', icon: 'sparkles', title: t('gifts.kind.SERVICE'), desc: t('gifts.kind.serviceDesc') },
                { k: 'PRODUCT', icon: 'package', title: t('gifts.kind.PRODUCT'), desc: t('gifts.kind.productDesc') },
              ] as { k: GiftKind; icon: 'coins' | 'sparkles' | 'package'; title: string; desc: string }[]
            ).map((o) => (
              <Pressable
                key={o.k}
                onPress={() => {
                  set({ kind: o.k, serviceId: null, productId: null });
                  haptic.selection();
                  setStep(o.k === 'POINTS' ? 'amount' : 'item');
                }}
                style={({ pressed }) => [styles.option, { backgroundColor: draft.kind === o.k ? colors.tint : colors.surface, borderColor: draft.kind === o.k ? colors.primary : colors.line, borderRadius: radii.card, opacity: pressed ? 0.9 : 1 }, shadows.card]}>
                <IconBubble name={o.icon} size={52} background={colors.goldTint} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="bold">
                    {o.title}
                  </Text>
                  <Text variant="caption" muted>
                    {o.desc}
                  </Text>
                </View>
                <Icon name="chevron-left" size={20} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        );
      case 'amount':
        return (
          <View style={{ gap: spacing.lg }}>
            <Card style={{ alignItems: 'center', gap: spacing.md }}>
              <IconBubble name="coins" size={64} iconSize={30} background={colors.goldTint} color={colors.gold} />
              <NumberStepper value={draft.points} onChange={(v) => set({ points: v })} min={50} max={Math.max(50, balance)} step={50} suffix={t('common.points')} />
              <View style={styles.wrap}>
                {[100, 200, 500].map((v) => (
                  <Chip key={v} label={String(v)} selected={draft.points === v} onPress={() => set({ points: v })} disabled={v > balance} />
                ))}
              </View>
              <Text variant="caption" muted>
                {t('gifts.send.balance', { points: balance })}
              </Text>
            </Card>
            <Button label={t('common.continue')} size="lg" fullWidth rightIcon="arrow-left" onPress={goRecipient} />
          </View>
        );
      case 'item':
        if (!draft.companyId) {
          return (
            <View style={{ gap: spacing.md }}>
              <Input placeholder={t('search.placeholder')} value={companyQuery} onChangeText={setCompanyQuery} leftIcon="search" />
              {companies.isLoading ? <Skeleton height={64} radius={radii.md} /> : null}
              {(companies.data ?? []).map((c) => (
                <CompanyListRow key={c.id} company={c} subcategoryLabel={subcategoryLabel(c)} onPress={(co) => set({ companyId: co.id })} />
              ))}
            </View>
          );
        }
        return (
          <View style={{ gap: spacing.md }}>
            {company ? (
              <Card padding={spacing.md} style={styles.option}>
                <Avatar uri={company.logoUrl} name={localized(company.name)} size={40} rounded="squircle" />
                <Text variant="title" weight="semibold" style={{ flex: 1 }}>
                  {localized(company.name)}
                </Text>
                <Button label={t('common.change')} size="sm" variant="ghost" onPress={() => set({ companyId: null, serviceId: null, productId: null })} />
              </Card>
            ) : null}
            {draft.kind === 'SERVICE' ? (
              (services.data ?? []).map((s) => <ServiceRow key={s.id} service={s} selected={draft.serviceId === s.id} onPress={(svc) => set({ serviceId: svc.id, productId: null })} compact />)
            ) : (
              <View style={styles.productGrid}>
                {(products.data ?? []).map((p) => (
                  <ProductCard key={p.id} product={p} width={'47%' as unknown as number} selected={draft.productId === p.id} onPress={(pr) => set({ productId: pr.id, serviceId: null })} />
                ))}
                {!products.isLoading && !products.data?.length ? (
                  <Text variant="bodySm" muted>
                    {t('company.noProducts')}
                  </Text>
                ) : null}
              </View>
            )}
            <Button label={t('common.continue')} size="lg" fullWidth rightIcon="arrow-left" onPress={goRecipient} />
          </View>
        );
      case 'recipient':
        return (
          <View style={{ gap: spacing.lg }}>
            <Card style={{ gap: spacing.md }}>
              <PhoneInput label={t('gifts.send.recipientPhone')} value={draft.recipientPhone} onChange={(v) => set({ recipientPhone: v })} autoFocus />
              <Input label={t('gifts.send.recipientName')} value={draft.recipientName} onChangeText={(v) => set({ recipientName: v })} leftIcon="user" />
              <TextArea label={t('gifts.send.message')} placeholder={t('gifts.send.messagePlaceholder')} value={draft.message} onChangeText={(v) => set({ message: v })} />
              <View style={styles.wrap}>
                {(['gifts.send.suggestion1', 'gifts.send.suggestion2', 'gifts.send.suggestion3'] as const).map((k) => (
                  <Chip key={k} label={t(k)} size="sm" onPress={() => set({ message: t(k) })} />
                ))}
              </View>
            </Card>
            <Button label={t('common.continue')} size="lg" fullWidth rightIcon="arrow-left" loading={checking} onPress={checkRecipient} />
          </View>
        );
      case 'preview':
        return (
          <View style={{ gap: spacing.lg }}>
            <GiftVoucher senderName={session?.name ?? ''} itemLabel={itemLabel} companyLabel={companyName || null} amountLabel={amount ? formatMoney(amount) : null} message={draft.message} kind={draft.kind ?? 'POINTS'} />
            <Card style={[styles.option, { backgroundColor: lookup?.registered ? colors.successTint : colors.goldTint }]} shadow="none">
              <IconBubble name={lookup?.registered ? 'badge-check' : 'message-circle-more'} size={44} background="rgba(255,255,255,0.7)" color={lookup?.registered ? colors.success : colors.gold} />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="bold" color={lookup?.registered ? colors.success : colors.gold}>
                  {lookup?.registered ? t('gifts.send.registered') : t('gifts.send.notRegistered')}
                </Text>
                <Text variant="caption" muted>
                  {lookup?.registered ? t('gifts.send.registeredBody') : t('gifts.send.notRegisteredBody')}
                </Text>
                <Text variant="caption" numeric weight="semibold">
                  {draft.recipientName ? `${draft.recipientName} · ` : ''}+974 {draft.recipientPhone}
                </Text>
              </View>
            </Card>
            {draft.kind !== 'POINTS' ? (
              <View style={styles.wrap}>
                <Chip label={t('booking.payment.card')} icon="credit-card" selected={draft.paymentMethod === 'CARD'} onPress={() => set({ paymentMethod: 'CARD' })} />
                <Chip label={t('booking.payment.bnpl')} icon="receipt" selected={draft.paymentMethod === 'BNPL'} onPress={() => set({ paymentMethod: 'BNPL' })} />
              </View>
            ) : null}
            <Button label={t('gifts.send.confirm')} size="lg" fullWidth leftIcon="send" loading={send.isPending} onPress={submit} />
          </View>
        );
      case 'success':
        return (
          <View style={{ gap: spacing.lg, alignItems: 'center' }}>
            <IconBubble name="party-popper" size={96} iconSize={44} background={colors.successTint} color={colors.success} />
            <Text variant="h1" align="center">
              {lastResult?.whatsappUrl ? t('gifts.send.successWhatsapp') : t('gifts.send.success')}
            </Text>
            <Text variant="bodySm" muted align="center">
              {lastResult?.whatsappUrl ? t('gifts.send.successWhatsappBody') : t('gifts.send.successBody', { name: draft.recipientName || `+974 ${draft.recipientPhone}` })}
            </Text>
            <View style={{ width: '100%' }}>
              <GiftVoucher senderName={session?.name ?? ''} itemLabel={itemLabel} companyLabel={companyName || null} amountLabel={amount ? formatMoney(amount) : null} message={draft.message} kind={draft.kind ?? 'POINTS'} code={lastResult?.gift.code} />
            </View>
            {lastResult?.whatsappUrl ? (
              <>
                <Button label={t('gifts.send.openWhatsapp')} size="lg" fullWidth leftIcon="send" variant="secondary" onPress={() => Linking.openURL(lastResult.whatsappUrl as string).catch(() => toast.error(t('common.error')))} />
                <Button
                  label={t('gifts.send.copyLink')}
                  variant="ghost"
                  onPress={async () => {
                    const text = decodeURIComponent((lastResult.whatsappUrl as string).split('text=')[1] ?? '');
                    await Clipboard.setStringAsync(text);
                    toast.success(t('common.copied'));
                  }}
                />
              </>
            ) : null}
            <Button label={t('gifts.title')} size="lg" fullWidth onPress={() => router.replace('/(customer)/(tabs)/gifts' as never)} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title={titles[step]} variant="maroon" compact onBack={back}>
        {step !== 'success' ? <StepDots count={stepsOrder.length} index={stepIndex} /> : null}
      </Header>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + 40 }}>
        {renderStep()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
});
