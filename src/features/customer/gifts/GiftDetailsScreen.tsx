import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, EmptyState, Header, Icon, PremiumGlyph, Screen, Skeleton, StatusPill, Text, toast, type IconName } from '@/components/ui';
import { useCategories, useClaimGift, useCompany, useGift } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { buildWhatsAppUrl, formatPhone } from '@/lib/phone';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { GiftVoucher } from './GiftVoucher';

export const GiftDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, localized, formatMoney, formatRelative } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const session = useSession();
  const gift = useGift(id);
  const claim = useClaimGift();
  const g = gift.data;
  const company = useCompany(g?.companyId ?? undefined);
  const categories = useCategories();

  if (gift.isLoading || !g) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('gifts.voucher')} variant="maroon" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={320} radius={radii.media} />
          {!gift.isLoading ? <EmptyState title={t('common.noResults')} /> : null}
        </View>
      </Screen>
    );
  }
  const isRecipient = g.recipientId === session?.userId;
  const canClaim = isRecipient && (g.status === 'PENDING' || g.status === 'DELIVERED');
  const itemLabel = g.kind === 'POINTS' ? t('gift.whatsapp.pointsItem', { points: g.points ?? 0 }) : g.itemName ? localized(g.itemName) : '';
  const categoryIcon = categories.data?.find((c) => c.id === company.data?.categoryId)?.icon ?? null;

  const onClaim = async () => {
    try {
      const claimed = await claim.mutateAsync(g.id);
      if (claimed.kind === 'POINTS') toast.success(t('gifts.claimPoints', { points: claimed.points ?? 0 }));
      else {
        toast.success(t('gifts.claimService'));
        router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: claimed.companyId ?? '', serviceId: claimed.serviceId ?? '', productId: claimed.productId ?? '', giftId: claimed.id } } as never);
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const rows: { icon: IconName; label: string; value: string; numeric?: boolean }[] = [
    { icon: 'user', label: t('gifts.card.from'), value: `${g.senderName}${g.senderPhone ? ` · ${formatPhone(g.senderPhone)}` : ''}` },
    { icon: 'user-round', label: t('gifts.card.to'), value: `${g.recipientName ? `${g.recipientName} · ` : ''}${formatPhone(g.recipientPhone)}` },
    { icon: 'calendar', label: t('common.date'), value: formatRelative(g.createdAt) },
    ...(g.code ? [{ icon: 'ticket' as IconName, label: t('gifts.card.code'), value: g.code, numeric: true }] : []),
  ];

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('gifts.voucher')} subtitle={g.code} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        {/* celebratory heading: a gift for you (recipient) or on its way (sender) */}
        <View style={styles.hero}>
          <PremiumGlyph name={isRecipient ? 'party-popper' : 'gift'} size={46} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h2">{isRecipient ? t('gifts.details.forYou') : t('gifts.details.sentTitle')}</Text>
            <Text variant="bodySm" muted>
              {isRecipient ? t('gifts.details.forYouBody', { name: g.senderName }) : t('gifts.details.sentBody', { name: g.recipientName || formatPhone(g.recipientPhone) })}
            </Text>
          </View>
        </View>

        <GiftVoucher senderName={g.senderName} itemLabel={itemLabel} companyLabel={g.companyName ? localized(g.companyName) : null} amountLabel={typeof g.amount === 'number' && g.kind !== 'POINTS' ? formatMoney(g.amount) : null} message={g.message} kind={g.kind} code={g.code} recipientName={g.recipientName} categoryIcon={categoryIcon} />

        {canClaim ? <Button label={g.kind === 'POINTS' ? t('gifts.claim') : t('gifts.schedule')} size="lg" fullWidth leftIcon="gift" loading={claim.isPending} onPress={onClaim} /> : null}

        <Card padding={spacing.md}>
          <View style={[styles.row, { paddingBottom: 12 }]}>
            <Text variant="title" weight="bold">
              {t('gifts.details.info')}
            </Text>
            <StatusPill status={g.status} label={t(`giftStatus.${g.status}` as 'giftStatus.PENDING')} />
          </View>
          {rows.map((r) => (
            <View key={r.label} style={[styles.row, styles.infoRow, { borderTopColor: colors.line }]}>
              <View style={styles.label}>
                <Icon name={r.icon} size={16} color={colors.faint} />
                <Text variant="bodySm" muted>
                  {r.label}
                </Text>
              </View>
              <Text variant="bodySm" weight="semibold" numeric={r.numeric} align="end" style={{ flex: 1 }} lines={2}>
                {r.value}
              </Text>
            </View>
          ))}
        </Card>

        {g.status === 'WHATSAPP_SENT' && g.senderId === session?.userId ? (
          <Button label={t('gifts.send.openWhatsapp')} variant="secondary" size="lg" fullWidth leftIcon="send" onPress={() => Linking.openURL(buildWhatsAppUrl(g.recipientPhone, t('gift.whatsapp.message', { sender: g.senderName, item: itemLabel, message: g.message ?? '', link: 'https://oneq.qa/app' }))).catch(() => undefined)} />
        ) : null}
        {g.companyId ? <Button label={localized(g.companyName ?? { ar: '', en: '' })} variant="outline" fullWidth leftIcon="store" onPress={() => router.push(`/(customer)/company/${g.companyId}` as never)} /> : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 11 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
