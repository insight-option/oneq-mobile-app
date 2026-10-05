import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Button, EmptyState, Header, Screen, SkeletonList, Text } from '@/components/ui';
import { NotificationRow } from '@/components/shared';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/data/hooks';
import type { AppNotification } from '@/domain/types';
import { useI18n } from '@/i18n';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

type Row = { type: 'header'; key: string; label: string } | { type: 'item'; key: string; item: AppNotification };

export const NotificationsScreen = ({ workspace }: { workspace?: boolean }) => {
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const { colors, spacing } = useTheme();
  const signedIn = useIsSignedIn();
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const groups = new Map<string, AppNotification[]>();
    (notifications.data ?? []).forEach((n) => {
      const d = dayjs(n.createdAt);
      const key = d.isSame(dayjs(), 'day') ? t('notifications.today') : d.isSame(dayjs().subtract(1, 'day'), 'day') ? t('notifications.yesterday') : formatDate(n.createdAt, 'short');
      groups.set(key, [...(groups.get(key) ?? []), n]);
    });
    groups.forEach((items, label) => {
      out.push({ type: 'header', key: `h-${label}`, label });
      items.forEach((item) => out.push({ type: 'item', key: item.id, item }));
    });
    return out;
  }, [notifications.data, t, formatDate]);

  const open = useCallback(
    (n: AppNotification) => {
      if (!n.read) markRead.mutate(n.id);
      if (n.route) router.push(n.route as never);
    },
    [markRead, router],
  );
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas}>
      <Header title={t('notifications.title')} subtitle={unread ? t('notifications.unread', { count: unread }) : undefined} variant={workspace ? 'workspace' : 'maroon'} compact right={unread ? <Button label={t('notifications.markAll')} size="sm" variant={workspace ? 'soft' : 'glass'} onPress={() => markAll.mutate()} /> : undefined} />
      <FlashList<Row>
        data={signedIn ? rows : []}
        keyExtractor={(r) => r.key}
        getItemType={(r) => r.type}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
              <Text variant="caption" weight="bold" muted>
                {item.label}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }}>
              <NotificationRow item={item.item} onPress={open} />
            </View>
          )
        }
        ListEmptyComponent={!signedIn ? <EmptyState icon="bell" title={t('auth.gate.generic')} actionLabel={t('common.signIn')} onAction={() => void requireAuth('generic')} /> : notifications.isLoading ? <SkeletonList rows={4} /> : <EmptyState icon="bell" title={t('notifications.empty')} body={t('notifications.emptyBody')} />}
        contentContainerStyle={{ paddingBottom: 60 }}
        onRefresh={() => notifications.refetch()}
        refreshing={notifications.isRefetching}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};
