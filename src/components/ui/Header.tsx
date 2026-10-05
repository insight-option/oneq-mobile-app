import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** 'maroon' = link-1 rounded gradient header; 'plain' = flat header on the canvas; 'workspace' = cream flat bar */
  variant?: 'maroon' | 'plain' | 'workspace';
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
  left?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** keep the header inside the safe area (default true) */
  safe?: boolean;
  compact?: boolean;
}

export const Header = ({ title, subtitle, variant = 'maroon', onBack, showBack = true, right, left, children, style, safe = true, compact }: HeaderProps) => {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const padTop = safe ? insets.top + spacing.sm : spacing.sm;
  const isMaroon = variant === 'maroon';
  const textColor = isMaroon ? '#FFFFFF' : colors.ink;

  const content = (
    <View style={[styles.row, { paddingTop: padTop, paddingBottom: children ? spacing.lg : compact ? spacing.md : spacing.xl, paddingHorizontal: spacing.gutter }]}>
      <View style={styles.side}>
        {left ?? (showBack ? <IconButton name="arrow-right" variant={isMaroon ? 'glass' : 'soft'} onPress={handleBack} accessibilityLabel="back" /> : null)}
      </View>
      <View style={styles.center}>
        {title ? (
          <Text variant="h3" color={textColor} align="center" lines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color={isMaroon ? 'rgba(255,255,255,0.75)' : colors.muted} align="center" lines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideEnd]}>{right}</View>
    </View>
  );

  if (isMaroon) {
    return (
      <LinearGradient colors={[brand.maroonLight, brand.maroon, brand.maroonDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderBottomStartRadius: radii.sheet, borderBottomEndRadius: radii.sheet }, style]}>
        {content}
        {children ? <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.xl }}>{children}</View> : null}
      </LinearGradient>
    );
  }
  return (
    <View style={[{ backgroundColor: variant === 'workspace' ? colors.surface : colors.canvas, borderBottomWidth: variant === 'workspace' ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.line }, style]}>
      {content}
      {children ? <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg }}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { minWidth: 48, alignItems: 'flex-start' },
  sideEnd: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
});
