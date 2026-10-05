/**
 * Text helpers: Arabic normalisation, fuzzy matching and small formatting utilities.
 * Used by the mock repository (search) and by the UI (highlights, initials). Framework-free.
 */
import type { Lang, LocalizedText } from '@/domain/types';

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const ARABIC_INDIC = /[٠-٩]/g;
const EXTENDED_ARABIC_INDIC = /[۰-۹]/g;

/** Convert Arabic-Indic (٠١٢) and extended (۰۱۲) digits to Latin digits. */
export function toLatinDigits(input: string): string {
  return input
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EXTENDED_ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Remove diacritics (tashkeel) and tatweel. */
export function stripTashkeel(input: string): string {
  return input.replace(TASHKEEL, '');
}

/** أ/إ/آ → ا, ة → ه, ى → ي, ؤ → و, ئ → ي, plus tashkeel removal. */
export function normalizeArabic(input: string): string {
  return stripTashkeel(input)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

/** Lower-case, Arabic-normalised, Latin digits, punctuation stripped, single spaces. */
export function normalizeText(input: string): string {
  return normalizeArabic(toLatinDigits(input))
    .toLowerCase()
    .replace(/[،؛؟.,;:!?'"`()[\]{}<>\/|@#$%^&*_+=~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  return normalized ? normalized.split(' ') : [];
}

/** Classic Levenshtein distance (small strings only). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

function tokenScore(hayWords: string[], hayJoined: string, token: string): number {
  if (!token) return 0;
  if (hayJoined.includes(token)) {
    if (hayWords.includes(token)) return 3; // whole word
    if (hayWords.some((w) => w.startsWith(token))) return 2.5; // prefix
    return 2; // substring
  }
  if (token.length >= 4) {
    const tolerance = token.length >= 7 ? 2 : 1;
    for (const w of hayWords) {
      if (Math.abs(w.length - token.length) > tolerance) continue;
      if (levenshtein(w, token) <= tolerance) return 1.2;
    }
    // typo inside a longer word: compare against same-length prefixes
    for (const w of hayWords) {
      if (w.length > token.length && levenshtein(w.slice(0, token.length), token) <= 1) return 1;
    }
  }
  return 0;
}

/**
 * Fuzzy relevance score of `needle` against `haystack` (0 = no match). All query tokens must match.
 * Exact word matches score highest, prefixes next, then substrings, then typo-tolerant matches.
 */
export function fuzzyScore(haystack: string, needle: string): number {
  const tokens = tokenize(needle);
  if (!tokens.length) return 0;
  const hayWords = tokenize(haystack);
  if (!hayWords.length) return 0;
  const hayJoined = hayWords.join(' ');
  let total = 0;
  for (const token of tokens) {
    const s = tokenScore(hayWords, hayJoined, token);
    if (s === 0) return 0;
    total += s;
  }
  // bonus when the whole normalised query appears contiguously
  if (hayJoined.includes(tokens.join(' '))) total += 1.5;
  if (hayJoined.startsWith(tokens.join(' '))) total += 1;
  return total;
}

export function fuzzyMatch(haystack: string, needle: string): boolean {
  return fuzzyScore(haystack, needle) > 0;
}

/** Best score across several fields. */
export function fuzzyScoreMany(fields: (string | null | undefined)[], needle: string): number {
  let best = 0;
  for (const f of fields) {
    if (!f) continue;
    const s = fuzzyScore(f, needle);
    if (s > best) best = s;
  }
  return best;
}

/** Localised text with Arabic fallback when the other language is empty. */
export function pickText(text: LocalizedText | null | undefined, lang: Lang): string {
  if (!text) return '';
  const value = lang === 'en' ? text.en : text.ar;
  return value && value.trim() ? value : text.ar || text.en || '';
}

/** Up to two initials from a display name (handles Arabic names). */
export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p && !/^(ال|بن|بنت|أبو|ابو|عبد|al|bin|bint|abu|el)$/i.test(p));
  const source = parts.length ? parts : name.trim().split(/\s+/);
  const first = source[0]?.[0] ?? '';
  const second = source.length > 1 ? source[source.length - 1][0] ?? '' : '';
  return `${first}${second}`.toUpperCase();
}

/** [start, end) ranges of `query` tokens inside `text` for highlight rendering (case/diacritic insensitive, same length). */
export function highlightRanges(text: string, query: string): [number, number][] {
  const tokens = tokenize(query);
  if (!tokens.length || !text) return [];
  const normalized = normalizeArabic(toLatinDigits(text)).toLowerCase();
  if (normalized.length !== text.length) return []; // normalisation changed lengths: skip highlighting safely
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let from = 0;
    while (from <= normalized.length - token.length) {
      const idx = normalized.indexOf(token, from);
      if (idx === -1) break;
      ranges.push([idx, idx + token.length]);
      from = idx + token.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

export function truncate(input: string, max: number, ellipsis = '…'): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - ellipsis.length)).trimEnd()}${ellipsis}`;
}

/** ASCII slug from Latin text ("Dar Al Jori Beauty" → "dar-al-jori-beauty"). */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** True when the string contains Arabic letters (used to pick fonts / direction for free text). */
export function hasArabic(input: string): boolean {
  return /[؀-ۿ]/.test(input);
}
