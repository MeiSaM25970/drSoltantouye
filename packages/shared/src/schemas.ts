import { z } from "zod";
import { normalizePhone } from "./phone";

export const roleSchema = z.enum(["PATIENT", "SECRETARY", "DENTIST", "ADMIN"]);
export const appointmentStatusSchema = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "ARRIVED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);
export const consultationStatusSchema = z.enum(["OPEN", "ANSWERED", "CLOSED"]);
export const consultationTopicSchema = z.enum(["PAIN", "COSMETIC", "ORTHO", "EMERGENCY", "OTHER"]);
export const toothConditionSchema = z.enum([
  "SOUND",
  "CARIES",
  "FILLED",
  "ROOT_CANAL",
  "CROWN",
  "IMPLANT",
  "MISSING",
  "BRIDGE",
]);

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((value) => /^09\d{9}$/.test(value), "شماره موبایل را با ۰۹ و یازده رقم بنویسید");

export const passwordSchema = z.string().min(8, "رمز حداقل ۸ کاراکتر باشد").max(80);

export const registerSchema = z.object({
  fullName: z.string().trim().min(3, "نام را کامل بنویسید").max(80),
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "رمز را بنویسید"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(3).max(80).optional(),
  password: passwordSchema.optional(),
});

export const clinicSchema = z.object({
  name: z.string().trim().min(2).max(160),
  doctorName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().min(2).max(160),
  heroTitle: z.string().trim().min(2).max(200),
  heroLead: z.string().trim().min(2).max(500),
  about: z.string().trim().min(2).max(2000),
  address: z.string().trim().min(2).max(300),
  phone1: z.string().trim().min(8).max(20),
  phone2: z.string().trim().min(8).max(20),
  instagram: z.string().trim().min(2).max(80),
  hoursNote: z.string().trim().min(2).max(300),
});

export const serviceSchema = z.object({
  title: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(2).max(180),
  description: z.string().trim().min(2).max(2000),
  durationMin: z.coerce.number().int().min(15).max(180),
  published: z.boolean().optional(),
});

export const updateDoctorSchema = z.object({
  specialty: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().min(2).max(2000).optional(),
  published: z.boolean().optional(),
});

export const workingHourSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMin: z.number().int().min(0).max(24 * 60),
  endMin: z.number().int().min(0).max(24 * 60),
});

export const saveHoursSchema = z.object({
  hours: z.array(workingHourSchema).max(20),
});

export const timeBlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر است"),
  startMin: z.number().int().min(0).max(24 * 60),
  endMin: z.number().int().min(0).max(24 * 60),
  reason: z.string().trim().max(160).optional(),
});

export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  serviceId: z.string().min(1),
  start: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
});

export const updateAppointmentSchema = z.object({
  status: appointmentStatusSchema,
});

export const createConsultationSchema = z.object({
  topic: consultationTopicSchema,
  body: z.string().trim().min(5, "شرح را کمی کامل‌تر بنویسید").max(4000),
});

export const consultationMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const updateConsultationSchema = z.object({
  status: consultationStatusSchema,
});

export const toothSchema = z.object({
  fdi: z.number().int().min(11).max(48),
  condition: toothConditionSchema,
  note: z.string().trim().max(300).optional(),
});

export const visitSchema = z.object({
  body: z.string().trim().min(2).max(4000),
  internal: z.boolean().optional(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(3).max(200),
  answer: z.string().trim().min(3).max(1000),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const staffSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  phone: phoneSchema,
  password: passwordSchema,
  roles: z.array(roleSchema).min(1),
  title: z.string().trim().max(80).optional(),
  specialty: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  telegramAllowed: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(3).max(80).optional(),
  password: passwordSchema.optional(),
  roles: z.array(roleSchema).min(1).optional(),
  title: z.string().trim().max(80).optional(),
  specialty: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  telegramAllowed: z.boolean().optional(),
});

export const galleryMetaSchema = z.object({
  caption: z.string().trim().max(2200).optional(),
  instagramUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().optional(),
  published: z.boolean().optional(),
});

export const telegramPrefSchema = z.object({
  appointmentCreated: z.boolean(),
  appointmentCancelled: z.boolean(),
  consultationCreated: z.boolean(),
  consultationMessage: z.boolean(),
});

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const APPOINTMENT_STATUS_LABEL = {
  REQUESTED: "درخواست‌شده",
  CONFIRMED: "تأییدشده",
  ARRIVED: "حاضر در مطب",
  COMPLETED: "انجام‌شده",
  CANCELLED: "لغو شده",
  NO_SHOW: "نیامده",
} as const;

export const CONSULTATION_STATUS_LABEL = {
  OPEN: "باز",
  ANSWERED: "پاسخ‌داده‌شده",
  CLOSED: "بسته",
} as const;

export const TOPIC_LABEL = {
  PAIN: "درد",
  COSMETIC: "زیبایی",
  ORTHO: "ارتودنسی",
  EMERGENCY: "اورژانس",
  OTHER: "سایر",
} as const;

export const TOOTH_LABEL = {
  SOUND: "سالم",
  CARIES: "پوسیدگی",
  FILLED: "پرشده",
  ROOT_CANAL: "عصب‌کشی",
  CROWN: "روکش",
  IMPLANT: "ایمپلنت",
  MISSING: "کشیده‌شده",
  BRIDGE: "بریج",
} as const;

export const ROLE_LABEL = {
  PATIENT: "بیمار",
  SECRETARY: "منشی",
  DENTIST: "پزشک",
  ADMIN: "ادمین",
} as const;

export const WEEKDAY_LABEL = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];

export type Role = z.infer<typeof roleSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type ConsultationTopic = z.infer<typeof consultationTopicSchema>;
export type ToothCondition = z.infer<typeof toothConditionSchema>;
