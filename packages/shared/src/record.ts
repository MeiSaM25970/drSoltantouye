import { z } from "zod";
import { toLatinDigits } from "./phone";
import { phoneSchema } from "./schemas";

/**
 * A patient file has three sections. Who may edit each one:
 *  - patient : the patient (own file) + secretary, dentist, admin
 *  - clinical: dentist + admin
 *  - clinic  : secretary + admin
 * Admin can always edit everything.
 */
export type RecordSection = "patient" | "clinical" | "clinic";
export type FieldKind = "text" | "textarea" | "select" | "multi" | "date" | "toggle" | "list";
export type Option = { value: string; label: string };

export type RecordField = {
  key: string;
  label: string;
  kind: FieldKind;
  section: RecordSection;
  group: string;
  store: "profile" | "record";
  options?: readonly Option[];
  hint?: string;
  placeholder?: string;
  ltr?: boolean;
  max?: number;
  wide?: boolean;
  /** counted for the "how complete is this file" ring */
  core?: boolean;
  /** shown read-only to the patient even when the section is not theirs */
  patientVisible?: boolean;
};

export const SECTION_META: Record<RecordSection, { title: string; lead: string; who: string }> = {
  patient: {
    title: "اطلاعات بیمار",
    lead: "هویت، سابقه سلامت و دلیل مراجعه. بیمار خودش هم می‌تواند این بخش را کامل کند.",
    who: "بیمار، منشی، پزشک، ادمین",
  },
  clinical: {
    title: "معاینه و درمان",
    lead: "یافته‌های معاینه، تشخیص و طرح درمان.",
    who: "پزشک و ادمین",
  },
  clinic: {
    title: "امور مطب",
    lead: "وضعیت پرونده، رضایت‌نامه، پیگیری و یادداشت داخلی.",
    who: "منشی و ادمین",
  },
};

const opts = (...pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }));

export const GENDER_OPTIONS = opts(["female", "زن"], ["male", "مرد"]);

