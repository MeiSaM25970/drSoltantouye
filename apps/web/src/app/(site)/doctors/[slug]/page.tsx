import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLINIC_PLACE, faDigits } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/motion";
import { ButtonLink } from "@/components/ui";
import { getSiteContent } from "@/lib/content";
import { siteImage } from "@/lib/photos";
import { apiPublic } from "@/lib/public";
import { breadcrumbs, CLINIC_ID, pageMeta, SITE_URL } from "@/lib/seo";
import { RoleButtonLink } from "@/components/role-link";

export const dynamic = "force-dynamic";

type Doctor = {
  slug: string;
  fullName: string;
  specialty: string;
  bio: string;
  services: { slug: string; title: string; summary: string }[];
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await apiPublic<Doctor>(`/doctors/${slug}`);
  if (!doctor) return {};
  return pageMeta({ title: doctor.fullName, description: doctor.bio.slice(0, 180), path: `/doctors/${slug}` });
}

export default async function DoctorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [doctor, content] = await Promise.all([apiPublic<Doctor>(`/doctors/${slug}`), getSiteContent()]);
  if (!doctor) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="shot relative min-h-80 overflow-hidden rounded-[2.25rem]">
          <img src={siteImage(content["doctor.image"])} alt={doctor.fullName} className="ken absolute inset-0 h-full w-full object-cover object-[50%_24%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        </div>
        <div className="card flex flex-col justify-center p-7 md:p-11">
          <p className="rise text-[13px] font-medium text-accent">{doctor.specialty}</p>
          <h1 className="rise mt-2 text-3xl font-bold md:text-5xl" style={{ "--d": "80ms" } as React.CSSProperties}>{doctor.fullName}</h1>
          <p className="rise mt-5 leading-9 text-muted md:text-lg" style={{ "--d": "160ms" } as React.CSSProperties}>{doctor.bio}</p>
          <p className="rise mt-6 flex items-center gap-2 text-sm" style={{ "--d": "240ms" } as React.CSSProperties}><Icon name="shield" size={18} className="text-accent" />نظام پزشکی {faDigits(CLINIC_PLACE.license)}</p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ "--d": "320ms" } as React.CSSProperties}>
            <RoleButtonLink kind="book" icon="calendar" size="lg">گرفتن نوبت</RoleButtonLink>
            <RoleButtonLink kind="consult" variant="ghost" icon="chat" size="lg">مشاوره</RoleButtonLink>
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-14 text-2xl font-bold">خدمات این پزشک</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {doctor.services.map((service, index) => (
          <Reveal key={service.slug} delay={(index % 3) * 80}>
            <Link href={`/services/${service.slug}`} className="card card-hover group flex h-full items-start gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Icon name="tooth" /></span>
              <span>
                <b className="block">{service.title}</b>
                <span className="mt-1 block text-sm leading-7 text-muted">{service.summary}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Physician",
          name: doctor.fullName,
          medicalSpecialty: doctor.specialty,
          description: doctor.bio,
          image: `${SITE_URL}${siteImage(content["doctor.image"])}`,
          worksFor: { "@id": CLINIC_ID },
          identifier: CLINIC_PLACE.license,
          url: `${SITE_URL}/doctors/${doctor.slug}`,
          address: { "@type": "PostalAddress", addressLocality: CLINIC_PLACE.city, addressRegion: CLINIC_PLACE.region, addressCountry: "IR" },
        }}
      />
      <JsonLd data={breadcrumbs([{ name: "خانه", path: "/" }, { name: "پزشک", path: "/doctors" }, { name: doctor.fullName, path: `/doctors/${doctor.slug}` }])} />
    </div>
  );
}
