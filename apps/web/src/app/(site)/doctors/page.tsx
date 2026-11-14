import Link from "next/link";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { PageIntro } from "@/components/ui";
import { getSiteContent } from "@/lib/content";
import { siteImage } from "@/lib/photos";
import { apiPublic } from "@/lib/public";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "پزشک",
  description: "دکتر امیر سلطان‌طویه، جراح دندانپزشک و ایمپلنت، در مرکز ایمپلنت دیجیتال ساری ویزیت می‌کند.",
  path: "/doctors",
});

type Doctor = { slug: string; fullName: string; specialty: string; bio: string };

export default async function DoctorsPage() {
  const [doctorsData, content] = await Promise.all([apiPublic<Doctor[]>("/doctors"), getSiteContent()]);
  const doctors = doctorsData ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <PageIntro eyebrow="پزشک" title="چه کسی ویزیت می‌کند" text="پزشکان فعال مطب و تخصص هر کدام." />
      <div className="grid gap-5">
        {doctors.map((doctor, index) => (
          <Reveal key={doctor.slug} delay={index * 100}>
            <Link href={`/doctors/${doctor.slug}`} className="card card-hover group grid overflow-hidden md:grid-cols-[18rem_1fr]">
              <span className="shot block h-56 md:h-full"><img src={siteImage(content["doctor.image"])} alt={doctor.fullName} loading="lazy" className="h-full w-full object-cover object-[50%_24%]" /></span>
              <span className="flex flex-col p-7 md:p-10">
                <h2 className="text-2xl font-bold">{doctor.fullName}</h2>
                <p className="mt-1 font-medium text-accent">{doctor.specialty}</p>
                <p className="mt-4 leading-9 text-muted">{doctor.bio}</p>
                <span className="mt-auto inline-flex self-start items-center gap-2 pt-6 text-sm font-medium text-accent-deep transition-all group-hover:gap-3">صفحه پزشک <Icon name="arrow" size={16} /></span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
