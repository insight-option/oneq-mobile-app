import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenProps {
  children: React.ReactNode;
  /** 'scroll' wraps children in a ScrollView; 'fixed' renders a plain View (use with FlashList) */
  mode?: 'scroll' | 'fixed';
  background?: string;
  edges?: Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
  scrollProps?: Partial<ScrollViewProps>;
  /** extra bottom padding (e.g. for a sticky bar) */
  bottomInset?: number;
}

export const Screen = ({ children, mode = 'scroll', background, edges = ['top'], padded = false, style, contentStyle, refreshing, onRefresh, keyboard, scrollProps, bottomInset = 0 }: ScreenProps) => {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = edges.includes('top') ? insets.top : 0;
  const padBottom = edges.includes('bottom') ? insets.bottom : 0;
  const bg = background ?? colors.canvas;
  const inner =
    mode === 'scroll' ? (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingBottom: padBottom + bottomInset + spacing.xxl, paddingHorizontal: padded ? spacing.gutter : 0 }, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
        {...scrollProps}>
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.flex, { paddingBottom: padBottom, paddingHorizontal: padded ? spacing.gutter : 0 }, contentStyle]}>{children}</View>
    );
  const body = keyboard ? (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );
  return <View style={[styles.flex, { backgroundColor: bg, paddingTop: padTop }, style]}>{body}</View>;
};

const styles = StyleSheet.create({ flex: { flex: 1 } });
