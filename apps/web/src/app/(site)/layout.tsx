import { ClinicJsonLd } from "@/components/clinic-jsonld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClinicJsonLd />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
