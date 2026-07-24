// Itinerary domain logic: trip/event model, localStorage persistence, day
// derivation, free-gap computation, and content-coupled gap recommendations.
// Pure/framework-agnostic so the React components stay thin.

import type { ArticleCard } from './content';

export type EventCategory = 'transit' | 'lodging' | 'activity' | 'food' | 'car' | 'custom';

/** Palette for fixed-event categories, mirroring the TripLine design. */
export const EVENT_CATEGORY: Record<EventCategory, { label: string; bg: string; color: string }> = {
  transit: { label: 'Flight / transit', bg: '#dcefec', color: '#1f8f83' },
  lodging: { label: 'Lodging', bg: '#f4e3ef', color: '#9c5a86' },
  activity: { label: 'Activity', bg: '#fdecd1', color: '#d1901a' },
  food: { label: 'Food', bg: '#fbe0d8', color: '#cf5a3f' },
  car: { label: 'Car / rental', bg: '#e7f0d7', color: '#5f8f3f' },
  custom: { label: 'Other', bg: '#f5ecd9', color: '#9c8a6a' },
};

export interface TripEvent {
  id: string;
  kind: 'fixed' | 'content';
  title: string;
  location: string;
  category: EventCategory;
  start: number; // minutes from midnight
  durationMin: number;
  slug?: string; // content events only
  colorHint?: string; // content events: their content-category color for the dot
  regionId?: string; // for proximity ranking
  coordinates?: [number, number] | null;
}

export interface Trip {
  title: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  dayStart: number; // window start, minutes-of-day (default 08:00)
  dayEnd: number; // window end, minutes-of-day (default 21:00)
  eventsByDay: Record<number, TripEvent[]>;
}

const KEY_TRIP = 'tripline.trip.v1';
const KEY_WISH = 'tripline.wishlist.v1';
const MIN_GAP = 30; // minutes; shorter free spans aren't shown as plannable gaps
const DRIVE_KMH = 45; // rough average for travel-time estimate

// ---- persistence ---------------------------------------------------------
export function loadTrip(): Trip | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY_TRIP);
    return raw ? (JSON.parse(raw) as Trip) : null;
  } catch {
    return null;
  }
}

