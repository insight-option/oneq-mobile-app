/**
 * Geo helpers: haversine distance, distance decoration/sorting, radius filtering.
 * Framework-free. All distances in kilometres.
 */
import type { GeoPoint } from '@/domain/types';

export const EARTH_RADIUS_KM = 6371;
/** Doha centre fallback (same value as `DOHA_CENTER` in src/theme/tokens.ts). */
export const DOHA_CENTER: GeoPoint = { lat: 25.2854, lng: 51.531 };

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function isValidGeoPoint(value: unknown): value is GeoPoint {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

/** Great-circle distance between two points in km. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 1 decimal under 10 km, integer above (display-friendly, Latin digits). */
export function roundKm(km: number): number {
  if (!Number.isFinite(km)) return 0;
  return km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
}

/** Decorate items with `distanceKm` from `origin` (does not mutate the input objects). */
export function withDistance<T extends { location: GeoPoint }>(items: readonly T[], origin: GeoPoint): (T & { distanceKm: number })[] {
  return items.map((item) => ({ ...item, distanceKm: roundKm(haversineKm(origin, item.location)) }));
}

/** Sort ascending by `distanceKm` (items without a distance go last). Returns a new array. */
export function sortByDistance<T extends { distanceKm?: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

export function withinRadius<T extends { distanceKm?: number }>(items: readonly T[], radiusKm: number): T[] {
  return items.filter((item) => (item.distanceKm ?? Number.POSITIVE_INFINITY) <= radiusKm);
}

/** Nearest item or null. */
export function nearest<T extends { location: GeoPoint }>(items: readonly T[], origin: GeoPoint): (T & { distanceKm: number }) | null {
  const decorated = sortByDistance(withDistance(items, origin));
  return decorated[0] ?? null;
}

/** Move a point by metres east/north (good enough for city-scale jitter). */
export function offsetMeters(point: GeoPoint, eastMeters: number, northMeters: number): GeoPoint {
  const dLat = northMeters / 111_320;
  const dLng = eastMeters / (111_320 * Math.cos(toRad(point.lat)));
  return { lat: point.lat + dLat, lng: point.lng + dLng };
}

/** Bounding region (react-native-maps style deltas) containing all points, with padding. */
export function regionForPoints(points: readonly GeoPoint[], paddingPct = 0.2): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  if (!points.length) return { latitude: DOHA_CENTER.lat, longitude: DOHA_CENTER.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const latDelta = Math.max(0.01, (maxLat - minLat) * (1 + paddingPct));
  const lngDelta = Math.max(0.01, (maxLng - minLng) * (1 + paddingPct));
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}


/** `1.2 كم` / `1.2 km` with Latin digits. */
export function formatDistanceKm(km: number, lang: 'ar' | 'en'): string {
  const rounded = roundKm(km);
  if (rounded < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return lang === 'ar' ? `${meters} م` : `${meters} m`;
  }
  const value = rounded < 10 ? rounded.toFixed(1) : String(Math.round(rounded));
  return lang === 'ar' ? `${value} كم` : `${value} km`;
}
