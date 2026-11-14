import Link from "next/link";
import { CLINIC_PLACE, CLINIC_SEED, faDigits, formatPhone, resolveContent } from "@clinic/shared";
import { JsonLd } from "@/components/json-ld";
import { Icon } from "@/components/icons";
import { Accordion } from "@/components/interactive";
import { CountUp, Parallax, Reveal, ScrollProgress, Spotlight } from "@/components/motion";
import { ButtonLink } from "@/components/ui";
import { mediaUrl } from "@/lib/api";
import { scenes, serviceImageOf, siteImage } from "@/lib/photos";
import { apiPublic } from "@/lib/public";
import { pageMeta, SITE_URL } from "@/lib/seo";
import { RoleButtonLink } from "@/components/role-link";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  description: "نوبت و مشاوره مطب دکتر امیر سلطان‌طویه، جراح دندانپزشک و ایمپلنت، در ساری. نظام پزشکی ۱۹۰۶۹۰. بدون پرداخت اینترنتی.",
  path: "/",
});

type Clinic = typeof CLINIC_SEED & { content?: Record<string, string> };
type Service = { slug: string; title: string; summary: string; imageUrl?: string };
type Doctor = { slug: string; fullName: string; specialty: string; bio: string };
type GalleryItem = { id: string; kind: "IMAGE" | "VIDEO"; url: string; caption: string };
type Faq = { id: string; question: string; answer: string };

const stepIcons = ["calendar", "send", "shield"] as const;

