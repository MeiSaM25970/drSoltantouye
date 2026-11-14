import { resolveContent, type SiteContent } from "@clinic/shared";
import { apiPublic } from "./public";

/** Landing-page texts and pictures with the admin's overrides applied. */
export async function getSiteContent(): Promise<SiteContent> {
  const clinic = await apiPublic<{ content?: unknown }>("/clinic");
  return resolveContent(clinic?.content);
}
