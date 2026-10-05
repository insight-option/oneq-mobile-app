import React, { forwardRef, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { resolveFont } from '@/theme/typography';
import { useLocaleStore } from '@/store/locale';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helper?: string;
  error?: string | null;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** force LTR input (emails, codes, phone numbers) */
  ltr?: boolean;
  numeric?: boolean;
  size?: 'md' | 'lg';
  labelAction?: { label: string; onPress: () => void };
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, helper, error, leftIcon, rightIcon, onRightIconPress, secureToggle, containerStyle, ltr, numeric, size = 'md', multiline, labelAction, secureTextEntry, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, radii, spacing } = useTheme();
  const lang = useLocaleStore((s) => s.lang);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.line;
  const height = multiline ? undefined : size === 'lg' ? 56 : 52;
  const isLTR = ltr || numeric || !I18nManager.isRTL;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label || labelAction ? (
        <View style={styles.labelRow}>
          {label ? (
            <Text variant="bodySm" weight="semibold">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {labelAction ? (
            <Pressable onPress={labelAction.onPress} hitSlop={6}>
              <Text variant="caption" weight="semibold" color={colors.primary}>
                {labelAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.input,
            height,
            minHeight: multiline ? 110 : undefined,
            paddingHorizontal: spacing.md,
            borderWidth: focused || error ? 1.5 : 1,
            alignItems: multiline ? 'flex-start' : 'center',
            paddingVertical: multiline ? spacing.md : 0,
          },
        ]}>
        {leftIcon ? <Icon name={leftIcon} size={20} color={focused ? colors.primary : colors.faint} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={colors.faint}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          allowFontScaling={false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              fontFamily: resolveFont(lang, 'regular', { numeric }),
              color: colors.ink,
              textAlign: isLTR ? 'left' : 'right',
              writingDirection: isLTR ? 'ltr' : 'rtl',
              textAlignVertical: multiline ? 'top' : 'center',
              paddingVertical: multiline ? 0 : undefined,
            },
          ]}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.faint} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={8} disabled={!onRightIconPress}>
            <Icon name={rightIcon} size={20} color={colors.faint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" muted>
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

export const TextArea = forwardRef<TextInput, InputProps>(function TextArea(props, ref) {
  return <Input ref={ref} multiline {...props} />;
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, fontSize: 15, height: '100%' },
});
