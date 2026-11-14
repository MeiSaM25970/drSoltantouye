import Link from "next/link";
import { CLINIC_PLACE, CLINIC_SEED, faDigits, formatPhone } from "@clinic/shared";
import { apiPublic } from "@/lib/public";
import { Brand } from "./brand";
import { Icon } from "./icons";
import { Reveal } from "./motion";
import { ButtonLink } from "./ui";
import { RoleButtonLink } from "@/components/role-link";

type Clinic = typeof CLINIC_SEED;

export async function SiteFooter() {
  const clinic = (await apiPublic<Clinic>("/clinic")) ?? CLINIC_SEED;
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-paper">
      <div className="mesh-dark grain absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 md:px-6">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 backdrop-blur md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="text-2xl font-semibold leading-snug md:text-3xl">وقت معاینه را همین حالا بگیرید.</h2>
              <p className="mt-2 text-paper/65">پرداخت اینترنتی لازم نیست. مطب وقت شما را تأیید می‌کند.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <RoleButtonLink kind="book" variant="accent" size="lg" icon="calendar">گرفتن نوبت</RoleButtonLink>
              <RoleButtonLink kind="consult" variant="outline" size="lg" icon="chat">مشاوره</RoleButtonLink>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Brand tone="light" />
            <p className="mt-4 max-w-xs text-sm leading-7 text-paper/60">{clinic.tagline}. نظام پزشکی {faDigits(CLINIC_PLACE.license)}.</p>
            <a href={`https://instagram.com/${clinic.instagram}`} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-paper/85 transition hover:bg-white/10">
              <Icon name="instagram" size={16} />
              <span dir="ltr">@{clinic.instagram}</span>
            </a>
          </div>
          <div className="text-sm leading-8">
            <p className="mb-2 text-xs uppercase tracking-wide text-paper/45">صفحه‌ها</p>
            {[
              ["/services", "خدمات"],
              ["/doctors", "پزشک"],
              ["/posts", "پست‌ها"],
              ["/login", "ورود بیماران"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="link-underline block w-fit text-paper/80 hover:text-paper">{label}</Link>
            ))}
          </div>
          <div className="space-y-3 text-sm leading-7 text-paper/75">
            <p className="text-xs uppercase tracking-wide text-paper/45">مطب</p>
            <p className="flex gap-2"><Icon name="pin" size={18} className="mt-1 shrink-0 text-accent-2" />{clinic.address}</p>
            <p className="flex gap-2"><Icon name="clock" size={18} className="mt-1 shrink-0 text-accent-2" />{clinic.hoursNote}</p>
            <div className="flex flex-col gap-1 pt-1">
              <a href={`tel:+98${clinic.phone1.slice(1)}`} className="flex items-center gap-2 text-paper"><Icon name="phone" size={16} className="text-accent-2" />{formatPhone(clinic.phone1)}</a>
              <a href={`tel:+98${clinic.phone2.slice(1)}`} className="flex items-center gap-2 text-paper"><Icon name="phone" size={16} className="text-accent-2" />{formatPhone(clinic.phone2)}</a>
            </div>
          </div>
        </div>

        <p className="mt-12 border-t border-white/10 pt-6 text-xs text-paper/40">
          مشاوره آنلاین جای معاینه حضوری را نمی‌گیرد. تشخیص و طرح درمان بعد از ویزیت در مطب انجام می‌شود.
        </p>
      </div>
    </footer>
  );
}
