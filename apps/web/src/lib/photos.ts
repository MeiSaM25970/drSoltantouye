import { mediaUrl } from "./api";

export const scenes = {
  clinic: { src: "/photos/clinic.jpg", alt: "اتاق درمان روشن با یونیت دندانپزشکی" },
  exam: { src: "/photos/smile.jpg", alt: "معاینه نزدیک دندان" },
  plan: { src: "/photos/detail.jpg", alt: "بررسی تصویر دندان پیش از شروع درمان" },
  room: { src: "/photos/light.jpg", alt: "یونیت درمان کنار پنجره" },
  form: { src: "/photos/chair.jpg", alt: "نمونه شفاف برای اصلاح فرم دندان" },
} as const;

export const serviceImage: Record<string, { src: string; alt: string }> = {
  implant: scenes.plan,
  wisdom: scenes.exam,
  veneer: scenes.form,
  "root-canal": scenes.room,
  cleaning: scenes.clinic,
  crown: scenes.plan,
  whitening: scenes.exam,
};

/** Built-in pictures ship with the web app; uploaded ones are served by the API. */
export function siteImage(src: string) {
  return src.startsWith("/uploads/") ? mediaUrl(src) : src;
}

export function serviceImageOf(service: { slug: string; imageUrl?: string | null }) {
  if (service.imageUrl) return { src: siteImage(service.imageUrl), alt: "" };
  return serviceImage[service.slug] ?? scenes.clinic;
}