export function saveTrip(trip: Trip): void {
  try {
    localStorage.setItem(KEY_TRIP, JSON.stringify(trip));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export function loadWishlist(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_WISH);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(slugs: string[]): void {
  try {
    localStorage.setItem(KEY_WISH, JSON.stringify(slugs));
  } catch {
    /* non-fatal */
  }
}

// ---- defaults ------------------------------------------------------------
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A blank, ready-to-edit 3-day trip starting today. */
export function defaultTrip(): Trip {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 2);
  return {
    title: 'My Maui Trip',
    startDate: isoDate(start),
    endDate: isoDate(end),
    dayStart: 8 * 60,
    dayEnd: 21 * 60,
    eventsByDay: {},
  };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- days ----------------------------------------------------------------
export interface DayInfo {
  index: number;
  date: Date;
  label: string; // "Day 1"
  dateLabel: string; // "Friday, Aug 14"
  shortDate: string; // "Aug 14"
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function tripDays(trip: Trip): DayInfo[] {
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  const days: DayInfo[] = [];
  const MS = 24 * 60 * 60 * 1000;
  const count = Math.max(0, Math.round((end.getTime() - start.getTime()) / MS)) + 1;
  for (let i = 0; i < Math.min(count, 60); i++) {
    const date = new Date(start.getTime() + i * MS);
    days.push({
      index: i,
      date,
      label: `Day ${i + 1}`,
      dateLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  return days;
}

// ---- time helpers --------------------------------------------------------
export function minutesToLabel(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function timeRange(start: number, durationMin: number): string {
  return `${minutesToLabel(start)} – ${minutesToLabel(start + durationMin)}`;
}

export function formatDuration(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}m`;
  if (mm === 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

/** "HH:MM" (24h, from <input type=time>) -> minutes-of-day. */
export function parseTimeInput(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutes-of-day -> "HH:MM" for <input type=time>. */
export function toTimeInput(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---- geo / travel --------------------------------------------------------
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough drive minutes between two coords, or 0 if either is missing. */
export function travelMinutes(a?: [number, number] | null, b?: [number, number] | null): number {
  if (!a || !b) return 0;
  const km = haversineKm(a, b);
  if (km < 0.3) return 0;
  return Math.max(5, Math.round((km / DRIVE_KMH) * 60));
}

// ---- timeline items ------------------------------------------------------
export type TimelineItem =
  | { type: 'event'; event: TripEvent }
  | { type: 'travel'; minutes: number }
  | { type: 'gap'; minutes: number; start: number; regionHint: string | null; afterEventId: string | null };

export function sortedEvents(trip: Trip, day: number): TripEvent[] {
  return [...(trip.eventsByDay[day] || [])].sort((a, b) => a.start - b.start);
}

/**
 * Build the ordered timeline for a day: events, travel pills between events
 * that both have coordinates, and free-time gaps (leading/between/trailing)
 * within the day window. Each gap carries a regionHint (region of the nearest
 * scheduled content event) used to rank recommendations by proximity.
 */
export function buildTimeline(trip: Trip, day: number): TimelineItem[] {
  const events = sortedEvents(trip, day);
  const items: TimelineItem[] = [];
  const nearestRegion = (i: number): string | null => {
    for (let d = 0; d < events.length; d++) {
      const before = events[i - d];
      const after = events[i + d];
      if (before?.regionId) return before.regionId;
      if (after?.regionId) return after.regionId;
    }
    return null;
  };

  const pushGap = (from: number, to: number, afterEventId: string | null, regionHint: string | null) => {
    const mins = to - from;
    if (mins >= MIN_GAP) items.push({ type: 'gap', minutes: mins, start: from, regionHint, afterEventId });
  };

  if (events.length === 0) {
    pushGap(trip.dayStart, trip.dayEnd, null, null);
    return items;
  }

  // leading gap
  pushGap(trip.dayStart, events[0].start, null, nearestRegion(0));

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    items.push({ type: 'event', event: ev });
    const next = events[i + 1];
    if (!next) {
      pushGap(ev.start + ev.durationMin, trip.dayEnd, ev.id, nearestRegion(i));
      break;
    }
    const travel = travelMinutes(ev.coordinates, next.coordinates);
    const prevEnd = ev.start + ev.durationMin;
    if (travel > 0) items.push({ type: 'travel', minutes: travel });
    pushGap(prevEnd + travel, next.start, ev.id, nearestRegion(i));
  }
  return items;
}

export interface DayStats {
  events: number;
  freeLabel: string;
  travelLabel: string;
}

export function dayStats(trip: Trip, day: number): DayStats {
  const items = buildTimeline(trip, day);
  let free = 0;
  let travel = 0;
  for (const it of items) {
    if (it.type === 'gap') free += it.minutes;
    if (it.type === 'travel') travel += it.minutes;
  }
  return {
    events: (trip.eventsByDay[day] || []).length,
    freeLabel: free ? formatDuration(free) : '0m',
    travelLabel: travel ? formatDuration(travel) : '—',
  };
}

// ---- recommendations -----------------------------------------------------
/**
 * Rank attractions that fit a gap: wishlist members first, then same-region as
 * the gap's neighbours, preferring options that use more of the free time.
 */
export function recommendForGap(
  gapMinutes: number,
  articles: ArticleCard[],
  opts: { wishlist: Set<string>; used: Set<string>; regionHint: string | null }
): ArticleCard[] {
  const { wishlist, used, regionHint } = opts;
  return articles
    .filter((a) => a.minTimeMinutes > 0 && a.minTimeMinutes <= gapMinutes && !used.has(a.slug))
    .map((a) => {
      let score = 0;
      if (wishlist.has(a.slug)) score += 1000;
      if (regionHint && a.regionId === regionHint) score += 100;
      score += a.minTimeMinutes / 10; // prefer filling more of the gap
      return { a, score };
    })
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}

/** Slugs already scheduled anywhere in the trip. */
export function usedSlugs(trip: Trip): Set<string> {
  const s = new Set<string>();
  Object.values(trip.eventsByDay).forEach((list) => list.forEach((e) => e.slug && s.add(e.slug)));
  return s;
}

// ---- export / share ------------------------------------------------------
function icsDate(day: Date, minutes: number): string {
  const d = new Date(day.getTime());
  d.setHours(Math.floor(minutes / 60), Math.round(minutes % 60), 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

export function tripToICS(trip: Trip): string {
  const days = tripDays(trip);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TripLine//Maui//EN', 'CALSCALE:GREGORIAN'];
  for (const day of days) {
    for (const ev of sortedEvents(trip, day.index)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@tripline`,
        `DTSTART:${icsDate(day.date, ev.start)}`,
        `DTEND:${icsDate(day.date, ev.start + ev.durationMin)}`,
        `SUMMARY:${escapeICS(ev.title)}`,
        ...(ev.location ? [`LOCATION:${escapeICS(ev.location)}`] : []),
        'END:VEVENT'
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICS(s: string): string {
  return s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

/** base64 of the trip JSON (UTF-8 safe), for a shareable/importable #trip= link. */
export function encodeTrip(trip: Trip): string {
  const json = JSON.stringify(trip);
  if (typeof btoa === 'undefined') return Buffer.from(json, 'utf8').toString('base64');
  let bin = '';
  new TextEncoder().encode(json).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function decodeTrip(b64: string): Trip | null {
  try {
    let json: string;
    if (typeof atob === 'undefined') {
      json = Buffer.from(b64, 'base64').toString('utf8');
    } else {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      json = new TextDecoder().decode(bytes);
    }
    return JSON.parse(json) as Trip;
  } catch {
    return null;
  }
}
