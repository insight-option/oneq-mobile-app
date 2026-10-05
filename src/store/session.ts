/**
 * Session store: who is signed in, which workspace they land in, and the guest gate (`requireAuth`).
 * The auth sheet UI (phone → OTP bottom sheet) registers itself via `setAuthGateHandler` from the customer layout.
 */
import { create } from 'zustand';
import type { Role, SessionInfo } from '@/domain/types';

export type LandingRoute = '/(customer)/(tabs)' | '/(company)/(tabs)' | '/(admin)/(tabs)';

interface SessionState {
  status: 'booting' | 'ready';
  session: SessionInfo | null;
  role: Role;
  /** true when the user explicitly chose "المتابعة كضيف" */
  isGuest: boolean;
  onboarded: boolean;
  setSession: (session: SessionInfo | null) => void;
  setGuest: (guest: boolean) => void;
  setOnboarded: (v: boolean) => void;
  setReady: () => void;
  landingRoute: () => LandingRoute;
}

export const roleFromSession = (session: SessionInfo | null): Role => (session ? session.role : 'guest');

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'booting',
  session: null,
  role: 'guest',
  isGuest: false,
  onboarded: false,
  setSession: (session) => set({ session, role: roleFromSession(session), isGuest: session ? false : get().isGuest }),
  setGuest: (isGuest) => set({ isGuest }),
  setOnboarded: (onboarded) => set({ onboarded }),
  setReady: () => set({ status: 'ready' }),
  landingRoute: () => {
    const role = get().role;
    if (role === 'admin') return '/(admin)/(tabs)';
    if (role === 'company') return '/(company)/(tabs)';
    return '/(customer)/(tabs)';
  },
}));

export const useSession = () => useSessionStore((s) => s.session);
export const useRole = () => useSessionStore((s) => s.role);
export const useIsSignedIn = () => useSessionStore((s) => s.session != null);

/* ---------- Guest gate ---------- */

export type AuthGateReason = 'book' | 'gift' | 'favorite' | 'rate' | 'points' | 'address' | 'generic';

type AuthGateHandler = (reason: AuthGateReason) => Promise<boolean>;

let gateHandler: AuthGateHandler | null = null;

/** Registered by the customer layout, which renders the phone/OTP bottom sheet. */
export const setAuthGateHandler = (handler: AuthGateHandler | null) => {
  gateHandler = handler;
};

/**
 * Resolve `true` immediately when signed in; otherwise open the sign-in sheet and resolve with the outcome.
 * Usage: `if (!(await requireAuth('book'))) return;`
 */
export const requireAuth = async (reason: AuthGateReason = 'generic'): Promise<boolean> => {
  if (useSessionStore.getState().session) return true;
  if (!gateHandler) return false;
  return gateHandler(reason);
};
