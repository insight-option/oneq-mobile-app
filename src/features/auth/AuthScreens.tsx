import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Checkbox, Divider, Header, IconBubble, Input, OtpInput, PhoneInput, Screen, SegmentedControl, Text, toast } from '@/components/ui';
import { repo } from '@/data';
import { useI18n } from '@/i18n';
import { formatPhone, isValidQatarPhone, normalizeQatarPhone } from '@/lib/phone';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { continueAsGuest } from '@/features/shell/useBootstrap';
import { useAuthFlow } from './useAuthFlow';

const OrDivider = ({ label }: { label: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.orRow}>
      <View style={[styles.orLine, { backgroundColor: colors.line }]} />
      <Text variant="caption" muted>
        {label}
      </Text>
      <View style={[styles.orLine, { backgroundColor: colors.line }]} />
    </View>
  );
};

/* ---------- Welcome (link-1 splash) ---------- */
export const WelcomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <View style={styles.root}>
      <LinearGradient colors={[brand.maroonLight, brand.maroon, brand.maroonDeep]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.welcomeCenter}>
        <View style={styles.logoCircle}>
          <Image source={require('../../../assets/brand/monogram-maroon.png')} style={styles.monogram} contentFit="contain" />
        </View>
        <Image source={require('../../../assets/brand/wordmark-cream.png')} style={styles.wordmarkLarge} contentFit="contain" />
        <Text variant="body" color="rgba(247,240,234,0.75)" align="center">
          {t('welcome.subtitle')}
        </Text>
      </View>
      <View style={[styles.welcomeActions, { paddingBottom: insets.bottom + 28 }]}>
        <Button label={t('welcome.phone')} variant="glass" size="lg" fullWidth leftIcon="smartphone" onPress={() => router.push('/(auth)/phone')} />
        <Button label={t('welcome.email')} variant="glass" size="lg" fullWidth leftIcon="mail" onPress={() => router.push('/(auth)/email')} />
        <Pressable
          onPress={async () => {
            await continueAsGuest();
            router.replace('/(customer)/(tabs)');
          }}
          hitSlop={10}
          style={styles.guestLink}>
          <Text variant="body" weight="semibold" color="rgba(247,240,234,0.9)">
            {t('welcome.guest')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

/* ---------- Phone ---------- */
export const PhoneScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, startPhone } = useAuthFlow();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!isValidQatarPhone(`+974${digits}`)) {
      setError(t('auth.phone.invalid'));
      return;
    }
    setError(null);
    const step = await startPhone(digits);
    if (!step) return;
    const phone = normalizeQatarPhone(digits) ?? '';
    if (step.step === 'SIGN_UP') router.push({ pathname: '/(auth)/signup', params: { phone } });
    else if (step.step === 'OTP') router.push({ pathname: '/(auth)/otp', params: { phone } });
  };

  return (
    <Screen mode="scroll" edges={[]} keyboard background={colors.canvas}>
      <Header title={t('auth.phone.title')} variant="maroon" compact />
      <View style={[styles.form, { padding: spacing.xxl, gap: spacing.lg }]}>
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
          <IconBubble name="smartphone" size={88} iconSize={40} />
          <Text variant="h1" align="center">
            {t('auth.phone.heading')}
          </Text>
          <Text variant="bodySm" muted align="center">
            {t('auth.phone.hint')}
          </Text>
        </View>
        <PhoneInput value={digits} onChange={setDigits} error={error} autoFocus onSubmit={submit} />
        <Button label={t('auth.phone.send')} size="lg" fullWidth loading={loading} onPress={submit} />
        <OrDivider label={t('common.or')} />
        <Button label={t('auth.phone.emailAlt')} variant="outline" size="lg" fullWidth leftIcon="mail" onPress={() => router.replace('/(auth)/email')} />
        <Pressable
          onPress={async () => {
            await continueAsGuest();
            router.replace('/(customer)/(tabs)');
          }}
          hitSlop={8}
          style={{ alignSelf: 'center' }}>
          <Text variant="body" weight="semibold" color={colors.primary}>
            {t('welcome.guest')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

/* ---------- OTP ---------- */
export const OtpScreen = () => {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, confirmOtp, resend, land } = useAuthFlow();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const submitting = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const submit = async (value = code) => {
    if (value.length < 6 || submitting.current) return;
    submitting.current = true;
    const step = await confirmOtp(value);
    submitting.current = false;
    if (!step) {
      setError(true);
      setCode('');
      return;
    }
    // admin-created owners may still hold their temporary password after the SMS code
    if (step.step === 'NEW_PASSWORD') {
      router.replace({ pathname: '/(auth)/new-password', params: { email: step.destination } });
      return;
    }
    if (!land(step)) setError(true);
  };

  return (
    <Screen mode="scroll" edges={[]} keyboard background={colors.canvas}>
      <Header title={t('auth.otp.title')} variant="maroon" compact />
      <View style={[styles.form, { padding: spacing.xxl, gap: spacing.lg }]}>
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
          <IconBubble name="shield-check" size={88} iconSize={40} />
          <Text variant="h1" align="center">
            {t('auth.otp.heading')}
          </Text>
          <Text variant="bodySm" muted align="center">
            {t('auth.otp.sentTo', { phone: formatPhone(phone ?? '') })}
          </Text>
        </View>
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(false); }} onComplete={(v) => void submit(v)} error={error} />
        {error ? (
          <Text variant="caption" color={colors.danger} align="center">
            {t('auth.otp.invalid')}
          </Text>
        ) : null}
        {repo.mode === 'mock' ? (
          <Text variant="caption" muted align="center">
            {t('auth.otp.demoHint')}
          </Text>
        ) : null}
        <Button label={t('auth.otp.confirm')} size="lg" fullWidth loading={loading} disabled={code.length < 6} onPress={() => void submit()} />
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          {seconds > 0 ? (
            <Text variant="bodySm" muted>
              {t('auth.otp.resendIn', { seconds })}
            </Text>
          ) : (
            <Pressable
              onPress={async () => {
                await resend();
                setSeconds(60);
                toast.info(t('auth.otp.resent'));
              }}
              hitSlop={8}>
              <Text variant="bodySm" weight="semibold" color={colors.primary}>
                {t('auth.otp.resend')}
              </Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text variant="bodySm" weight="semibold" muted>
              {t('auth.otp.changePhone')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

/* ---------- Email + password (reference login) ---------- */
export const EmailScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, signInEmail, land } = useAuthFlow();
  const [segment, setSegment] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [digits, setDigits] = useState('');
  const phoneFlow = useAuthFlow();

  const submitEmail = async () => {
    if (!email.includes('@')) {
      toast.error(t('auth.errors.invalidEmail'));
      return;
    }
    const step = await signInEmail(email, password);
    if (!step) return;
    if (step.step === 'NEW_PASSWORD') router.push({ pathname: '/(auth)/new-password', params: { email: step.destination } });
    else land(step);
  };
  const submitPhone = async () => {
    const step = await phoneFlow.startPhone(digits);
    if (!step) return;
    const phone = normalizeQatarPhone(digits) ?? '';
    router.push({ pathname: step.step === 'SIGN_UP' ? '/(auth)/signup' : '/(auth)/otp', params: { phone } });
  };

  return (
    <Screen mode="scroll" edges={[]} keyboard background={brand.cream} contentStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={styles.blob} pointerEvents="none" />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))} hitSlop={10} style={styles.backCircle}>
          <Text variant="title" color="#FFFFFF">
            ‹
          </Text>
        </Pressable>
        <Image source={require('../../../assets/brand/wordmark-cream.png')} style={styles.wordmarkSmall} contentFit="contain" />
      </View>
      <View style={[styles.form, { paddingHorizontal: spacing.xxl, gap: spacing.lg, marginTop: 56 }]}>
        <View style={{ gap: 6 }}>
          <Text variant="h1">{t('auth.email.title')}</Text>
          <Text variant="bodySm" muted>
            {t('auth.email.subtitle')}
          </Text>
        </View>
        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'email', label: t('auth.email.segEmail') },
            { value: 'phone', label: t('auth.email.segPhone') },
          ]}
        />
        {segment === 'email' ? (
          <>
            <Input label={t('auth.email.label')} placeholder={t('auth.email.placeholder')} value={email} onChangeText={setEmail} leftIcon="mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" ltr />
            <Input label={t('auth.password.label')} placeholder={t('auth.password.placeholder')} value={password} onChangeText={setPassword} leftIcon="lock" secureTextEntry secureToggle ltr labelAction={{ label: t('auth.password.forgot'), onPress: () => router.push('/(auth)/forgot') }} onSubmitEditing={submitEmail} />
            <Checkbox checked={remember} onChange={setRemember} label={t('auth.remember')} />
            <Button label={t('auth.login')} size="lg" fullWidth loading={loading} onPress={submitEmail} />
          </>
        ) : (
          <>
            <PhoneInput value={digits} onChange={setDigits} label={t('auth.signup.phone')} onSubmit={submitPhone} />
            <Button label={t('auth.phone.send')} size="lg" fullWidth loading={phoneFlow.loading} onPress={submitPhone} />
          </>
        )}
        <OrDivider label={t('common.or')} />
        <Button label={t('auth.otpLogin')} variant="outline" size="lg" fullWidth leftIcon="smartphone" onPress={() => router.push('/(auth)/phone')} />
        <View style={styles.linksRow}>
          <Text variant="bodySm" muted>
            {t('auth.noAccount')}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
            <Text variant="bodySm" weight="bold" color={colors.primary}>
              {t('auth.createAccount')}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={async () => {
            await continueAsGuest();
            router.replace('/(customer)/(tabs)');
          }}
          hitSlop={8}
          style={{ alignSelf: 'center' }}>
          <Text variant="bodySm" weight="semibold" muted>
            {t('auth.browseGuest')}
          </Text>
        </Pressable>
        <Text variant="caption" color={colors.faint} align="center" style={{ marginTop: spacing.sm }}>
          {t('auth.legal')}
        </Text>
      </View>
    </Screen>
  );
};

