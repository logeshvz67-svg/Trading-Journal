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
