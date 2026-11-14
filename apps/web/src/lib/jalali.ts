import jalaali from "jalaali-js";

export const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const WEEK_HEAD = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentJalali() {
  const [year, month, day] = todayIso().split("-").map(Number);
  return jalaali.toJalaali(year, month, day);
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  const next = ((index % 12) + 12) % 12;
  return { jy: Math.floor(index / 12), jm: next + 1 };
}

export function monthMatrix(year: number, month: number) {
  const length = jalaali.jalaaliMonthLength(year, month);
  const first = jalaali.toGregorian(year, month, 1);
  const weekday = new Date(`${isoFromGregorian(first)}T12:00:00+03:30`).getUTCDay();
  const offset = (weekday + 1) % 7;
  const cells: ({ iso: string; jd: number } | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= length; day += 1) {
    cells.push({ jd: day, iso: isoFromGregorian(jalaali.toGregorian(year, month, day)) });
  }
  return cells;
}

export function jalaliToIso(year: number, month: number, day: number) {
  return isoFromGregorian(jalaali.toGregorian(year, month, day));
}

const TEHRAN_DAY = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const TEHRAN_CLOCK = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function ltr(value: string) {
  return `\u2066${value}\u2069`;
}

export function formatIsoDate(iso: string) {
  return TEHRAN_DAY.format(new Date(`${iso}T12:00:00+03:30`));
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return `${TEHRAN_DAY.format(date)}، ${ltr(TEHRAN_CLOCK.format(date))}`;
}

const TEHRAN_PARTS = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
  timeZone: "Asia/Tehran",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatDateOnly(value: string) {
  return TEHRAN_DAY.format(new Date(value));
}

export function formatClock(value: string) {
  return ltr(TEHRAN_CLOCK.format(new Date(value)));
}

export function dayBlock(value: string) {
  const parts = TEHRAN_PARTS.formatToParts(new Date(value));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: pick("weekday"), day: pick("day"), month: pick("month") };
}

export function tehranHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
}

export function relativeDay(value: string) {
  const target = tehranDateKey(value);
  const today = todayIso();
  const diff = Math.round((Date.parse(`${target}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (diff === 0) return "امروز";
  if (diff === 1) return "فردا";
  if (diff === -1) return "دیروز";
  return null;
}

export function tehranDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function dayRange(iso: string) {
  const start = new Date(`${iso}T00:00:00+03:30`);
  return { from: start.toISOString(), to: new Date(start.getTime() + 86_400_000).toISOString() };
}

export function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function isoFromGregorian(date: { gy: number; gm: number; gd: number }) {
  return `${date.gy}-${String(date.gm).padStart(2, "0")}-${String(date.gd).padStart(2, "0")}`;
}