/* ---------- Sign up ---------- */
export const SignupScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, signUpPhone, signUpEmail } = useAuthFlow();
  const [name, setName] = useState('');
  const [digits, setDigits] = useState(params.phone ? params.phone.replace('+974', '') : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const phone = normalizeQatarPhone(digits);
    if (!name.trim() || !phone) {
      toast.error(t('auth.signup.fillRequired'));
      return;
    }
    if (email && password.length < 8) {
      toast.error(t('auth.errors.weakPassword'));
      return;
    }
    const step = email && password ? await signUpEmail({ email, password, name: name.trim(), phone }) : await signUpPhone({ phone, name: name.trim(), email: email || undefined });
    if (step?.step === 'OTP') router.push({ pathname: '/(auth)/otp', params: { phone } });
  };

  return (
    <Screen mode="scroll" edges={[]} keyboard background={colors.canvas}>
      <Header title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')} variant="maroon" compact />
      <View style={[styles.form, { padding: spacing.xxl, gap: spacing.lg }]}>
        <Input label={t('auth.signup.name')} placeholder={t('auth.signup.namePlaceholder')} value={name} onChangeText={setName} leftIcon="user" autoCapitalize="words" />
        <PhoneInput label={t('auth.signup.phone')} value={digits} onChange={setDigits} editable={!params.phone} />
        <Input label={t('auth.signup.emailOptional')} placeholder={t('auth.email.placeholder')} value={email} onChangeText={setEmail} leftIcon="mail" keyboardType="email-address" autoCapitalize="none" ltr />
        {email ? <Input label={t('auth.signup.password')} placeholder={t('auth.password.placeholder')} value={password} onChangeText={setPassword} leftIcon="lock" secureTextEntry secureToggle ltr /> : null}
        <Button label={t('auth.signup.submit')} size="lg" fullWidth loading={loading} onPress={submit} />
        <View style={styles.linksRow}>
          <Text variant="bodySm" muted>
            {t('auth.signup.haveAccount')}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/email')} hitSlop={8}>
            <Text variant="bodySm" weight="bold" color={colors.primary}>
              {t('auth.login')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

/* ---------- Forgot password ---------- */
/** Reached when sign-in returns NEW_PASSWORD: the account still holds the temporary password it was created with. */
export const NewPasswordScreen = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, completeNewPassword, land } = useAuthFlow();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const submit = async () => {
    if (password.length < 8) {
      toast.error(t('auth.errors.weakPassword'));
      return;
    }
    if (password !== confirm) {
      toast.error(t('auth.newPassword.mismatch'));
      return;
    }
    const step = await completeNewPassword(password);
    if (step) land(step);
  };

  return (
    <Screen mode="scroll" edges={[]} keyboard background={colors.canvas}>
      <Header title={t('auth.newPassword.title')} variant="maroon" compact />
      <View style={[styles.form, { padding: spacing.xxl, gap: spacing.lg }]}>
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
          <IconBubble name="key-round" size={88} iconSize={40} />
          <Text variant="bodySm" muted align="center">
            {t('auth.newPassword.subtitle')}
          </Text>
          {email ? (
            <Text variant="caption" muted numeric>
              {email}
            </Text>
          ) : null}
        </View>
        <Input label={t('auth.newPassword.label')} value={password} onChangeText={setPassword} leftIcon="lock" secureTextEntry secureToggle ltr autoFocus />
        <Input label={t('auth.newPassword.confirmLabel')} value={confirm} onChangeText={setConfirm} leftIcon="lock" secureTextEntry secureToggle ltr onSubmitEditing={submit} />
        <Button label={t('auth.newPassword.submit')} size="lg" fullWidth loading={loading} onPress={submit} />
        <Pressable onPress={() => router.replace('/(auth)/email')} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text variant="bodySm" weight="semibold" color={colors.primary}>
            {t('auth.forgot.backToLogin')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

export const ForgotScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const { loading, requestReset, confirmReset } = useAuthFlow();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen mode="scroll" edges={[]} keyboard background={colors.canvas}>
      <Header title={t('auth.forgot.title')} variant="maroon" compact />
      <View style={[styles.form, { padding: spacing.xxl, gap: spacing.lg }]}>
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
          <IconBubble name="key-round" size={88} iconSize={40} />
          <Text variant="bodySm" muted align="center">
            {sent ? t('auth.forgot.sentBody') : t('auth.forgot.subtitle')}
          </Text>
        </View>
        {!sent ? (
          <>
            <Input label={t('auth.email.label')} placeholder={t('auth.email.placeholder')} value={email} onChangeText={setEmail} leftIcon="mail" keyboardType="email-address" autoCapitalize="none" ltr />
            <Button
              label={t('auth.forgot.send')}
              size="lg"
              fullWidth
              loading={loading}
              onPress={async () => {
                const step = await requestReset(email);
                if (step) {
                  setSent(true);
                  toast.success(t('auth.forgot.sent'));
                }
              }}
            />
          </>
        ) : (
          <>
            <Input label={t('auth.forgot.code')} value={code} onChangeText={setCode} leftIcon="shield-check" keyboardType="number-pad" ltr numeric />
            <Input label={t('auth.forgot.newPassword')} value={password} onChangeText={setPassword} leftIcon="lock" secureTextEntry secureToggle ltr />
            <Button
              label={t('auth.forgot.reset')}
              size="lg"
              fullWidth
              loading={loading}
              onPress={async () => {
                if (password.length < 8) {
                  toast.error(t('auth.errors.weakPassword'));
                  return;
                }
                const ok = await confirmReset({ email, code, newPassword: password });
                if (ok !== null) {
                  toast.success(t('auth.forgot.done'));
                  router.replace('/(auth)/email');
                }
              }}
            />
          </>
        )}
        <Pressable onPress={() => router.replace('/(auth)/email')} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text variant="bodySm" weight="semibold" color={colors.primary}>
            {t('auth.forgot.backToLogin')}
          </Text>
        </Pressable>
        <Divider />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.maroon },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  monogram: { width: 84, height: 84 },
  wordmarkLarge: { width: 150, height: 46, marginTop: 10 },
  welcomeActions: { paddingHorizontal: 24, gap: 12 },
  guestLink: { alignSelf: 'center', paddingVertical: 10 },
  form: { flex: 1 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  linksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  blob: { position: 'absolute', top: -140, start: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: brand.maroon },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  wordmarkSmall: { width: 84, height: 28 },
});
