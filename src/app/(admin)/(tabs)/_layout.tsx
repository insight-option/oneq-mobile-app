import React, { useCallback, useMemo } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar, type TabBarProps, type TabItem } from '@/components/ui/TabBar';
import { useI18n } from '@/i18n';

export default function AdminTabsLayout() {
  const { t } = useI18n();
  const items = useMemo<TabItem[]>(
    () => [
      { name: 'index', label: t('tabs.admin.dashboard'), icon: 'layout-dashboard' },
      { name: 'companies', label: t('tabs.admin.companies'), icon: 'building-2' },
      { name: 'bookings', label: t('tabs.admin.bookings'), icon: 'calendar-check' },
      { name: 'categories', label: t('tabs.admin.categories'), icon: 'tags' },
      { name: 'more', label: t('tabs.admin.more'), icon: 'menu' },
    ],
    [t],
  );
  const renderTabBar = useCallback((props: Omit<TabBarProps, 'items' | 'variant'>) => <TabBar {...props} items={items} variant="workspace" />, [items]);
  return (
    <Tabs tabBar={renderTabBar as never} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, lazy: true }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.admin.dashboard') }} />
      <Tabs.Screen name="companies" options={{ title: t('tabs.admin.companies') }} />
      <Tabs.Screen name="bookings" options={{ title: t('tabs.admin.bookings') }} />
      <Tabs.Screen name="categories" options={{ title: t('tabs.admin.categories') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.admin.more') }} />
    </Tabs>
  );
}
