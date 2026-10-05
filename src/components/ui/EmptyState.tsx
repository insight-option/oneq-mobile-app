import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { IconBubble } from './basics';
import type { IconName } from './icons';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const EmptyState = ({ icon = 'search-x', title, body, actionLabel, onAction, secondaryLabel, onSecondary, style, compact }: EmptyStateProps) => {
  const { spacing } = useTheme();
  return (
    <View style={[styles.wrap, { paddingVertical: compact ? spacing.xl : spacing.huge, paddingHorizontal: spacing.xxl }, style]}>
      <IconBubble name={icon} size={compact ? 56 : 72} />
      <Text variant={compact ? 'title' : 'h3'} align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="bodySm" muted align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.sm }} /> : null}
      {secondaryLabel && onSecondary ? <Button label={secondaryLabel} variant="ghost" size="sm" onPress={onSecondary} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', gap: 10 } });
