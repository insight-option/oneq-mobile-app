import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, EmptyState, Header, Icon, IconBubble, Screen, Skeleton, Text, type IconName } from '@/components/ui';
import { LoyaltyCard } from '@/components/shared';
import { useLoyalty, useLoyaltyHistory } from '@/data/hooks';
import type { PointsTxType } from '@/domain/types';
import { useI18n } from '@/i18n';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

const txIcon: Record<PointsTxType, IconName> = { WELCOME: 'party-popper', EARN_BOOKING: 'calendar-check', REDEEM: 'wallet', GIFT_SENT: 'send', GIFT_RECEIVED: 'gift', BONUS: 'sparkles', ADJUST: 'refresh-cw' };

export const LoyaltyScreen = () => {
  const router = useRouter();
  const { t, localized, formatRelative } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const signedIn = useIsSignedIn();
  const account = useLoyalty();
  const history = useLoyaltyHistory();

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('loyalty.title')} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        {!signedIn ? (
          <EmptyState icon="coins" title={t('auth.gate.points')} actionLabel={t('common.signIn')} onAction={() => void requireAuth('points')} />
        ) : account.isLoading || !account.data ? (
          <Skeleton height={160} radius={radii.card} />
        ) : (
          <LoyaltyCard account={account.data} />
        )}
        {signedIn ? (
          <View style={styles.row}>
            <Button label={t('loyalty.usePoints')} variant="soft" leftIcon="wallet" style={{ flex: 1 }} onPress={() => router.push('/(customer)/(tabs)' as never)} />
            <Button label={t('loyalty.giftPoints')} leftIcon="gift" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(customer)/gift/send', params: { kind: 'POINTS' } } as never)} />
          </View>
        ) : null}
        <Card style={{ gap: 12 }}>
          <Text variant="title" weight="bold">
            {t('loyalty.how')}
          </Text>
          {(['loyalty.rule1', 'loyalty.rule2', 'loyalty.rule3', 'loyalty.rule4'] as const).map((k, i) => (
            <View key={k} style={styles.row}>
              <IconBubble name={(['coins', 'calendar-check', 'percent', 'gift'] as IconName[])[i]} size={36} />
              <Text variant="bodySm" style={{ flex: 1 }}>
                {t(k)}
              </Text>
            </View>
          ))}
        </Card>
        {signedIn ? (
          <Card style={{ gap: 4 }}>
            <Text variant="title" weight="bold" style={{ marginBottom: 6 }}>
              {t('loyalty.history')}
            </Text>
            {history.isLoading ? <Skeleton height={80} /> : null}
            {(history.data ?? []).map((tx) => (
              <View key={tx.id} style={[styles.row, { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                <IconBubble name={txIcon[tx.type]} size={40} background={tx.delta >= 0 ? colors.successTint : colors.dangerTint} color={tx.delta >= 0 ? colors.success : colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" weight="semibold" lines={1}>
                    {localized(tx.note)}
                  </Text>
                  <Text variant="caption" muted>
                    {t(`pointsTx.${tx.type}` as 'pointsTx.BONUS')} · {formatRelative(tx.createdAt)}
                  </Text>
                </View>
                <Text variant="numeric" numeric weight="bold" color={tx.delta >= 0 ? colors.success : colors.danger}>
                  {tx.delta >= 0 ? '+' : ''}
                  {tx.delta}
                </Text>
              </View>
            ))}
            {!history.isLoading && !history.data?.length ? (
              <View style={styles.row}>
                <Icon name="hourglass" size={16} color={colors.faint} />
                <Text variant="bodySm" muted>
                  {t('loyalty.empty')}
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
