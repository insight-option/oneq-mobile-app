import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { IconBubble } from './basics';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  iconBackground?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  value?: string;
  chevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  divider?: boolean;
}

export const ListRow = React.memo(function ListRow({ title, subtitle, icon, iconColor, iconBackground, leading, trailing, value, chevron = true, onPress, danger, style, divider }: ListRowProps) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: pressed ? colors.surfaceAlt : 'transparent', borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.line },
        style,
      ]}>
      {leading ?? (icon ? <IconBubble name={icon} size={44} color={danger ? colors.danger : iconColor} background={danger ? colors.dangerTint : iconBackground} /> : null)}
      <View style={styles.body}>
        <Text variant="title" weight="semibold" color={danger ? colors.danger : colors.ink} lines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" muted lines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySm" numeric weight="semibold" muted>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron && onPress ? <Icon name="chevron-left" size={18} color={colors.faint} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  body: { flex: 1, gap: 2 },
});
