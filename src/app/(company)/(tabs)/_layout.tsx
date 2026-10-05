import React, { useCallback, useMemo } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar, type TabBarProps, type TabItem } from '@/components/ui/TabBar';
import { useI18n } from '@/i18n';

export default function CompanyTabsLayout() {
  const { t } = useI18n();
  const items = useMemo<TabItem[]>(
    () => [
      { name: 'index', label: t('tabs.company.home'), icon: 'layout-dashboard' },
      { name: 'bookings', label: t('tabs.company.bookings'), icon: 'calendar-check' },
      { name: 'catalog', label: t('tabs.company.catalog'), icon: 'tags' },
      { name: 'staff', label: t('tabs.company.staff'), icon: 'users' },
      { name: 'more', label: t('tabs.company.more'), icon: 'menu' },
    ],
    [t],
  );
  const renderTabBar = useCallback((props: Omit<TabBarProps, 'items' | 'variant'>) => <TabBar {...props} items={items} variant="workspace" />, [items]);
  return (
    <Tabs tabBar={renderTabBar as never} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, lazy: true }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.company.home') }} />
      <Tabs.Screen name="bookings" options={{ title: t('tabs.company.bookings') }} />
      <Tabs.Screen name="catalog" options={{ title: t('tabs.company.catalog') }} />
      <Tabs.Screen name="staff" options={{ title: t('tabs.company.staff') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.company.more') }} />
    </Tabs>
  );
}
