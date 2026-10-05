/**
 * Guest gate: a bottom sheet that signs the user in with phone → OTP (and name on first sign-up).
 * Registered with the session store so any screen can call `await requireAuth('book')`.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet, Button, IconBubble, Input, OtpInput, PhoneInput, Text, toast, type BottomSheetRef } from '@/components/ui';
import { repo } from '@/data';
import { useI18n } from '@/i18n';
import { normalizeQatarPhone } from '@/lib/phone';
import { setAuthGateHandler, useSessionStore, type AuthGateReason } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { completeSignIn, useAuthFlow } from './useAuthFlow';

type Step = 'phone' | 'name' | 'otp';

export const AuthGateSheet = () => {
  const router = useRouter();
  const ref = useRef<BottomSheetRef>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, startPhone, signUpPhone, confirmOtp } = useAuthFlow();
  const [reason, setReason] = useState<AuthGateReason>('generic');
  const [step, setStep] = useState<Step>('phone');
  const [digits, setDigits] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  const finish = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  useEffect(() => {
    setAuthGateHandler((r) => {
      setReason(r);
      setStep('phone');
      setDigits('');
      setName('');
      setCode('');
      setCodeError(false);
      ref.current?.open();
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    });
    return () => setAuthGateHandler(null);
  }, []);

  const phone = normalizeQatarPhone(digits) ?? '';

  const onPhone = async () => {
    const next = await startPhone(digits);
    if (!next) return;
    setStep(next.step === 'SIGN_UP' ? 'name' : 'otp');
  };
  const onName = async () => {
    if (!name.trim()) {
      toast.error(t('auth.signup.fillRequired'));
      return;
    }
    const next = await signUpPhone({ phone, name: name.trim() });
    if (next?.step === 'OTP') setStep('otp');
  };
  const onCode = async (value: string) => {
    const next = await confirmOtp(value);
    if (!next || next.step !== 'DONE') {
      setCodeError(true);
      setCode('');
      return;
    }
    completeSignIn(next.session);
    toast.success(t('auth.welcomeBack', { name: next.session.name }));
    ref.current?.close();
    finish(true);
    // Company owners and admins who sign in from the customer app land in their own workspace.
    if (next.session.role !== 'customer') router.replace(useSessionStore.getState().landingRoute() as never);
  };

  const reasonText = t(`auth.gate.${reason}` as 'auth.gate.generic');

  return (
    <BottomSheet ref={ref} title={t('auth.gate.title')} onClose={() => finish(false)}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={styles.reasonRow}>
          <IconBubble name={step === 'otp' ? 'shield-check' : 'smartphone'} size={44} />
          <Text variant="bodySm" muted style={{ flex: 1 }}>
            {step === 'otp' ? t('auth.otp.sentTo', { phone }) : reasonText}
          </Text>
        </View>
        {step === 'phone' ? (
          <>
            <PhoneInput value={digits} onChange={setDigits} autoFocus onSubmit={onPhone} />
            <Button label={t('auth.phone.send')} size="lg" fullWidth loading={loading} onPress={onPhone} />
          </>
        ) : null}
        {step === 'name' ? (
          <>
            <Input label={t('auth.signup.name')} placeholder={t('auth.signup.namePlaceholder')} value={name} onChangeText={setName} leftIcon="user" autoFocus onSubmitEditing={onName} />
            <Button label={t('common.continue')} size="lg" fullWidth loading={loading} onPress={onName} />
          </>
        ) : null}
        {step === 'otp' ? (
          <>
            <OtpInput value={code} onChange={(v) => { setCode(v); setCodeError(false); }} onComplete={(v) => void onCode(v)} error={codeError} />
            {codeError ? (
              <Text variant="caption" color={colors.danger} align="center">
                {t('auth.otp.invalid')}
              </Text>
            ) : null}
            {repo.mode === 'mock' ? (
              <Text variant="caption" muted align="center">
                {t('auth.otp.demoHint')}
              </Text>
            ) : null}
            <Button label={t('auth.otp.confirm')} size="lg" fullWidth loading={loading} disabled={code.length < 6} onPress={() => void onCode(code)} />
            <Button label={t('auth.otp.changePhone')} variant="ghost" size="sm" onPress={() => setStep('phone')} style={{ alignSelf: 'center' }} />
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({ reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
