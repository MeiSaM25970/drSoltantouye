const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC = "٠١٢٣٤٥٦٧٨٩";

/** Persian and Arabic-Indic digits become Latin digits; everything else is kept. */
export function toLatinDigits(input: string) {
  return input
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC.indexOf(digit)));
}

export function normalizePhone(input: string) {
  const digits = toLatinDigits(input.trim()).replace(/[^\d+]/g, "");

  if (digits.startsWith("+98")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0098")) return `0${digits.slice(4)}`;
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

export function faDigits(value: string) {
  return value.replace(/\d/g, (digit) => PERSIAN[Number(digit)] ?? digit);
}

export function formatPhone(phone: string) {
  const value = normalizePhone(phone);
  const grouped = value.length === 11 && value.startsWith("09")
    ? `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`
    : value.length === 11 && value.startsWith("0")
      ? `${value.slice(0, 3)} ${value.slice(3, 7)} ${value.slice(7)}`
      : value;
  return `\u2066${faDigits(grouped)}\u2069`;
}
