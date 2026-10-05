import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export const FAB = ({ icon = 'plus', label, onPress, style, bottomOffset = 0 }: { icon?: IconName; label?: string; onPress: () => void; style?: StyleProp<ViewStyle>; bottomOffset?: number }) => {
  const { colors, shadows, radii } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => {
        haptic.medium();
        onPress();
      }}
      style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, borderRadius: radii.pill, bottom: insets.bottom + 16 + bottomOffset, paddingHorizontal: label ? 18 : 0, width: label ? undefined : 56, transform: [{ scale: pressed ? 0.96 : 1 }] }, shadows.fab, style]}>
      <Icon name={icon} size={22} color="#FFFFFF" strokeWidth={2.2} />
      {label ? (
        <Text variant="button" color="#FFFFFF">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({ fab: { position: 'absolute', end: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 20 } });
