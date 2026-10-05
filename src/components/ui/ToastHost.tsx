import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { useToastStore, type ToastItem } from './toast';

const ToastCard = ({ item }: { item: ToastItem }) => {
  const { colors, radii, shadows } = useTheme();
  const remove = useToastStore((s) => s.remove);
  useEffect(() => {
    const timer = setTimeout(() => remove(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item, remove]);
  const tone = item.type === 'success' ? colors.success : item.type === 'error' ? colors.danger : colors.primary;
  const icon: IconName = item.type === 'success' ? 'circle-check' : item.type === 'error' ? 'circle-alert' : 'info';
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.card, { backgroundColor: colors.inkStrong, borderRadius: radii.md }, shadows.elevated]}>
      <Pressable onPress={() => remove(item.id)} style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: tone }]}>
          <Icon name={icon} size={16} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodySm" weight="semibold" color="#FFFFFF" lines={2}>
            {item.title}
          </Text>
          {item.body ? (
            <Text variant="caption" color="rgba(255,255,255,0.75)" lines={2}>
              {item.body}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const ToastHost = () => {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, zIndex: 100, elevation: 100, gap: 8 },
  card: { overflow: 'hidden' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
