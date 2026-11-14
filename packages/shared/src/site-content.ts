/**
 * Every editable text and picture on the landing page.
 * The registry drives the admin screen, API validation and the defaults the site falls back to.
 */
/** Portrait of Dr. Soltantouye shipped with the web app (apps/web/public/photos). */
/** Hero picture of the landing page (apps/web/public/photos). */
export const HERO_PHOTO = "/photos/hiro.webp";
export const DOCTOR_PHOTO = "/photos/dr-amir-soltantouye.webp";

export type ContentKind = "text" | "textarea" | "image";

export type ContentField = {
  key: string;
  group: ContentGroupId;
  kind: ContentKind;
  label: string;
  default: string;
  hint?: string;
};

export type ContentGroupId = "hero" | "stories" | "services" | "doctor" | "steps" | "gallery" | "location" | "faq";

export const CONTENT_GROUPS: { id: ContentGroupId; label: string; hint: string }[] = [
  { id: "hero", label: "بالای صفحه", hint: "عکس بزرگ بالای صفحه اول و دو کارت شناور روی آن." },
  { id: "stories", label: "سه تصویر زیر آن", hint: "سه کارت تصویری زیر بالای صفحه." },
  { id: "services", label: "بخش خدمات", hint: "عنوان بخش. عکس هر خدمت از صفحه خدمات عوض می‌شود." },
  { id: "doctor", label: "بخش پزشک", hint: "عکس و برچسب‌های کنار معرفی پزشک." },
  { id: "steps", label: "مراحل نوبت", hint: "بخش تیره با سه قدم." },
  { id: "gallery", label: "پست‌ها", hint: "عنوان بخش پست‌ها. خود پست‌ها از صفحه گالری مدیریت می‌شود." },
  { id: "location", label: "مطب و نقشه", hint: "عنوان کارت آدرس. آدرس و تلفن در تنظیمات صفحه اول است." },
  { id: "faq", label: "پرسش‌ها", hint: "عنوان بخش. خود پرسش‌ها در تنظیمات صفحه اول است." },
];

const image = (key: string, group: ContentGroupId, label: string, fallback: string, hint?: string): ContentField => ({ key, group, kind: "image", label, default: fallback, hint });
const text = (key: string, group: ContentGroupId, label: string, fallback: string, kind: ContentKind = "text"): ContentField => ({ key, group, kind, label, default: fallback });

export const CONTENT_FIELDS: ContentField[] = [
  image("hero.image", "hero", "عکس اصلی", HERO_PHOTO, "عکس عمودی، حدود ۴ به ۵"),
  text("hero.badge", "hero", "برچسب بالای تیتر", "نوبت بدون پرداخت اینترنتی"),
  text("hero.card1Title", "hero", "کارت اول، عنوان", "ایمپلنت دیجیتال"),
  text("hero.card1Text", "hero", "کارت اول، توضیح", "طرح درمان با تصویر"),
  text("hero.card2Title", "hero", "کارت دوم، عنوان", "بدون پرداخت آنلاین"),
  text("hero.card2Text", "hero", "کارت دوم، توضیح", "تأیید توسط مطب"),

  image("stories.1.image", "stories", "کارت اول، عکس", "/photos/clinic.jpg"),
  text("stories.1.kicker", "stories", "کارت اول، برچسب", "اتاق درمان"),
  text("stories.1.title", "stories", "کارت اول، عنوان", "نور، سکوت و یک ساعت مشخص"),
  image("stories.2.image", "stories", "کارت دوم، عکس", "/photos/detail.jpg"),
  text("stories.2.kicker", "stories", "کارت دوم، برچسب", "قبل از شروع"),
  text("stories.2.title", "stories", "کارت دوم، عنوان", "تصویر را با هم می‌بینیم"),
  image("stories.3.image", "stories", "کارت سوم، عکس", "/photos/smile.jpg"),
  text("stories.3.kicker", "stories", "کارت سوم، برچسب", "دقت"),
  text("stories.3.title", "stories", "کارت سوم، عنوان", "جزئیات، نه حدس"),

  text("services.kicker", "services", "برچسب بخش", "درمان‌ها"),
  text("services.title", "services", "عنوان بخش", "خدمات مطب"),

  image("doctor.image", "doctor", "عکس پزشک", DOCTOR_PHOTO, "عکس عمودی. روی صفحه پزشک‌ها و صفحه خود پزشک هم دیده می‌شود"),
  text("doctor.kicker", "doctor", "برچسب بخش", "پزشک مطب"),
  text("doctor.stat1Label", "doctor", "عدد اول، شرح", "خدمت تخصصی"),
  text("doctor.stat2Label", "doctor", "عدد دوم، شرح", "تومان پرداخت اینترنتی"),

  text("steps.title", "steps", "عنوان بخش", "نوبت، بدون پرداخت"),
  text("steps.lead", "steps", "زیرعنوان", "سه قدم ساده تا وقت معاینه."),
  text("steps.1.title", "steps", "قدم اول، عنوان", "ساعت را انتخاب می‌کنید"),
  text("steps.1.text", "steps", "قدم اول، توضیح", "خدمت و وقت خالی روی تقویم مطب دیده می‌شود.", "textarea"),
  text("steps.2.title", "steps", "قدم دوم، عنوان", "درخواست ثبت می‌شود"),
  text("steps.2.text", "steps", "قدم دوم، توضیح", "پولی جابه‌جا نمی‌شود. وضعیت روی «درخواست‌شده» می‌ماند.", "textarea"),
  text("steps.3.title", "steps", "قدم سوم، عنوان", "مطب تأیید می‌کند"),
  text("steps.3.text", "steps", "قدم سوم، توضیح", "منشی یا پزشک نوبت را قطعی، جابه‌جا یا لغو می‌کند.", "textarea"),

  text("gallery.kicker", "gallery", "برچسب بخش", "از مطب"),
  text("gallery.title", "gallery", "عنوان بخش", "پست‌های مطب"),

  text("location.kicker", "location", "برچسب کارت", "مطب"),
  text("location.title", "location", "عنوان کارت", "ساری، امیرمازندرانی"),

  text("faq.kicker", "faq", "برچسب بخش", "پاسخ سؤال‌های رایج"),
  text("faq.title", "faq", "عنوان بخش", "پرسش‌ها"),
];

export const CONTENT_BY_KEY: Record<string, ContentField> = Object.fromEntries(CONTENT_FIELDS.map((field) => [field.key, field]));

export type SiteContent = Record<string, string>;

/** Overrides saved by the admin laid over the built-in defaults. Empty values fall back. */
export function resolveContent(overrides?: unknown): SiteContent {
  const result: SiteContent = Object.fromEntries(CONTENT_FIELDS.map((field) => [field.key, field.default]));
  if (overrides && typeof overrides === "object") {
    for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
      if (key in CONTENT_BY_KEY && typeof value === "string" && value.trim()) result[key] = value;
    }
  }
  return result;
}

/** Uploaded pictures live on the API; the built-in ones ship with the web app. */
export function isUploadedPath(url: string) {
  return url.startsWith("/uploads/");
}
