import { Vazirmatn } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { BrandProvider } from "@/components/brand";
import { ToastProvider } from "@/components/interactive";
import { apiPublic } from "@/lib/public";
import { CLINIC_PLACE } from "@clinic/shared";
import { mediaUrl } from "@/lib/api";
import { SITE_NAME, SITE_URL, OG_IMAGE } from "@/lib/seo";

const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir" });

export const viewport: Viewport = {
  themeColor: "#f6f2ec",
  width: "device-width",
  initialScale: 1,
};

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s · دکتر سلطان‌طویه",
  },
  description: "نوبت و مشاوره مطب دکتر امیر سلطان‌طویه، جراح دندانپزشک، در ساری. بدون پرداخت اینترنتی.",
  applicationName: SITE_NAME,
  authors: [{ name: "دکتر امیر سلطان‌طویه" }],
  keywords: ["دندانپزشکی ساری", "ایمپلنت ساری", "دکتر امیر سلطان‌طویه", "نوبت دندانپزشکی", "امیرمازندرانی"],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    url: SITE_URL,
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  robots: { index: true, follow: true },
  other: {
    "geo.region": "IR-21",
    "geo.placename": CLINIC_PLACE.city,
    "geo.position": `${CLINIC_PLACE.latitude};${CLINIC_PLACE.longitude}`,
    ICBM: `${CLINIC_PLACE.latitude}, ${CLINIC_PLACE.longitude}`,
  },
};

/** The tab icon follows the logo uploaded from the admin panel. */
export async function generateMetadata(): Promise<Metadata> {
  const clinic = await apiPublic<{ logoUrl?: string }>("/clinic");
  const logo = mediaUrl(clinic?.logoUrl);
  return {
    ...baseMetadata,
    icons: logo
      ? { icon: [{ url: logo }], shortcut: [{ url: logo }], apple: [{ url: logo }] }
      : { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const clinic = await apiPublic<{ logoUrl?: string }>("/clinic");
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className={`${vazir.className} antialiased`}>
        <AuthProvider>
          <BrandProvider logoUrl={clinic?.logoUrl ?? ""}>
            <ToastProvider>{children}</ToastProvider>
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
