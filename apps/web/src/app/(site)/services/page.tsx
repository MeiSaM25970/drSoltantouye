import Link from "next/link";
import { faDigits } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { Reveal, Spotlight } from "@/components/motion";
import { Badge, PageIntro } from "@/components/ui";
import { serviceImageOf } from "@/lib/photos";
import { apiPublic } from "@/lib/public";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "خدمات",
  description: "ایمپلنت دیجیتال، جراحی دندان عقل، لمینت، عصب‌کشی، جرم‌گیری، روکش و بلیچینگ در مطب دکتر امیر سلطان‌طویه، ساری.",
  path: "/services",
});

type Service = { slug: string; title: string; summary: string; durationMin: number; imageUrl?: string };

export default async function ServicesPage() {
  const services = (await apiPublic<Service[]>("/services")) ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <PageIntro eyebrow="خدمات" title="درمان‌هایی که در مطب انجام می‌شود" text="مدت هر نوبت تقریبی است و طرح درمان بعد از معاینه حضوری مشخص می‌شود." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const image = serviceImageOf(service);
          return (
            <Reveal key={service.slug} delay={(index % 3) * 90}>
              <Spotlight href={`/services/${service.slug}`} className="card card-hover group flex h-full flex-col overflow-hidden">
                <span className="shot relative block h-48">
                  <img src={image.src} alt={image.alt || service.title} loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute start-3 top-3"><Badge tone="neutral"><Icon name="clock" size={12} />حدود {faDigits(String(service.durationMin))} دقیقه</Badge></span>
                </span>
                <span className="relative z-10 flex flex-1 flex-col p-6">
                  <h2 className="text-xl font-semibold">{service.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted">{service.summary}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-accent-deep transition-all group-hover:gap-3">مشاهده <Icon name="arrow" size={16} /></span>
                </span>
              </Spotlight>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
