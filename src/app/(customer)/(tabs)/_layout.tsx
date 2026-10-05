import React, { useCallback, useMemo } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar, type TabBarProps, type TabItem } from '@/components/ui/TabBar';
import { useI18n } from '@/i18n';
import { useUnreadCount } from '@/data/hooks';

export default function CustomerTabsLayout() {
  const { t } = useI18n();
  const unread = useUnreadCount();
  const badge = unread.data ? unread.data : false;
  const items = useMemo<TabItem[]>(
    () => [
      { name: 'index', label: t('tabs.home'), icon: 'house', badge },
      { name: 'gifts', label: t('tabs.gifts'), icon: 'gift' },
      { name: 'map', label: t('tabs.map'), icon: 'map' },
      { name: 'orders', label: t('tabs.orders'), icon: 'calendar-check' },
      { name: 'profile', label: t('tabs.profile'), icon: 'user' },
    ],
    [t, badge],
  );
  const renderTabBar = useCallback((props: Omit<TabBarProps, 'items' | 'variant'>) => <TabBar {...props} items={items} variant="customer" />, [items]);
  return (
    <Tabs tabBar={renderTabBar as never} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, lazy: true }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="gifts" options={{ title: t('tabs.gifts') }} />
      <Tabs.Screen name="map" options={{ title: t('tabs.map') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
