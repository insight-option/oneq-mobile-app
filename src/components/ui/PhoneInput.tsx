import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { QATAR_COUNTRY_CODE } from '@/lib/phone';
import { Text } from './Text';

export interface PhoneInputProps {
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  error?: string | null;
  autoFocus?: boolean;
  placeholder?: string;
  onSubmit?: () => void;
  editable?: boolean;
}

/** +974 prefix box + 8-digit local number, formatted "XX XXX XXX" while typing. Emits raw digits. */
export const PhoneInput = ({ value, onChange, label, error, autoFocus, placeholder = 'XX XXX XXX', onSubmit, editable = true }: PhoneInputProps) => {
  const { colors, radii, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const formatted = digits.replace(/(\d{2})(\d{0,3})(\d{0,3})/, (_m, a: string, b: string, c: string) => [a, b, c].filter(Boolean).join(' '));
  const border = error ? colors.danger : focused ? colors.primary : colors.line;
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="bodySm" weight="semibold">
          {label}
        </Text>
      ) : null}
      <View style={[styles.row, { direction: 'ltr' }]}>
        <View style={[styles.prefix, { borderColor: border, backgroundColor: colors.surfaceAlt, borderRadius: radii.input }]}>
          <Text variant="title" numeric weight="semibold" color={colors.ink}>
            {QATAR_COUNTRY_CODE}
          </Text>
        </View>
        <View style={[styles.field, { borderColor: border, backgroundColor: colors.surface, borderRadius: radii.input, borderWidth: focused ? 1.5 : 1, paddingHorizontal: spacing.md }]}>
          <TextInput
            value={formatted}
            onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={10}
            autoFocus={autoFocus}
            editable={editable}
            placeholder={placeholder}
            placeholderTextColor={colors.faint}
            selectionColor={colors.primary}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            allowFontScaling={false}
            style={[styles.input, { color: colors.ink, fontFamily: fonts.latin.semibold }]}
          />
        </View>
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  prefix: { width: 84, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  field: { flex: 1, height: 56, justifyContent: 'center' },
  input: { fontSize: 20, letterSpacing: 1.5, textAlign: 'left', height: '100%' },
});
