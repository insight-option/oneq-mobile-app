import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Avatar, BottomSheet, Button, Card, ConfirmContent, EmptyState, Header, Icon, Screen, Skeleton, StatusPill, Text, toast, type BottomSheetRef } from '@/components/ui';
import { SubscriptionCard } from '@/components/shared';
import { useCancelSubscription, useSubscription } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export const SubscriptionDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, localized, formatDate, formatMoney } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const sub = useSubscription(id);
  const cancel = useCancelSubscription();
  const confirmRef = useRef<BottomSheetRef>(null);
  const s = sub.data;

  const upcoming = useMemo(() => {
    if (!s || s.status !== 'ACTIVE') return [] as string[];
    const out: string[] = [];
    const step = Math.max(1, Math.floor(7 / s.sessionsPerWeek));
    let d = dayjs().add(1, 'day');
    while (out.length < 4 && d.isBefore(dayjs(s.endDate))) {
      out.push(d.format('YYYY-MM-DD'));
      d = d.add(step, 'day');
    }
    return out;
  }, [s]);

  if (sub.isLoading || !s) {
    return (
      <Screen edges={[]} background={colors.canvas}>
        <Header title={t('sub.title')} variant="maroon" compact />
        <View style={{ padding: spacing.gutter, gap: spacing.md }}>
          <Skeleton height={200} radius={radii.card} />
          {!sub.isLoading ? <EmptyState title={t('common.noResults')} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('sub.title')} subtitle={s.code} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <SubscriptionCard sub={s} />
        <Card style={{ gap: 10 }}>
          <View style={styles.row}>
            <Avatar uri={s.companyLogoUrl} name={localized(s.companyName)} size={44} rounded="squircle" />
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="bold">
                {localized(s.companyName)}
              </Text>
              <Text variant="caption" muted>
                {localized(s.serviceName)}
              </Text>
            </View>
            <StatusPill status={s.status} label={t(`subStatus.${s.status}` as 'subStatus.ACTIVE')} />
          </View>
          {[
            [t('sub.plan'), localized(s.planName)],
            [t('sub.perWeek', { n: s.sessionsPerWeek }), t('sub.sessions', { used: s.usedSessions, total: s.totalSessions })],
            [t('sub.started'), formatDate(s.startDate, 'long')],
            [t('sub.ends'), formatDate(s.endDate, 'long')],
            [t('common.price'), formatMoney(s.price)],
            [t('sub.reference'), s.code],
          ].map(([label, value]) => (
            <View key={label} style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
              <Text variant="bodySm" muted>
                {label}
              </Text>
              <Text variant="bodySm" weight="semibold" numeric align="end" style={{ flex: 1 }}>
                {value}
              </Text>
            </View>
          ))}
          <Text variant="caption" muted align="center">
            {t('sub.showAtReception')}
          </Text>
        </Card>
        {upcoming.length ? (
          <Card style={{ gap: 10 }}>
            <Text variant="title" weight="bold">
              {t('sub.nextSessions')}
            </Text>
            {upcoming.map((d) => (
              <View key={d} style={styles.row}>
                <Icon name="calendar" size={16} color={colors.primary} />
                <Text variant="bodySm">{formatDate(d)}</Text>
              </View>
            ))}
          </Card>
        ) : null}
        {s.status === 'ACTIVE' ? <Button label={t('sub.cancel')} variant="danger" fullWidth onPress={() => confirmRef.current?.open()} /> : <Button label={t('sub.renew')} fullWidth leftIcon="repeat" onPress={() => router.push({ pathname: '/(customer)/booking/[companyId]', params: { companyId: s.companyId, serviceId: s.serviceId, planId: s.planId } } as never)} />}
      </View>
      <BottomSheet ref={confirmRef}>
        <ConfirmContent
          title={t('sub.cancelConfirm')}
          confirmLabel={t('sub.cancel')}
          cancelLabel={t('common.back')}
          danger
          onCancel={() => confirmRef.current?.close()}
          onConfirm={async () => {
            try {
              await cancel.mutateAsync(s.id);
              toast.success(t('common.done'));
            } catch {
              toast.error(t('common.error'));
            }
            confirmRef.current?.close();
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
