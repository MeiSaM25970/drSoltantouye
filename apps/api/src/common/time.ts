export const TEHRAN = "Asia/Tehran";

export function formatTehranDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function tehranInstant(date: string, minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hours}:${mins}:00+03:30`);
}

export function addDays(date: string, days: number) {
  const next = tehranInstant(date, 12 * 60);
  next.setUTCDate(next.getUTCDate() + days);
  return formatTehranDate(next);
}

export function weekdayIndex(date: string) {
  return tehranInstant(date, 12 * 60).getUTCDay();
}

const persianDay = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const persianClock = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
  timeZone: TEHRAN,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatTehranSpoken(date: Date) {
  return persianDay.format(date);
}

export function clockLabel(date: Date) {
  return `\u2066${persianClock.format(date)}\u2069`;
}

export function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
