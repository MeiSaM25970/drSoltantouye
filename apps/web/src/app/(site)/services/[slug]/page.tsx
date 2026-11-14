import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLINIC_PLACE, faDigits } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/motion";
import { ButtonLink } from "@/components/ui";
import { serviceImageOf } from "@/lib/photos";
import { apiPublic } from "@/lib/public";
import { breadcrumbs, CLINIC_ID, pageMeta, SITE_URL } from "@/lib/seo";
import { RoleButtonLink } from "@/components/role-link";

export const dynamic = "force-dynamic";

type Service = { slug: string; title: string; summary: string; description: string; durationMin: number; imageUrl?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await apiPublic<Service>(`/services/${slug}`);
  if (!service) return {};
  return pageMeta({ title: service.title, description: service.summary, path: `/services/${slug}` });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [service, others] = await Promise.all([apiPublic<Service>(`/services/${slug}`), apiPublic<Service[]>("/services")]);
  if (!service) notFound();
  const image = serviceImageOf(service);
  const more = (others ?? []).filter((item) => item.slug !== service.slug).slice(0, 3);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <nav className="mb-5 flex items-center gap-2 text-sm text-muted" aria-label="مسیر">
        <Link href="/services" className="link-underline">خدمات</Link>
        <Icon name="chevron" size={14} />
        <span className="text-ink">{service.title}</span>
      </nav>

      <div className="relative overflow-hidden rounded-[2.25rem]">
        <img src={image.src} alt={image.alt || service.title} className="ken h-72 w-full object-cover md:h-[26rem]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-paper md:p-10">
          <p className="rise text-sm text-accent-2">خدمت مطب</p>
          <h1 className="rise mt-2 text-3xl font-bold leading-snug md:text-5xl" style={{ "--d": "100ms" } as React.CSSProperties}>{service.title}</h1>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <Reveal>
          <div className="card p-6 md:p-9">
            <p className="text-lg font-medium leading-9">{service.summary}</p>
            <p className="mt-4 leading-9 text-muted">{service.description}</p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-sm leading-7 text-accent-deep">
              <Icon name="shield" className="mt-0.5 shrink-0" />
              طرح درمان و هزینه بعد از معاینه حضوری مشخص می‌شود. نوبت اینترنتی رایگان است و پرداختی ندارد.
            </div>
          </div>
        </Reveal>

        <Reveal variant="start" delay={100}>
          <aside className="card sticky top-24 p-6">
            <p className="text-sm text-muted">زمان تقریبی نوبت</p>
            <p className="mt-1 flex items-baseline gap-1.5"><span className="text-4xl font-bold text-accent-deep">{faDigits(String(service.durationMin))}</span> دقیقه</p>
            <RoleButtonLink kind="book" href={`/account/appointments/new?service=${service.slug}`} size="lg" icon="calendar" className="mt-5 w-full">نوبت این خدمت</RoleButtonLink>
            <RoleButtonLink kind="consult" variant="ghost" icon="chat" className="mt-2 w-full">اول مشاوره می‌خواهم</RoleButtonLink>
          </aside>
        </Reveal>
      </div>

      {more.length ? (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold">خدمات دیگر</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {more.map((item) => (
              <Link key={item.slug} href={`/services/${item.slug}`} className="card card-hover flex items-center justify-between gap-3 p-5">
                <span><b className="block">{item.title}</b><span className="text-sm text-muted">{faDigits(String(item.durationMin))} دقیقه</span></span>
                <Icon name="arrow" className="text-accent" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.description,
          areaServed: CLINIC_PLACE.city,
          provider: { "@id": CLINIC_ID },
          url: `${SITE_URL}/services/${service.slug}`,
        }}
      />
      <JsonLd data={breadcrumbs([{ name: "خانه", path: "/" }, { name: "خدمات", path: "/services" }, { name: service.title, path: `/services/${service.slug}` }])} />
    </div>
  );
}
