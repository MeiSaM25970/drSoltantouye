import type { MetadataRoute } from "next";
import { apiPublic } from "@/lib/public";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, doctors] = await Promise.all([
    apiPublic<{ slug: string }[]>("/services"),
    apiPublic<{ slug: string }[]>("/doctors"),
  ]);
  const now = new Date();
  const paths = [
    "/",
    "/services",
    "/doctors",
    "/posts",
    ...(services ?? []).map((service) => `/services/${service.slug}`),
    ...(doctors ?? []).map((doctor) => `/doctors/${doctor.slug}`),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
