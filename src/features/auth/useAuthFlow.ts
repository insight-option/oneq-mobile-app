/**
 * Shared auth flow logic for the full screens and the guest-gate sheet.
 */
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { repo } from '@/data';
import type { AuthNextStep, SessionInfo } from '@/domain/types';
import { t } from '@/i18n';
import { isValidQatarPhone, normalizeQatarPhone } from '@/lib/phone';
import { queryClient } from '@/lib/query';
import { useSessionStore } from '@/store/session';
import { toast } from '@/components/ui';

export const authErrorMessage = (e: unknown): string => {
  const err = e instanceof Error ? e : null;
  const message = err?.message ?? String(e);
  // Amplify errors carry the Cognito exception in `name` (the message is a sentence); repository errors put the code in `message`
  const code = err && err.name !== 'Error' && /(Exception|Error)$/.test(err.name) ? err.name : message;
  // a company owner opened the invitation too late: the admin can resend it, phone OTP keeps working meanwhile
  if (code === 'NotAuthorizedException' && /temporary password has expired/i.test(message)) return t('auth.errors.tempPasswordExpired');
  switch (code) {
    case 'INVALID_CODE':
    case 'CodeMismatchException':
      return t('auth.otp.invalid');
    case 'ExpiredCodeException':
      return t('auth.errors.codeExpired');
    case 'INVALID_CREDENTIALS':
    case 'NotAuthorizedException':
      return t('auth.errors.invalidCredentials');
    case 'USER_NOT_FOUND':
    case 'UserNotFoundException':
      return t('auth.errors.userNotFound');
    case 'INVALID_PHONE':
      return t('auth.phone.invalid');
    case 'WEAK_PASSWORD':
    case 'InvalidPasswordException':
      return t('auth.errors.weakPassword');
    case 'NetworkError':
      return t('auth.errors.network');
    default:
      return t('auth.errors.generic');
  }
};

export const completeSignIn = (session: SessionInfo) => {
  useSessionStore.getState().setSession(session);
  useSessionStore.getState().setGuest(false);
  queryClient.clear();
};

export const useAuthFlow = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    try {
      return await fn();
    } catch (e) {
      // keep the raw error reachable in device logs — the toast only shows the mapped message
      const underlying = (e as { underlyingError?: unknown } | null)?.underlyingError;
      console.warn('[auth]', e instanceof Error ? `${e.name}: ${e.message}` : e, underlying instanceof Error ? `← ${underlying.name}: ${underlying.message}` : (underlying ?? ''));
      toast.error(authErrorMessage(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const startPhone = useCallback(
    (digits: string) => {
      const phone = normalizeQatarPhone(digits);
      if (!phone || !isValidQatarPhone(phone)) {
        toast.error(t('auth.phone.invalid'));
        return Promise.resolve<AuthNextStep | null>(null);
      }
      return run(() => repo.auth.signInWithPhone(phone));
    },
    [run],
  );

  const signUpPhone = useCallback((input: { phone: string; name: string; email?: string }) => run(() => repo.auth.signUpWithPhone(input)), [run]);

  const confirmOtp = useCallback((code: string) => run(() => repo.auth.confirmOtp(code)), [run]);

  const resend = useCallback(() => run(() => repo.auth.resendOtp()), [run]);

  const signInEmail = useCallback((email: string, password: string) => run(() => repo.auth.signInWithEmail(email.trim(), password)), [run]);

  const completeNewPassword = useCallback((newPassword: string) => run(() => repo.auth.completeNewPassword(newPassword)), [run]);

  const signUpEmail = useCallback((input: { email: string; password: string; name: string; phone: string }) => run(() => repo.auth.signUpWithEmail(input)), [run]);

  const requestReset = useCallback((email: string) => run(() => repo.auth.requestPasswordReset(email.trim())), [run]);

  const confirmReset = useCallback((input: { email: string; code: string; newPassword: string }) => run(() => repo.auth.confirmPasswordReset(input)), [run]);

  /** Apply a DONE step: store the session and go to the right workspace. */
  const land = useCallback(
    (step: AuthNextStep) => {
      if (step.step !== 'DONE') return false;
      completeSignIn(step.session);
      toast.success(t('auth.welcomeBack', { name: step.session.name }));
      router.replace(useSessionStore.getState().landingRoute() as never);
      return true;
    },
    [router],
  );

  return { loading, startPhone, signUpPhone, confirmOtp, resend, signInEmail, completeNewPassword, signUpEmail, requestReset, confirmReset, land };
};
