import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, EmptyState, Header, Screen, Skeleton, StatusPill, Text, toast } from '@/components/ui';
import { useClaimGift, useGift } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { buildWhatsAppUrl } from '@/lib/phone';
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

  if (gift.isLoading || !g) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('gifts.voucher')} variant="maroon" compact />
        <View style={{ padding: spacing.gutter }}>
          <Skeleton height={200} radius={radii.media} />
          {!gift.isLoading ? <EmptyState title={t('common.noResults')} /> : null}
        </View>
      </Screen>
    );
  }
  const isRecipient = g.recipientId === session?.userId;
  const canClaim = isRecipient && (g.status === 'PENDING' || g.status === 'DELIVERED');
  const itemLabel = g.kind === 'POINTS' ? t('gift.whatsapp.pointsItem', { points: g.points ?? 0 }) : g.itemName ? localized(g.itemName) : '';

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

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('gifts.voucher')} subtitle={g.code} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <GiftVoucher senderName={g.senderName} itemLabel={itemLabel} companyLabel={g.companyName ? localized(g.companyName) : null} amountLabel={typeof g.amount === 'number' && g.kind !== 'POINTS' ? formatMoney(g.amount) : null} message={g.message} kind={g.kind} code={g.code} />
        <Card style={{ gap: 10 }}>
          <View style={styles.row}>
            <Text variant="bodySm" muted>
              {t('common.status')}
            </Text>
            <StatusPill status={g.status} label={t(`giftStatus.${g.status}` as 'giftStatus.PENDING')} />
          </View>
          {[
            [t('gifts.from', { name: '' }).trim(), `${g.senderName} · ${g.senderPhone}`],
            [t('gifts.to', { name: '' }).trim(), `${g.recipientName ?? ''} · ${g.recipientPhone}`],
            [t('common.date'), formatRelative(g.createdAt)],
          ].map(([label, value]) => (
            <View key={label} style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
              <Text variant="bodySm" muted>
                {label}
              </Text>
              <Text variant="bodySm" weight="semibold" align="end" style={{ flex: 1 }}>
                {value}
              </Text>
            </View>
          ))}
        </Card>
        {canClaim ? <Button label={g.kind === 'POINTS' ? t('gifts.claim') : t('gifts.schedule')} size="lg" fullWidth leftIcon="gift" loading={claim.isPending} onPress={onClaim} /> : null}
        {g.status === 'WHATSAPP_SENT' && g.senderId === session?.userId ? (
          <Button label={t('gifts.send.openWhatsapp')} variant="secondary" size="lg" fullWidth leftIcon="send" onPress={() => Linking.openURL(buildWhatsAppUrl(g.recipientPhone, t('gift.whatsapp.message', { sender: g.senderName, item: itemLabel, message: g.message ?? '', link: 'https://oneq.qa/app' }))).catch(() => undefined)} />
        ) : null}
        {g.companyId ? <Button label={localized(g.companyName ?? { ar: '', en: '' })} variant="outline" fullWidth leftIcon="store" onPress={() => router.push(`/(customer)/company/${g.companyId}` as never)} /> : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 } });
