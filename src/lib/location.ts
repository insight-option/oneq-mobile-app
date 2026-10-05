/**
 * User location with graceful fallbacks (permission denied / emulator without GPS → Doha center).
 */
import * as Location from 'expo-location';
import { useCallback, useEffect } from 'react';
import { create } from 'zustand';
import type { GeoPoint } from '@/domain/types';
import { DOHA_CENTER } from '@/theme/tokens';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface LocationState {
  status: LocationStatus;
  point: GeoPoint | null;
  /** true when `point` is the Doha fallback rather than a real fix */
  isFallback: boolean;
  updatedAt: number | null;
  set: (patch: Partial<LocationState>) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  status: 'idle',
  point: null,
  isFallback: true,
  updatedAt: null,
  set: (patch) => set(patch),
}));

let inFlight: Promise<GeoPoint> | null = null;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });

/**
 * Request permission (once) and resolve the best available position.
 * Always resolves — falls back to DOHA_CENTER when permission is denied or no fix is available.
 */
export const resolveUserLocation = async (opts?: { force?: boolean }): Promise<GeoPoint> => {
  const state = useLocationStore.getState();
  if (!opts?.force && state.point && !state.isFallback && state.updatedAt && Date.now() - state.updatedAt < 2 * 60 * 1000) {
    return state.point;
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    state.set({ status: 'requesting' });
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.granted;
      }
      if (!granted) {
        state.set({ status: 'denied', point: { ...DOHA_CENTER }, isFallback: true, updatedAt: Date.now() });
        return { ...DOHA_CENTER };
      }
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(() => null);
      if (last) {
        const p = { lat: last.coords.latitude, lng: last.coords.longitude };
        state.set({ status: 'granted', point: p, isFallback: false, updatedAt: Date.now() });
      }
      const fresh = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8000).catch(() => null);
      if (fresh) {
        const p = { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
        state.set({ status: 'granted', point: p, isFallback: false, updatedAt: Date.now() });
        return p;
      }
      const current = useLocationStore.getState();
      if (current.point && !current.isFallback) {
        state.set({ status: 'granted' });
        return current.point;
      }
      state.set({ status: 'unavailable', point: { ...DOHA_CENTER }, isFallback: true, updatedAt: Date.now() });
      return { ...DOHA_CENTER };
    } catch {
      state.set({ status: 'unavailable', point: { ...DOHA_CENTER }, isFallback: true, updatedAt: Date.now() });
      return { ...DOHA_CENTER };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};

/** Hook: resolves the user location on mount; exposes status + a refresh. */
export const useUserLocation = (auto = true) => {
  const status = useLocationStore((s) => s.status);
  const point = useLocationStore((s) => s.point);
  const isFallback = useLocationStore((s) => s.isFallback);
  const refresh = useCallback((force = false) => resolveUserLocation({ force }), []);
  useEffect(() => {
    if (auto) void resolveUserLocation();
  }, [auto]);
  return { status, point: point ?? DOHA_CENTER, isFallback, loading: status === 'requesting', refresh };
};
