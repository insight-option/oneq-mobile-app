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
  const code = e instanceof Error ? e.message : String(e);
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

  return { loading, startPhone, signUpPhone, confirmOtp, resend, signInEmail, signUpEmail, requestReset, confirmReset, land };
};
