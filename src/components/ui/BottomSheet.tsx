import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { BackHandler, Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { IconButton } from './IconButton';

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

export interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  /** fraction of the screen height (0..1) or 'auto' to fit content */
  height?: number | 'auto';
  onClose?: () => void;
  dismissable?: boolean;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  /** render when closed too (keeps state); default false */
  keepMounted?: boolean;
}

const SCREEN_H = Dimensions.get('window').height;
const SPRING = { damping: 22, stiffness: 240, mass: 0.8 };

/**
 * Gesture-driven bottom sheet (no third-party lib). Imperative API via ref: open() / close().
 */
export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(function BottomSheet({ children, title, height = 'auto', onClose, dismissable = true, style, keepMounted }, ref) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);
  const [contentH, setContentH] = useState(0);
  const targetH = height === 'auto' ? Math.min(contentH + insets.bottom + 24, SCREEN_H * 0.92) : SCREEN_H * height;

  const finishClose = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    backdrop.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(SCREEN_H, { duration: 220 }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  }, [backdrop, translateY, finishClose]);

  const open = useCallback(() => {
    setVisible(true);
    backdrop.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, SPRING);
  }, [backdrop, translateY]);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissable) close();
      return true;
    });
    return () => sub.remove();
  }, [visible, dismissable, close]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dismissable && (e.translationY > 120 || e.velocityY > 900)) {
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!visible && !keepMounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? close : undefined} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderTopStartRadius: radii.sheet, borderTopEndRadius: radii.sheet, paddingBottom: insets.bottom + spacing.lg, maxHeight: SCREEN_H * 0.92, height: height === 'auto' ? undefined : targetH },
              sheetStyle,
              style,
            ]}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.lineStrong }]} />
            </View>
            {title ? (
              <View style={[styles.titleRow, { paddingHorizontal: spacing.gutter }]}>
                <Text variant="h3" style={{ flex: 1 }}>
                  {title}
                </Text>
                {dismissable ? <IconButton name="x" variant="ghost" size={36} iconSize={18} onPress={close} /> : null}
              </View>
            ) : null}
            <View onLayout={(e) => setContentH(e.nativeEvent.layout.height + (title ? 60 : 24))} style={{ paddingHorizontal: spacing.gutter }}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 44, height: 5, borderRadius: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
});

/** Simple confirmation sheet content */
export const ConfirmContent = ({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger }: { title: string; body?: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) => {
  const { spacing } = useTheme();
  // Lazy import to avoid a cycle with Button → Text only
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Button } = require('./Button') as typeof import('./Button');
  return (
    <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
      <Text variant="h3">{title}</Text>
      {body ? (
        <Text variant="bodySm" muted>
          {body}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button label={cancelLabel} variant="soft" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </View>
  );
};
