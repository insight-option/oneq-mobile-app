import dayjs from 'dayjs';
import type { DateString, DayHours, OpeningHours, TimeString, Weekday, WeeklyAvailability } from '@/domain/types';

export const todayStr = (): DateString => dayjs().format('YYYY-MM-DD');
export const addDays = (date: DateString | Date, n: number): DateString => dayjs(date).add(n, 'day').format('YYYY-MM-DD');
export const isSameDay = (a: DateString | Date, b: DateString | Date): boolean => dayjs(a).isSame(dayjs(b), 'day');
export const weekdayOf = (date: DateString | Date): Weekday => dayjs(date).day() as Weekday;
export const nowIso = (): string => new Date().toISOString();
export const daysAgoIso = (days: number, hours = 0): string => dayjs().subtract(days, 'day').subtract(hours, 'hour').toISOString();

export const timeToMinutes = (t: TimeString): number => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const minutesToTime = (min: number): TimeString => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const DEFAULT_HOURS: OpeningHours = {
  0: { open: true, from: '09:00', to: '22:00' },
  1: { open: true, from: '09:00', to: '22:00' },
  2: { open: true, from: '09:00', to: '22:00' },
  3: { open: true, from: '09:00', to: '22:00' },
  4: { open: true, from: '09:00', to: '22:00' },
  5: { open: false, from: '14:00', to: '22:00' },
  6: { open: true, from: '09:00', to: '22:00' },
};

export const makeHours = (from: TimeString, to: TimeString, closedDays: Weekday[] = []): OpeningHours => {
  const out = {} as OpeningHours;
  ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).forEach((d) => {
    out[d] = { open: !closedDays.includes(d), from, to };
  });
  return out;
};

export const makeAvailability = (from: TimeString, to: TimeString, offDays: Weekday[] = []): WeeklyAvailability => {
  const out = {} as WeeklyAvailability;
  ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).forEach((d) => {
    out[d] = { available: !offDays.includes(d), from, to };
  });
  return out;
};

export const todayHours = (hours: OpeningHours, now = new Date()): DayHours => hours[now.getDay() as Weekday];

/** Is the business open at `now` according to its weekly hours (supports closing after midnight). */
export const isOpenNow = (hours: OpeningHours | null | undefined, now = new Date()): boolean => {
  if (!hours) return false;
  const day = now.getDay() as Weekday;
  const cur = now.getHours() * 60 + now.getMinutes();
  const today = hours[day];
  if (today?.open) {
    const from = timeToMinutes(today.from);
    const to = timeToMinutes(today.to);
    if (to > from ? cur >= from && cur < to : cur >= from || cur < to) return true;
  }
  const prevDay = ((day + 6) % 7) as Weekday;
  const prev = hours[prevDay];
  if (prev?.open && timeToMinutes(prev.to) < timeToMinutes(prev.from) && cur < timeToMinutes(prev.to)) return true;
  return false;
};

export interface NextOpenInfo {
  open: boolean;
  /** closing time today when open */
  closesAt?: TimeString;
  /** next opening: 'today' | 'tomorrow' | weekday */
  opensAt?: TimeString;
  opensDay?: 'today' | 'tomorrow' | Weekday;
}

export const nextOpenInfo = (hours: OpeningHours | null | undefined, now = new Date()): NextOpenInfo => {
  if (!hours) return { open: false };
  const day = now.getDay() as Weekday;
  if (isOpenNow(hours, now)) return { open: true, closesAt: hours[day]?.open ? hours[day].to : hours[((day + 6) % 7) as Weekday]?.to };
  const cur = now.getHours() * 60 + now.getMinutes();
  if (hours[day]?.open && timeToMinutes(hours[day].from) > cur) return { open: false, opensAt: hours[day].from, opensDay: 'today' };
  for (let i = 1; i <= 7; i++) {
    const d = ((day + i) % 7) as Weekday;
    if (hours[d]?.open) return { open: false, opensAt: hours[d].from, opensDay: i === 1 ? 'tomorrow' : d };
  }
  return { open: false };
};

/** Build 30-minute slots inside [from, to) optionally intersected with a staff window. */
export const buildSlots = (from: TimeString, to: TimeString, stepMin = 30, staffWindow?: { from: TimeString; to: TimeString } | null): TimeString[] => {
  let start = timeToMinutes(from);
  let end = timeToMinutes(to);
  if (end <= start) end = 24 * 60;
  if (staffWindow) {
    start = Math.max(start, timeToMinutes(staffWindow.from));
    end = Math.min(end, timeToMinutes(staffWindow.to) || end);
  }
  const out: TimeString[] = [];
  for (let m = start; m + stepMin <= end; m += stepMin) out.push(minutesToTime(m));
  return out;
};

export const greetingKeyByHour = (hour = new Date().getHours()): 'morning' | 'afternoon' | 'evening' => (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening');