export const RECORD_FIELDS: readonly RecordField[] = [
  // ───────── بیمار: هویت و تماس
  { key: "nationalId", label: "کد ملی", kind: "text", section: "patient", group: "هویت و تماس", store: "profile", ltr: true, max: 10, core: true, placeholder: "۱۰ رقم" },
  { key: "birthDate", label: "تاریخ تولد", kind: "date", section: "patient", group: "هویت و تماس", store: "profile", core: true },
  { key: "gender", label: "جنسیت", kind: "select", section: "patient", group: "هویت و تماس", store: "profile", options: GENDER_OPTIONS, core: true },
  { key: "job", label: "شغل", kind: "text", section: "patient", group: "هویت و تماس", store: "profile", max: 80 },
  { key: "city", label: "شهر", kind: "text", section: "patient", group: "هویت و تماس", store: "profile", max: 60, core: true },
  { key: "address", label: "نشانی", kind: "textarea", section: "patient", group: "هویت و تماس", store: "profile", max: 300, wide: true },
  { key: "emergencyName", label: "نام فرد برای تماس اضطراری", kind: "text", section: "patient", group: "هویت و تماس", store: "profile", max: 80, core: true },
  { key: "emergencyPhone", label: "موبایل تماس اضطراری", kind: "text", section: "patient", group: "هویت و تماس", store: "profile", ltr: true, max: 20, core: true },
  { key: "insuranceName", label: "بیمه", kind: "text", section: "patient", group: "هویت و تماس", store: "profile", max: 80, placeholder: "مثلاً تأمین اجتماعی یا ندارم" },
  {
    key: "referralSource", label: "از کجا با مطب آشنا شدید؟", kind: "select", section: "patient", group: "هویت و تماس", store: "profile",
    options: opts(["instagram", "اینستاگرام"], ["google", "گوگل یا نقشه"], ["friend", "معرفی دوست یا آشنا"], ["doctor", "معرفی پزشک"], ["passing", "عبور از مقابل مطب"], ["other", "سایر"]),
  },

  // ───────── بیمار: مراجعه
  { key: "chiefComplaint", label: "دلیل مراجعه", kind: "textarea", section: "patient", group: "دلیل مراجعه", store: "record", max: 1000, wide: true, core: true, placeholder: "مشکل یا درمانی که می‌خواهید را کوتاه بنویسید" },
  {
    key: "concerns", label: "مشکلاتی که دارید", kind: "multi", section: "patient", group: "دلیل مراجعه", store: "record", wide: true,
    options: opts(["bleedingGums", "خونریزی لثه"], ["sensitivity", "حساسیت به سرد و گرم"], ["badBreath", "بوی بد دهان"], ["jawPain", "درد یا صدای فک"], ["chewingPain", "درد هنگام جویدن"], ["looseTeeth", "لقی دندان"], ["crowding", "کجی یا شلوغی دندان‌ها"], ["discoloration", "تغییر رنگ دندان"], ["missingTeeth", "دندان از دست‌رفته"], ["dryMouth", "خشکی دهان"]),
  },
  {
    key: "lastDentalVisit", label: "آخرین مراجعه به دندانپزشک", kind: "select", section: "patient", group: "دلیل مراجعه", store: "record", core: true,
    options: opts(["lt6", "کمتر از ۶ ماه پیش"], ["m6_12", "۶ تا ۱۲ ماه پیش"], ["y1_2", "۱ تا ۲ سال پیش"], ["gt2", "بیش از ۲ سال پیش"], ["never", "تا حالا نرفته‌ام"]),
  },
  {
    key: "brushing", label: "مسواک زدن", kind: "select", section: "patient", group: "عادت‌های دهانی", store: "record",
    options: opts(["rare", "گاهی"], ["once", "روزی یک بار"], ["twice", "روزی دو بار یا بیشتر"]),
  },
  {
    key: "flossing", label: "نخ دندان", kind: "select", section: "patient", group: "عادت‌های دهانی", store: "record",
    options: opts(["no", "استفاده نمی‌کنم"], ["sometimes", "گاهی"], ["daily", "هر روز"]),
  },
  {
    key: "dentalAnxiety", label: "استرس از دندانپزشکی", kind: "select", section: "patient", group: "عادت‌های دهانی", store: "record",
    options: opts(["none", "ندارم"], ["mild", "کمی"], ["strong", "زیاد"]),
  },
  {
    key: "habits", label: "عادت‌ها", kind: "multi", section: "patient", group: "عادت‌های دهانی", store: "record", wide: true,
    options: opts(["bruxism", "دندان‌قروچه"], ["nailBiting", "جویدن ناخن"], ["hookah", "قلیان"], ["mouthBreathing", "تنفس از دهان"], ["hardChewing", "جویدن یخ یا چیزهای سفت"]),
  },

  // ───────── بیمار: سلامت عمومی
  {
    key: "conditions", label: "بیماری‌ها و شرایط", kind: "multi", section: "patient", group: "سلامت عمومی", store: "record", wide: true,
    hint: "اگر هیچ‌کدام را ندارید خالی بگذارید.",
    options: opts(["diabetes", "دیابت"], ["hypertension", "فشار خون"], ["heart", "بیماری قلبی"], ["valve", "دریچه یا ضربان‌ساز مصنوعی"], ["bleeding", "اختلال انعقاد خون"], ["anticoagulant", "داروی ضدانعقاد"], ["hepatitis", "هپاتیت"], ["asthma", "آسم"], ["kidney", "بیماری کلیه"], ["thyroid", "تیروئید"], ["epilepsy", "صرع"], ["osteoporosis", "پوکی استخوان یا بیس‌فسفونات"], ["cancer", "سرطان یا شیمی‌درمانی"], ["immune", "ضعف سیستم ایمنی"]),
  },
  { key: "conditionsNote", label: "توضیح بیماری‌ها", kind: "textarea", section: "patient", group: "سلامت عمومی", store: "record", max: 1000, wide: true },
  { key: "allergies", label: "حساسیت‌ها", kind: "textarea", section: "patient", group: "سلامت عمومی", store: "record", max: 1000, core: true, placeholder: "داروی بی‌حسی، پنی‌سیلین، لاتکس... یا «ندارم»", patientVisible: true },
  { key: "medications", label: "داروهای مصرفی", kind: "textarea", section: "patient", group: "سلامت عمومی", store: "record", max: 1000, core: true, placeholder: "نام داروها یا «ندارم»", patientVisible: true },
  {
    key: "pregnancy", label: "بارداری و شیردهی", kind: "select", section: "patient", group: "سلامت عمومی", store: "record",
    options: opts(["none", "ندارم"], ["pregnant", "باردارم"], ["breastfeeding", "شیر می‌دهم"]),
  },
  {
    key: "smoking", label: "سیگار", kind: "select", section: "patient", group: "سلامت عمومی", store: "record", core: true,
    options: opts(["never", "مصرف نمی‌کنم"], ["former", "ترک کرده‌ام"], ["sometimes", "گاهی"], ["daily", "هر روز"]),
  },
  { key: "patientNotes", label: "چیز دیگری که پزشک باید بداند", kind: "textarea", section: "patient", group: "سلامت عمومی", store: "record", max: 1500, wide: true },

  // ───────── معاینه و درمان
  {
    key: "asaClass", label: "طبقه‌بندی ASA", kind: "select", section: "clinical", group: "معاینه", store: "record",
    options: opts(["I", "ASA I · سالم"], ["II", "ASA II · بیماری سیستمیک خفیف"], ["III", "ASA III · بیماری سیستمیک شدید"], ["IV", "ASA IV · تهدیدکننده زندگی"]),
  },
  { key: "extraoral", label: "معاینه خارج دهانی", kind: "textarea", section: "clinical", group: "معاینه", store: "record", max: 1500 },
  { key: "softTissue", label: "بافت نرم داخل دهان", kind: "textarea", section: "clinical", group: "معاینه", store: "record", max: 1500 },
  {
    key: "periodontal", label: "وضعیت لثه", kind: "select", section: "clinical", group: "معاینه", store: "record",
    options: opts(["healthy", "سالم"], ["gingivitis", "التهاب لثه"], ["mild", "پریودنتیت خفیف"], ["moderate", "پریودنتیت متوسط"], ["severe", "پریودنتیت شدید"]),
  },
  {
    key: "plaque", label: "بهداشت دهان", kind: "select", section: "clinical", group: "معاینه", store: "record",
    options: opts(["good", "خوب"], ["fair", "متوسط"], ["poor", "ضعیف"]),
  },
  {
    key: "cariesRisk", label: "ریسک پوسیدگی", kind: "select", section: "clinical", group: "معاینه", store: "record",
    options: opts(["low", "کم"], ["medium", "متوسط"], ["high", "زیاد"]),
  },
  { key: "occlusion", label: "اکلوژن", kind: "textarea", section: "clinical", group: "معاینه", store: "record", max: 1000 },
  { key: "tmj", label: "مفصل فک (TMJ)", kind: "textarea", section: "clinical", group: "معاینه", store: "record", max: 1000 },
  { key: "diagnosis", label: "تشخیص", kind: "textarea", section: "clinical", group: "تشخیص و طرح", store: "record", max: 2000, wide: true },
  { key: "treatmentPlan", label: "طرح درمان", kind: "textarea", section: "clinical", group: "تشخیص و طرح", store: "record", max: 4000, wide: true, patientVisible: true },
  { key: "alerts", label: "هشدارها", kind: "list", section: "clinical", group: "تشخیص و طرح", store: "record", wide: true, hint: "کلمه یا عبارت کوتاه، مثل «حساس به پنی‌سیلین».", patientVisible: true },
  { key: "clinicalNotes", label: "یادداشت بالینی", kind: "textarea", section: "clinical", group: "تشخیص و طرح", store: "record", max: 4000, wide: true },

  // ───────── امور مطب
  {
    key: "fileStatus", label: "وضعیت پرونده", kind: "select", section: "clinic", group: "پرونده", store: "record", patientVisible: true,
    options: opts(["ACTIVE", "فعال"], ["ARCHIVED", "بایگانی"]),
  },
  { key: "consentSigned", label: "فرم رضایت‌نامه امضا شده است", kind: "toggle", section: "clinic", group: "پرونده", store: "record", patientVisible: true },
  { key: "recallAt", label: "تاریخ پیگیری بعدی", kind: "date", section: "clinic", group: "پرونده", store: "record", patientVisible: true },
  { key: "internalNote", label: "یادداشت داخلی مطب", kind: "textarea", section: "clinic", group: "پرونده", store: "record", max: 2000, wide: true, hint: "بیمار این یادداشت را نمی‌بیند." },
];