export default async function HomePage() {
  const [clinicData, services, doctors, gallery, faqs] = await Promise.all([
    apiPublic<Clinic>("/clinic"),
    apiPublic<Service[]>("/services"),
    apiPublic<Doctor[]>("/doctors"),
    apiPublic<GalleryItem[]>("/gallery"),
    apiPublic<Faq[]>("/faqs"),
  ]);
  const clinic = clinicData ?? CLINIC_SEED;
  const doctor = doctors?.[0];
  const serviceList = services ?? [];
  const words = clinic.heroTitle.split(" ");
  const c = resolveContent(clinicData?.content);
  const stories = [1, 2, 3].map((n) => ({ src: siteImage(c[`stories.${n}.image`]), alt: c[`stories.${n}.title`], kicker: c[`stories.${n}.kicker`], title: c[`stories.${n}.title`] }));
  const steps = [1, 2, 3].map((n, index) => ({ icon: stepIcons[index], title: c[`steps.${n}.title`], text: c[`steps.${n}.text`] }));

  return (
    <div className="overflow-x-clip">
      <ScrollProgress />

      {/* ───────── hero ───────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 md:px-6 md:pb-16 md:pt-8">
        <div className="orb-a pointer-events-none absolute -top-10 end-0 h-72 w-72 rounded-full bg-accent-2/30 blur-3xl" />
        <div className="orb-b pointer-events-none absolute start-0 top-1/2 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-[13px] text-ink-2 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
              </span>
              {c["hero.badge"]}
            </p>

            <h1 className="mt-6 text-[2.35rem] font-bold leading-[1.35] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              {words.map((word, index) => (
                <span key={`${word}-${index}`} className="rise inline-block ps-[0.28em]" style={{ "--d": `${120 + index * 90}ms` } as React.CSSProperties}>
                  {index === words.length - 1 ? <span className="bg-gradient-to-l from-accent to-accent-deep bg-clip-text text-transparent">{word}</span> : word}
                </span>
              ))}
            </h1>

            <p className="rise mt-6 max-w-lg text-base leading-9 text-muted md:text-lg" style={{ "--d": "700ms" } as React.CSSProperties}>{clinic.heroLead}</p>

            <div className="rise mt-8 flex flex-wrap gap-3" style={{ "--d": "850ms" } as React.CSSProperties}>
              <RoleButtonLink kind="book" size="lg" variant="primary" icon="calendar">گرفتن نوبت</RoleButtonLink>
              <RoleButtonLink kind="consult" size="lg" variant="ghost" icon="chat">مشاوره آنلاین</RoleButtonLink>
            </div>

            <dl className="rise mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6" style={{ "--d": "1000ms" } as React.CSSProperties}>
              <div>
                <dt className="text-xs text-muted">نظام پزشکی</dt>
                <dd className="mt-1 font-semibold">{faDigits(CLINIC_PLACE.license)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">شهر</dt>
                <dd className="mt-1 font-semibold">{CLINIC_PLACE.city}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">تماس</dt>
                <dd className="mt-1 text-sm font-semibold"><a href={`tel:+98${clinic.phone1.slice(1)}`}>{formatPhone(clinic.phone1)}</a></dd>
              </div>
            </dl>
          </div>

          <div className="fade relative" style={{ "--d": "250ms" } as React.CSSProperties}>
            <div className="relative aspect-[4/4.6] overflow-hidden rounded-[2.5rem] bg-sunk shadow-lift sm:aspect-[4/4] lg:aspect-[4/5]">
              <Parallax speed={0.06} className="absolute inset-0">
                <img src={siteImage(c["hero.image"])} alt={clinic.tagline} className="ken h-full w-full object-cover object-[50%_30%]" fetchPriority="high" />
              </Parallax>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
              <p className="absolute inset-x-6 bottom-6 text-lg font-medium leading-8 text-white">{clinic.tagline}</p>
            </div>

            <div className="bob glass absolute -start-3 top-8 flex items-center gap-3 rounded-2xl border border-white/60 p-3 pe-5 shadow-lift sm:-start-8">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white"><Icon name="tooth" /></span>
              <span className="text-sm leading-6"><b className="block">{c["hero.card1Title"]}</b><span className="text-muted">{c["hero.card1Text"]}</span></span>
            </div>
            <div className="bob glass absolute -end-2 bottom-24 flex items-center gap-3 rounded-2xl border border-white/60 p-3 pe-5 shadow-lift [animation-delay:-3s] sm:-end-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-paper"><Icon name="shield" /></span>
              <span className="text-sm leading-6"><b className="block">{c["hero.card2Title"]}</b><span className="text-muted">{c["hero.card2Text"]}</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── marquee ───────── */}
      {serviceList.length ? (
        <div className="marquee relative border-y border-line bg-surface/60 py-5" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {[...serviceList, ...serviceList].map((service, index) => (
                  <span key={`${copy}-${index}`} className="flex items-center gap-8 ps-8 text-xl font-semibold text-ink/70">
                    {service.title}
                    <Icon name="sparkle" size={18} className="text-accent" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ───────── stories ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid gap-4 md:grid-cols-3">
          {stories.map((story, index) => (
            <Reveal key={story.title + index} delay={index * 120} className={index === 1 ? "md:translate-y-10" : ""}>
              <article className="shot group relative min-h-80 overflow-hidden rounded-[2rem] md:min-h-[26rem]">
                <img src={story.src} alt={story.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
                  <p className="text-xs text-accent-2">{story.kicker}</p>
                  <h2 className="mt-1.5 text-xl font-semibold leading-8">{story.title}</h2>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── services ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-accent"><span className="h-px w-6 bg-accent" />{c["services.kicker"]}</p>
              <h2 className="text-3xl font-bold md:text-4xl">{c["services.title"]}</h2>
            </div>
            <Link href="/services" className="link-underline inline-flex items-center gap-1.5 text-sm font-medium">همه خدمات <Icon name="arrow" size={16} /></Link>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceList.map((service, index) => {
            const image = serviceImageOf(service);
            const big = index === 0;
            return (
              <Reveal key={service.slug} delay={(index % 3) * 100} className={big ? "lg:col-span-2" : ""}>
                <Spotlight href={`/services/${service.slug}`} className={`card card-hover group flex h-full overflow-hidden ${big ? "flex-col sm:flex-row" : "flex-col"}`}>
                  <span className={`shot relative block shrink-0 ${big ? "h-56 sm:h-auto sm:w-1/2" : "h-44"}`}>
                    <img src={image.src} alt={image.alt || service.title} loading="lazy" className="h-full w-full object-cover" />
                  </span>
                  <span className="relative z-10 flex flex-1 flex-col p-6">
                    <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon name="tooth" size={20} /></span>
                    <span className="block text-lg font-semibold">{service.title}</span>
                    <span className="mt-2 block text-sm leading-7 text-muted">{service.summary}</span>
                    <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-accent-deep transition-all group-hover:gap-3">
                      جزئیات و نوبت <Icon name="arrow" size={16} />
                    </span>
                  </span>
                </Spotlight>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────── doctor ───────── */}
      {doctor ? (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="grid items-stretch gap-5 md:grid-cols-[0.9fr_1.1fr]">
            <Reveal variant="end">
              <div className="shot relative h-full min-h-96 overflow-hidden rounded-[2.25rem]">
                <img src={siteImage(c["doctor.image"])} alt={doctor.fullName} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[50%_24%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                <div className="glass absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl p-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-paper"><Icon name="stethoscope" /></span>
                  <span className="text-sm leading-6"><b className="block">نظام پزشکی {faDigits(CLINIC_PLACE.license)}</b><span className="text-muted">{doctor.specialty}</span></span>
                </div>
              </div>
            </Reveal>
            <Reveal variant="start" delay={120}>
              <div className="card flex h-full flex-col justify-center p-7 md:p-12">
                <p className="text-[13px] font-medium text-accent">{c["doctor.kicker"]}</p>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">{doctor.fullName}</h2>
                <p className="mt-5 text-base leading-9 text-muted md:text-lg">{doctor.bio}</p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-paper p-4">
                    <p className="text-3xl font-bold text-accent-deep"><CountUp value={serviceList.length} /></p>
                    <p className="mt-1 text-sm text-muted">{c["doctor.stat1Label"]}</p>
                  </div>
                  <div className="rounded-2xl bg-paper p-4">
                    <p className="text-3xl font-bold text-accent-deep">{faDigits("0")}</p>
                    <p className="mt-1 text-sm text-muted">{c["doctor.stat2Label"]}</p>
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <RoleButtonLink kind="book" icon="calendar">نوبت معاینه</RoleButtonLink>
                  <ButtonLink href={`/doctors/${doctor.slug}`} variant="ghost">صفحه پزشک</ButtonLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ───────── steps ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Reveal variant="scale">
          <div className="mesh-dark grain relative overflow-hidden rounded-[2.5rem] px-6 py-12 text-paper md:px-14 md:py-16">
            <h2 className="relative text-3xl font-bold md:text-4xl">{c["steps.title"]}</h2>
            <p className="relative mt-3 max-w-md text-paper/65">{c["steps.lead"]}</p>
            <div className="relative mt-12 grid gap-8 md:grid-cols-3">
              <div className="absolute inset-x-12 top-6 hidden h-px bg-gradient-to-l from-transparent via-white/25 to-transparent md:block" />
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 150}>
                  <article className="relative">
                    <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white shadow-glow"><Icon name={step.icon} /></span>
                    <p className="mt-5 text-xs text-accent-2">قدم {faDigits(String(index + 1))}</p>
                    <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 leading-8 text-paper/65">{step.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
            <div className="relative mt-12">
              <RoleButtonLink kind="book" variant="accent" size="lg" icon="calendar">شروع کنید</RoleButtonLink>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────── gallery ───────── */}
      {gallery?.length ? (
        <section className="py-16 md:py-24">
          <div className="mx-auto mb-8 flex max-w-6xl items-end justify-between gap-4 px-4 md:px-6">
            <Reveal>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-accent"><span className="h-px w-6 bg-accent" />{c["gallery.kicker"]}</p>
              <h2 className="text-3xl font-bold md:text-4xl">{c["gallery.title"]}</h2>
            </Reveal>
            <Link href="/posts" className="link-underline inline-flex items-center gap-1.5 text-sm font-medium">همه پست‌ها <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="scrollbar-none flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
            {gallery.map((item) => (
              <article key={item.id} className="card card-hover w-64 shrink-0 snap-start overflow-hidden sm:w-72">
                {item.kind === "VIDEO" ? (
                  <video src={mediaUrl(item.url)} controls playsInline preload="metadata" className="aspect-[4/5] w-full bg-ink object-cover" />
                ) : (
                  <div className="shot"><img src={mediaUrl(item.url)} alt={item.caption || "پست مطب"} loading="lazy" className="aspect-[4/5] w-full object-cover" /></div>
                )}
                {item.caption ? <p className="line-clamp-3 p-4 text-sm leading-7 text-muted">{item.caption}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ───────── location ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
          <Reveal variant="end">
            <div className="card flex h-full flex-col justify-between p-7 md:p-9">
              <div>
                <p className="text-[13px] font-medium text-accent">{c["location.kicker"]}</p>
                <h2 className="mt-2 text-3xl font-bold">{c["location.title"]}</h2>
                <p className="mt-5 flex gap-3 leading-8"><Icon name="pin" className="mt-1.5 shrink-0 text-accent" />{clinic.address}</p>
                <p className="mt-3 flex gap-3 text-sm leading-7 text-muted"><Icon name="clock" className="mt-1 shrink-0 text-accent" />{clinic.hoursNote}</p>
              </div>
              <div className="mt-7 grid gap-2">
                <a href={`tel:+98${clinic.phone1.slice(1)}`} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 transition hover:bg-sunk">
                  <span className="flex items-center gap-2 text-sm text-muted"><Icon name="phone" size={16} />تلفن مطب</span>
                  <b>{formatPhone(clinic.phone1)}</b>
                </a>
                <a href={`tel:+98${clinic.phone2.slice(1)}`} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 transition hover:bg-sunk">
                  <span className="flex items-center gap-2 text-sm text-muted"><Icon name="phone" size={16} />موبایل</span>
                  <b>{formatPhone(clinic.phone2)}</b>
                </a>
                <ButtonLink href={`https://www.openstreetmap.org/?mlat=${CLINIC_PLACE.latitude}&mlon=${CLINIC_PLACE.longitude}#map=17/${CLINIC_PLACE.latitude}/${CLINIC_PLACE.longitude}`} variant="primary" icon="pin" className="mt-2">مسیریابی روی نقشه</ButtonLink>
              </div>
            </div>
          </Reveal>
          <Reveal variant="start" delay={120}>
            <iframe
              title="نقشه مطب دکتر امیر سلطان‌طویه در خیابان امیرمازندرانی ساری"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=53.055%2C36.568%2C53.065%2C36.575&layer=mapnik&marker=${CLINIC_PLACE.latitude}%2C${CLINIC_PLACE.longitude}`}
              className="h-80 w-full rounded-[2rem] border border-line shadow-soft md:h-full md:min-h-96"
              loading="lazy"
            />
          </Reveal>
        </div>
      </section>

      {/* ───────── faq ───────── */}
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <div className="mb-8 text-center">
            <p className="mb-2 text-[13px] font-medium text-accent">{c["faq.kicker"]}</p>
            <h2 className="text-3xl font-bold md:text-4xl">{c["faq.title"]}</h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <Accordion items={(faqs ?? []).map((faq) => ({ id: faq.id, title: faq.question, body: faq.answer }))} />
        </Reveal>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: (faqs ?? []).map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
            url: SITE_URL,
          }}
        />
      </section>
    </div>
  );
}
