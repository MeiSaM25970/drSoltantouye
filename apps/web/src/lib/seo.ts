import type { Metadata } from "next";

export const SITE_URL = (process.env.SITE_URL ?? "https://drsoltantouye.ir").replace(/\/$/, "");
export const SITE_NAME = "مرکز ایمپلنت دیجیتال دکتر امیر سلطان‌طویه";

/** Share-card picture (landscape, shipped with the web app). */
export const OG_IMAGE = { url: "/photos/clinic.jpg", width: 1800, height: 1203, alt: "اتاق درمان مرکز ایمپلنت دیجیتال دکتر سلطان‌طویه" };

export function pageMeta(input: { title?: string; description: string; path: string }): Metadata {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  return {
    ...(input.title ? { title: input.title } : {}),
    description: input.description,
    alternates: { canonical: path },
    openGraph: {
      title: input.title ?? SITE_NAME,
      description: input.description,
      url: path,
      locale: "fa_IR",
      type: "website",
      siteName: SITE_NAME,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      images: [OG_IMAGE.url],
      title: input.title ?? SITE_NAME,
      description: input.description,
    },
  };
}

export const CLINIC_ID = `${SITE_URL}/#clinic`;

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export const privateRobots: Metadata = {
  robots: { index: false, follow: false },
};