const BY_KEY = new Map(RECORD_FIELDS.map((field) => [field.key, field]));

export function fieldByKey(key: string) {
  return BY_KEY.get(key);
}

export function fieldsOf(section: RecordSection) {
  return RECORD_FIELDS.filter((field) => field.section === section);
}

export function groupsOf(section: RecordSection) {
  const groups: { title: string; fields: RecordField[] }[] = [];
  for (const field of fieldsOf(section)) {
    let group = groups.find((item) => item.title === field.group);
    if (!group) groups.push((group = { title: field.group, fields: [] }));
    group.fields.push(field);
  }
  return groups;
}

export type RecordValue = string | string[] | boolean;
export type RecordValues = Record<string, RecordValue>;

export function emptyValue(field: RecordField): RecordValue {
  if (field.kind === "multi" || field.kind === "list") return [];
  if (field.kind === "toggle") return false;
  return "";
}

export function isFilled(value: RecordValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return Boolean(value && value.trim());
}

/** how much of the patient-owned core fields are answered */
export function patientCompletion(values: RecordValues) {
  const core = RECORD_FIELDS.filter((field) => field.section === "patient" && field.core);
  const filled = core.filter((field) => isFilled(values[field.key])).length;
  return { filled, total: core.length, percent: Math.round((filled / core.length) * 100) };
}

