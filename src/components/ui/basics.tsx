import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export const Divider = ({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) => {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginStart: inset }, style]} />;
};

export const Spacer = ({ size = 16 }: { size?: number }) => <View style={{ height: size }} />;

export const Row = ({ children, gap = 8, style, align = 'center', justify }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; align?: ViewStyle['alignItems']; justify?: ViewStyle['justifyContent'] }) => (
  <View style={[{ flexDirection: 'row', alignItems: align, justifyContent: justify, gap }, style]}>{children}</View>
);

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader = ({ title, subtitle, actionLabel, onAction, icon, style }: SectionHeaderProps) => {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.sectionRow, { paddingHorizontal: spacing.gutter, marginBottom: spacing.md }, style]}>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text variant="h3">{title}</Text>
          {icon ? <Icon name={icon} size={18} color={colors.gold} /> : null}
        </View>
        {subtitle ? (
          <Text variant="caption" muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text variant="bodySm" weight="semibold" color={colors.primary}>
            {actionLabel}
          </Text>
          <Icon name="chevron-left" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
};

/** Circular tinted icon bubble used for category tiles, list rows, menus. */
export const IconBubble = ({ name, size = 48, color, background, iconSize }: { name: IconName; size?: number; color?: string; background?: string; iconSize?: number }) => {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background ?? colors.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={iconSize ?? Math.round(size * 0.46)} color={color ?? colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
