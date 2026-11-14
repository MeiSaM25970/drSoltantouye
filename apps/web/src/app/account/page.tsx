"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APPOINTMENT_STATUS_LABEL, CONSULTATION_STATUS_LABEL, TOPIC_LABEL, faDigits, patientCompletion, type AppointmentStatus, type ConsultationTopic } from "@clinic/shared";
import { useAuth } from "@/components/auth-provider";
import { Icon, type IconName } from "@/components/icons";
import { Ring } from "@/components/interactive";
import { Reveal } from "@/components/motion";
import { Badge, ButtonLink, Card, Skeleton, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { dayBlock, formatClock, relativeDay, tehranHour } from "@/lib/jalali";
import type { RecordDetail } from "@/lib/record-types";

type Appointment = { id: string; startsAt: string; status: AppointmentStatus; service: { title: string }; doctor: { user: { fullName: string } } };
type Consult = { id: string; topic: ConsultationTopic; status: keyof typeof CONSULTATION_STATUS_LABEL; messages: { body: string }[] };

function greeting() {
  const hour = tehranHour();
  if (hour < 5) return "شب بخیر";
  if (hour < 12) return "صبح بخیر";
  if (hour < 17) return "ظهر بخیر";
  if (hour < 20) return "عصر بخیر";
  return "شب بخیر";
}

const quick: { href: string; title: string; text: string; icon: IconName }[] = [
  { href: "/account/appointments/new", title: "نوبت تازه", text: "خدمت و ساعت خالی را انتخاب کنید", icon: "calendar" },
  { href: "/account/consultations/new", title: "سؤال از مطب", text: "برای درد یا درمان قبلی بنویسید", icon: "chat" },
  { href: "/account/record", title: "پرونده من", text: "سلامت عمومی و سابقه دندانی", icon: "file" },
];

export default function AccountHome() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [consults, setConsults] = useState<Consult[] | null>(null);
  const [record, setRecord] = useState<RecordDetail | null>(null);

  useEffect(() => {
    void api<Appointment[]>("/appointments?scope=mine").then(setAppointments).catch(() => setAppointments([]));
    void api<Consult[]>("/consultations").then(setConsults).catch(() => setConsults([]));
    void api<RecordDetail>("/patients/me").then(setRecord).catch(() => undefined);
  }, []);

  const now = Date.now();
  const next = appointments
    ?.filter((item) => item.status !== "CANCELLED" && item.status !== "NO_SHOW" && item.status !== "COMPLETED" && new Date(item.startsAt).getTime() >= now - 3_600_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const completion = record?.record ? patientCompletion(record.record.values) : null;
  const firstName = user?.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="rise text-sm text-muted">{greeting()}</p>
        <h1 className="rise mt-1 text-3xl font-bold md:text-4xl" style={{ "--d": "60ms" } as React.CSSProperties}>{firstName} عزیز، خوش آمدید</h1>
      </header>

      {/* next appointment */}
      <Reveal>
        <section className="mesh-dark grain relative overflow-hidden rounded-[2rem] p-6 text-paper md:p-9">
          {appointments === null ? (
            <Skeleton className="h-28 !bg-white/10" />
          ) : next ? (
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="grid min-w-20 place-items-center rounded-3xl bg-white/10 px-4 py-3 text-center backdrop-blur">
                  <span className="text-xs text-paper/70">{dayBlock(next.startsAt).month}</span>
                  <span className="text-4xl font-bold leading-tight">{dayBlock(next.startsAt).day}</span>
                  <span className="text-xs text-accent-2">{relativeDay(next.startsAt) ?? dayBlock(next.startsAt).weekday}</span>
                </div>
                <div>
                  <p className="text-sm text-paper/60">نوبت بعدی شما</p>
                  <h2 className="mt-1 text-2xl font-semibold">{next.service.title}</h2>
                  <p className="mt-1 text-sm text-paper/70">{next.doctor.user.fullName} · ساعت {formatClock(next.startsAt)}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <StatusPill value={next.status} label={APPOINTMENT_STATUS_LABEL[next.status]} />
                <ButtonLink href="/account/appointments" variant="light" size="sm">مدیریت نوبت‌ها</ButtonLink>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <h2 className="text-2xl font-semibold">هنوز نوبت فعالی ندارید</h2>
                <p className="mt-1.5 text-paper/65">چند کلیک تا وقت معاینه. پرداخت اینترنتی لازم نیست.</p>
              </div>
              <ButtonLink href="/account/appointments/new" variant="accent" size="lg" icon="calendar">گرفتن نوبت</ButtonLink>
            </div>
          )}
        </section>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {quick.map((item, index) => (
            <Reveal key={item.href} delay={index * 80}>
              <Link href={item.href} className="card card-hover group flex items-center gap-4 p-5 sm:h-full sm:flex-col sm:items-start sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent transition group-hover:scale-110 group-hover:bg-accent group-hover:text-white"><Icon name={item.icon} /></span>
                <span className="min-w-0"><b className="block">{item.title}</b><span className="block text-sm leading-6 text-muted">{item.text}</span></span>
                <Icon name="chevron" className="ms-auto shrink-0 text-muted transition group-hover:-translate-x-1 sm:hidden lg:block" size={18} />
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <Card className="h-full text-center">
            {completion ? (
              <>
                <div className="flex justify-center"><Ring percent={completion.percent} size={104} /></div>
                <h2 className="mt-4 font-semibold">{completion.percent === 100 ? "پرونده شما کامل است" : "پرونده سلامت را کامل کنید"}</h2>
                <p className="mt-1.5 text-sm leading-7 text-muted">{faDigits(String(completion.filled))} از {faDigits(String(completion.total))} مورد اصلی پر شده. اطلاعات کامل، ویزیت را سریع‌تر و ایمن‌تر می‌کند.</p>
                {completion.percent < 100 ? <ButtonLink href="/account/record" size="sm" className="mt-4" icon="file">تکمیل پرونده</ButtonLink> : null}
              </>
            ) : record && !record.record ? (
              <>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon name="file" size={28} /></span>
                <h2 className="mt-4 font-semibold">پرونده‌ای ساخته نشده</h2>
                <p className="mt-1.5 text-sm leading-7 text-muted">پرونده خودتان را بسازید و سابقه سلامت را قبل از ویزیت وارد کنید.</p>
                <ButtonLink href="/account/record" size="sm" className="mt-4" icon="plus">ساخت پرونده</ButtonLink>
              </>
            ) : (
              <Skeleton className="h-52" />
            )}
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">آخرین مشاوره‌ها</h2>
            <Link href="/account/consultations" className="link-underline text-sm text-muted">همه</Link>
          </div>
          {consults === null ? <Skeleton className="h-20" /> : consults.length === 0 ? (
            <p className="card px-5 py-6 text-sm text-muted">مشاوره‌ای ندارید. اگر سؤالی دارید از مطب بپرسید.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {consults.slice(0, 2).map((row) => (
                <Link key={row.id} href={`/account/consultations/${row.id}`} className="card card-hover block p-5">
                  <div className="flex items-center justify-between gap-2">
                    <b>{TOPIC_LABEL[row.topic]}</b>
                    <Badge tone={row.status === "ANSWERED" ? "ok" : row.status === "OPEN" ? "warn" : "neutral"}>{CONSULTATION_STATUS_LABEL[row.status]}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">{row.messages[0]?.body}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
