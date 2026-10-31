// Timezone helpers. The DB stores UTC; "today" is always the user's local day
// (timezone set in Settings). No external date library needed.

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(date)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour, min: o.minute, s: o.second };
}

/** Offset of tz from UTC at the given instant, in ms (e.g. +05:30 => 19800000). */
export function tzOffsetMs(date: Date, tz: string): number {
  const p = parts(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Local calendar date string YYYY-MM-DD for an instant in tz. */
export function localDateKey(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** UTC instant of local midnight for the local day containing `date`. DST-safe. */
export function startOfLocalDay(date: Date, tz: string): Date {
  const p = parts(date, tz);
  const guess = Date.UTC(p.y, p.m - 1, p.d);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  // Re-check once in case a DST change happened between guess and the result.
  t = guess - tzOffsetMs(new Date(t), tz);
  return new Date(t);
}

/** UTC instant of the next local midnight after `date`. */
export function startOfNextLocalDay(date: Date, tz: string): Date {
  const start = startOfLocalDay(date, tz);
  return startOfLocalDay(new Date(start.getTime() + 36 * 3600 * 1000), tz);
}

export function minutesBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 60000;
}

/** ISO week key like "2026-W44" for the local date of `date` in tz. */
export function isoWeekKey(date: Date, tz: string): string {
  const [y, m, d] = localDateKey(date, tz).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Previous calendar day for a YYYY-MM-DD key. */
export function prevDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
}

/** Count consecutive days ending today (or yesterday, so a streak isn't "lost" before the day is over). */
export function dayStreak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : prevDateKey(today);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = prevDateKey(cursor);
  }
  return n;
}