// ───────── permissions

const STAFF_ROLES = ["SECRETARY", "DENTIST", "ADMIN"];
const EDITORS: Record<RecordSection, readonly string[]> = {
  patient: STAFF_ROLES,
  clinical: ["DENTIST", "ADMIN"],
  clinic: ["SECRETARY", "ADMIN"],
};

/** `own` means the signed-in user is editing their own file as a patient */
export function canEditSection(roles: readonly string[], section: RecordSection, own = false) {
  if (roles.includes("ADMIN")) return !own || section === "patient";
  if (own) return section === "patient";
  return roles.some((role) => EDITORS[section].includes(role));
}

export function canViewSection(roles: readonly string[], section: RecordSection) {
  if (section === "clinic") return roles.some((role) => ["SECRETARY", "ADMIN"].includes(role));
  return roles.some((role) => STAFF_ROLES.includes(role));
}

export function canSeeLedger(roles: readonly string[]) {
  return roles.some((role) => role === "SECRETARY" || role === "ADMIN");
}

// ───────── validation (built from the same registry)

function fieldSchema(field: RecordField): z.ZodTypeAny {
  const max = field.max ?? 200;
  switch (field.kind) {
    case "text":
      // number-like fields (national id, phones) are stored with Latin digits
      if (field.ltr) return z.string().transform(toLatinDigits).pipe(z.string().trim().max(max, "متن بلندتر از حد مجاز است"));
      return z.string().trim().max(max, "متن بلندتر از حد مجاز است");
    case "textarea":
      return z.string().trim().max(max, "متن بلندتر از حد مجاز است");
    case "select": {
      const values = new Set((field.options ?? []).map((option) => option.value));
      return z.string().refine((value) => value === "" || values.has(value), "گزینه نامعتبر است");
    }
    case "multi": {
      const values = new Set((field.options ?? []).map((option) => option.value));
      return z.array(z.string().refine((value) => values.has(value), "گزینه نامعتبر است")).max(30);
    }
    case "date":
      return z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "تاریخ نامعتبر است");
    case "toggle":
      return z.boolean();
    case "list":
      return z.array(z.string().trim().min(1).max(80)).max(12);
  }
}

const shape: Record<string, z.ZodTypeAny> = {};
for (const field of RECORD_FIELDS) shape[field.key] = fieldSchema(field).optional();

export const recordPatchSchema = z.object(shape).strict();
export type RecordPatch = z.infer<typeof recordPatchSchema>;

export const nationalIdSchema = z.string().transform((value) => toLatinDigits(value).trim()).refine((value) => value === "" || /^\d{10}$/.test(value), "کد ملی باید ۱۰ رقم باشد");

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(3, "نام را کامل بنویسید").max(80),
  phone: phoneSchema,
  password: z.string().min(8, "رمز حداقل ۸ کاراکتر باشد").max(80).optional(),
});

export const ledgerEntrySchema = z.object({
  kind: z.enum(["CHARGE", "PAYMENT"]),
  title: z.string().trim().min(2, "شرح را بنویسید").max(120),
  amount: z.preprocess((value) => (typeof value === "string" ? toLatinDigits(value).replace(/[,٬،\s]/g, "") : value), z.coerce.number()).pipe(z.number().int().min(1, "مبلغ را وارد کنید").max(10_000_000_000)),
});

export function formatToman(value: number) {
  const digits = Math.round(value).toLocaleString("en-US").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit).replace(/,/g, "٬");
  return `${digits} تومان`;
}

export function optionLabel(field: RecordField, value: string) {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}
