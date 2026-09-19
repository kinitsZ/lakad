/** Formatting helpers. Dates arrive from Postgres as "YYYY-MM-DD" strings. */

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });

const dayFmt = fmt({ weekday: "short", day: "numeric" });
const fullDayFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const weekdayFmt = fmt({ weekday: "long" });
const shortWeekdayFmt = fmt({ weekday: "short" });
const monthFmt = fmt({ month: "long", year: "numeric" });
const shortMonthFmt = fmt({ month: "short" });
const deadlineFmt = fmt({ weekday: "short", day: "numeric", month: "short" });

/** "Sat 12" */
export const shortDay = (iso: string) => dayFmt.format(utc(iso)).replace(",", "");

/** "Saturday 12 December" */
export const fullDay = (iso: string) => fullDayFmt.format(utc(iso));

/** "Saturday" */
export const weekday = (iso: string) => weekdayFmt.format(utc(iso));

/** "Sat" */
export const shortWeekday = (iso: string) => shortWeekdayFmt.format(utc(iso));

/** "December 2026" */
export const monthLabel = (iso: string) => monthFmt.format(utc(iso));

/** "Dec 12–15", or "Dec 30 – Jan 2" across a month boundary. */
export function rangeLabel(startIso: string, endIso: string) {
  const start = utc(startIso);
  const end = utc(endIso);
  const startMonth = shortMonthFmt.format(start);
  const endMonth = shortMonthFmt.format(end);
  return startMonth === endMonth
    ? `${startMonth} ${start.getUTCDate()}–${end.getUTCDate()}`
    : `${startMonth} ${start.getUTCDate()} – ${endMonth} ${end.getUTCDate()}`;
}

/** "Fri 25 Sep, 8:00 pm" */
export function deadlineLabel(date: Date) {
  const day = deadlineFmt.format(date).replace(",", "");
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
  return `${day}, ${time}`;
}

/** "2 days", "47h", "12m" — how long until `date`. */
export function countdown(date: Date, now = new Date()) {
  const ms = date.getTime() - now.getTime();
  if (ms <= 0) return { closed: true, days: 0, hours: 0, minutes: 0 };
  const minutes = Math.floor(ms / 60_000);
  return {
    closed: false,
    days: Math.floor(minutes / 1440),
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  };
}

export function countdownLabel(date: Date, now = new Date()) {
  const c = countdown(date, now);
  if (c.closed) return "closed";
  if (c.days >= 1) return `${c.days} day${c.days === 1 ? "" : "s"}`;
  if (c.hours >= 1) return `${c.hours} hour${c.hours === 1 ? "" : "s"}`;
  return `${c.minutes} min`;
}

/** "47h" on mobile, "47h 12m" where there's room. */
export const countdownShort = (date: Date, now = new Date()) => {
  const c = countdown(date, now);
  return c.closed ? "—" : `${c.hours}h`;
};

export const countdownLong = (date: Date, now = new Date()) => {
  const c = countdown(date, now);
  return c.closed ? "—" : `${c.hours}h ${c.minutes}m`;
};

/** "12:10 pm" from a Postgres time value like "14:10:00". */
export function timeLabel(value: string) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "14:10" back out of a time input. */
export const toTimeValue = (value: string) => value.slice(0, 5);

/** Adds days to an ISO date string without touching timezones. */
export function addDays(iso: string, days: number) {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Every ISO day from start to end inclusive. */
export function daysBetween(startIso: string, endIso: string) {
  const out: string[] = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) out.push(d);
  return out;
}
