import React, { useEffect, useRef, useState } from 'react';
import { WEB_INPUT_RESET } from '@/lib/layout';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Text } from './Text';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}

/** 6 boxes backed by one hidden TextInput (reliable paste + autofill). */
export const OtpInput = ({ length = 6, value, onChange, onComplete, error, autoFocus = true }: OtpInputProps) => {
  const { colors, radii } = useTheme();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, length);

  useEffect(() => {
    if (digits.length === length) onComplete?.(digits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.wrap}>
      <View style={[styles.row, { direction: 'ltr' }]}>
        {Array.from({ length }).map((_, i) => {
          const ch = digits[i] ?? '';
          const active = focused && i === Math.min(digits.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                WEB_INPUT_RESET,
                {
                  borderColor: error ? colors.danger : active ? colors.primary : ch ? colors.lineStrong : colors.line,
                  backgroundColor: ch ? colors.surface : colors.surfaceAlt,
                  borderRadius: radii.input,
                  borderWidth: active || error ? 1.6 : 1,
                },
              ]}>
              <Text variant="h2" numeric color={colors.ink}>
                {ch}
              </Text>
              {active && !ch ? <View style={[styles.caret, { backgroundColor: colors.primary }]} /> : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={digits}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.hidden, { fontFamily: fonts.latin.regular }]}
        caretHidden
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  box: { width: 48, height: 58, alignItems: 'center', justifyContent: 'center' },
  caret: { width: 2, height: 24, borderRadius: 1, position: 'absolute' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
