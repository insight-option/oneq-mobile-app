/**
 * Id / code generation helpers.
 *  - `id(prefix)` → unique, monotonically increasing ids for runtime mutations (`b_lx3k9a01`).
 *  - `createSequence(prefix)` → deterministic padded sequences for seed data (`b_0001`, `b_0002`…).
 *  - `bookingCode()` / `giftCode()` / `subscriptionCode()` → human codes without ambiguous glyphs (`OQ-4K7Z2`).
 *  - `createRng(seed)` / `hashString(s)` → deterministic pseudo-randomness for reproducible fixtures.
 * Framework-free.
 */

/** Human-code alphabet: no 0/O/1/I to avoid confusion when read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let lastStamp = 0;
let stampCounter = 0;
let codeCounter = 0;

/** Unique id for runtime-created records. Time-ordered (base36 timestamp + per-ms counter). */
export function id(prefix: string): string {
  const now = Date.now();
  if (now === lastStamp) {
    stampCounter += 1;
  } else {
    lastStamp = now;
    stampCounter = 0;
  }
  return `${prefix}_${now.toString(36)}${stampCounter.toString(36).padStart(2, '0')}`;
}

/** Deterministic id sequence: `createSequence('b')()` → `b_0001`, `b_0002`, … */
export function createSequence(prefix: string, start = 1, width = 4): () => string {
  let n = start;
  return () => {
    const value = `${prefix}_${String(n).padStart(width, '0')}`;
    n += 1;
    return value;
  };
}

/** FNV-1a 32-bit hash → unsigned int. Stable across platforms. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG → function returning floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from an rng. */
export function rngInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element deterministically. */
export function rngPick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

function codeChars(seed: number, length: number): string {
  const rng = createRng(seed);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return out;
}

function nextCodeSeed(seed?: number): number {
  if (typeof seed === 'number') return seed >>> 0;
  codeCounter += 1;
  return hashString(`${Date.now()}:${codeCounter}:${Math.random()}`);
}

/** `OQ-4K7Z2` — pass a seed for reproducible fixtures. */
export function bookingCode(seed?: number): string {
  return `OQ-${codeChars(nextCodeSeed(seed), 5)}`;
}

/** `GF-8N2PQ` */
export function giftCode(seed?: number): string {
  return `GF-${codeChars(nextCodeSeed(seed), 5)}`;
}

/** `SB-M4D7X` */
export function subscriptionCode(seed?: number): string {
  return `SB-${codeChars(nextCodeSeed(seed), 5)}`;
}

/** 6-digit numeric code (mock OTP style). */
export function numericCode(seed: number, length = 6): string {
  const rng = createRng(seed);
  let out = '';
  for (let i = 0; i < length; i += 1) out += String(Math.floor(rng() * 10));
  return out;
}
