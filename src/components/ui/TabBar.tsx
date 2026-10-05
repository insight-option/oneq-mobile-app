import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface TabItem {
  name: string;
  label: string;
  icon: IconName;
  badge?: number | boolean;
}

/** Structural subset of react-navigation's BottomTabBarProps (expo-router passes the full object). */
export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
  insets: { bottom: number };
  items: TabItem[];
  variant?: 'customer' | 'workspace';
}

/**
 * Custom bottom tab bar for expo-router Tabs. Customer: white bar, maroon active icon + label.
 * Workspace: cream bar with a soft maroon pill behind the active icon (link-2).
 */
export const TabBar = ({ state, navigation, insets, items, variant = 'customer' }: TabBarProps) => {
  const { colors, shadows } = useTheme();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <View style={[styles.bar, { backgroundColor: colors.tabBar, paddingBottom: bottom, borderTopColor: colors.line }, shadows.elevated]}>
      {state.routes.map((route, index) => {
        const item = items.find((i) => i.name === route.name);
        if (!item) return null;
        const focused = state.index === index;
        const color = focused ? colors.tabActive : colors.tabInactive;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptic.selection();
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label} onPress={onPress} style={styles.item}>
            <View style={[styles.iconWrap, variant === 'workspace' && focused ? { backgroundColor: colors.tabActivePill } : null]}>
              <Icon name={item.icon} size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
              {item.badge ? (
                <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.tabBar }]}>
                  {typeof item.badge === 'number' ? (
                    <Text variant="caption" numeric color="#FFFFFF" style={styles.badgeText}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Text variant="caption" weight={focused ? 'bold' : 'medium'} color={color} lines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, end: 8, minWidth: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, lineHeight: 11 },
});
