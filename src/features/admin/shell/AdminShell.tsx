import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconBubble, Text, type IconName } from '@/components/ui';
import type { ActivityLog, Company } from '@/domain/types';
import { useI18n, type TKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { completionOf } from '@/features/company/shell/CompanyShell';
import { useWorkspaceSignOut, WorkspaceHeader, type WorkspaceMenuItem } from '@/features/company/shell/WorkspaceHeader';

/** Top bar for every admin screen: OneQ avatar, "Admin" pill, drawer menu, AR/EN toggle. */
export const AdminHeader = () => {
  const { t } = useI18n();
  const signOut = useWorkspaceSignOut();
  const menu: WorkspaceMenuItem[] = [
    { icon: 'layout-dashboard', label: t('tabs.admin.dashboard'), route: '/(admin)/(tabs)' },
    { icon: 'building-2', label: t('tabs.admin.companies'), route: '/(admin)/(tabs)/companies' },
    { icon: 'tags', label: t('tabs.admin.categories'), route: '/(admin)/(tabs)/categories' },
    { icon: 'calendar-check', label: t('tabs.admin.bookings'), route: '/(admin)/(tabs)/bookings' },
    { icon: 'chart-line', label: t('ad.more.performance'), route: '/(admin)/performance' },
    { icon: 'bell-ring', label: t('ad.more.notifications'), route: '/(admin)/notifications' },
    { icon: 'users', label: t('ad.more.customers'), route: '/(admin)/customers' },
    { icon: 'message-circle', label: t('ad.more.broadcast'), route: '/(admin)/broadcast' },
    { icon: 'languages', label: t('ad.more.language'), route: '/(admin)/language' },
    { icon: 'log-out', label: t('ad.more.logout'), onPress: () => void signOut(), danger: true },
  ];
  return <WorkspaceHeader name={t('ad.title')} status={{ label: t('ad.badge'), tone: 'active' }} menu={menu} menuTitle={t('cw.menu.title')} dark />;
};

/** Admin-facing status of a company: live, complete-but-paused, or still completing its profile. */
export const adminCompanyStatus = (c: Company): { tone: 'active' | 'inactive' | 'pending'; key: TKey } =>
  c.isActive ? { tone: 'active', key: 'ad.companies.status.active' } : completionOf(c).complete ? { tone: 'inactive', key: 'ad.companies.status.inactive' } : { tone: 'pending', key: 'ad.companies.status.pending' };

const ACTIVITY_ICON: Record<ActivityLog['action'], IconName> = {
  SERVICE_CREATED: 'sparkles',
  SERVICE_UPDATED: 'pencil',
  PRODUCT_CREATED: 'package',
  PRODUCT_UPDATED: 'pencil',
  OFFER_SET: 'tag',
  OFFER_REMOVED: 'x',
  STAFF_CREATED: 'user-plus',
  STAFF_UPDATED: 'user',
  PROFILE_UPDATED: 'briefcase',
  COMPANY_CREATED: 'building-2',
  CATEGORY_CREATED: 'tags',
};

/** One line of the admin activity feed (company added/modified a service, product, offer, staff member…). */
export const ActivityRow = ({ item, onPress, divider }: { item: ActivityLog; onPress?: (a: ActivityLog) => void; divider?: boolean }) => {
  const { t, localized, formatRelative } = useI18n();
  const { colors, spacing } = useTheme();
  return (
    <Pressable onPress={() => onPress?.(item)} style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: 12, borderTopWidth: divider ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.line }]}>
      <IconBubble name={ACTIVITY_ICON[item.action]} size={40} iconSize={18} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySm" weight="semibold" lines={1}>
          {item.companyName ? `${localized(item.companyName)} · ` : ''}
          {t(`ad.activity.${item.action}` as TKey)}
        </Text>
        <Text variant="caption" muted lines={2}>
          {localized(item.summary)}
        </Text>
      </View>
      <Text variant="caption" muted>
        {formatRelative(item.createdAt)}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
