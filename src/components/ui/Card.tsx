import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  shadow?: 'none' | 'card' | 'elevated';
  background?: string;
  bordered?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, padding, radius, shadow = 'card', background, bordered, onPress, style }: CardProps) => {
  const { colors, radii, shadows, spacing } = useTheme();
  const base: ViewStyle = {
    backgroundColor: background ?? colors.surface,
    borderRadius: radius ?? radii.card,
    padding: padding ?? spacing.lg,
    borderWidth: bordered ? StyleSheet_hairline : 0,
    borderColor: colors.line,
    overflow: 'visible',
  };
  const sh = shadow === 'card' ? shadows.card : shadow === 'elevated' ? shadows.elevated : null;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, sh, { opacity: pressed ? 0.92 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, sh, style]}>{children}</View>;
};

const StyleSheet_hairline = 1;
