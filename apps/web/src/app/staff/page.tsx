"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APPOINTMENT_STATUS_LABEL, CONSULTATION_STATUS_LABEL, TOPIC_LABEL, faDigits, type AppointmentStatus, type ConsultationTopic } from "@clinic/shared";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { CountUp, Reveal } from "@/components/motion";
import { Badge, Card, Empty, Skeleton, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { dayRange, formatClock, formatDateOnly, tehranHour, todayIso } from "@/lib/jalali";

type Appointment = { id: string; startsAt: string; status: AppointmentStatus; patient: { fullName: string }; service: { title: string }; doctor: { user: { fullName: string } } };
type Consult = { id: string; status: keyof typeof CONSULTATION_STATUS_LABEL; topic: ConsultationTopic; patient: { fullName: string }; messages: { body: string }[] };
type Summary = { patients: number; withRecord: number; withoutRecord: number; newThisWeek: number; staff: number };

function Metric({ icon, label, value, tone, href }: { icon: "calendar" | "chat" | "users" | "file"; label: string; value: number | null; tone: string; href: string }) {
  return (
    <Link href={href} className="card card-hover group flex items-center gap-4 p-5">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl transition group-hover:scale-110 ${tone}`}><Icon name={icon} /></span>
      <span>
        <span className="block text-3xl font-bold leading-none">{value === null ? <Skeleton className="h-8 w-12" /> : <CountUp value={value} />}</span>
        <span className="mt-1.5 block text-sm text-muted">{label}</span>
      </span>
    </Link>
  );
}

export default function StaffHome() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [consults, setConsults] = useState<Consult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const range = dayRange(todayIso());
    const scope = user?.roles.includes("DENTIST") ? "&scope=doctor" : "";
    void api<Appointment[]>(`/appointments?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}${scope}`).then(setAppointments).catch(() => setAppointments([]));
    void api<Consult[]>("/consultations").then(setConsults).catch(() => setConsults([]));
    void api<Summary>("/patients/summary").then(setSummary).catch(() => undefined);
  }, [user]);

  const hour = tehranHour();
  const hello = hour < 12 ? "صبح بخیر" : hour < 17 ? "ظهر بخیر" : hour < 20 ? "عصر بخیر" : "شب بخیر";
  const open = consults?.filter((row) => row.status === "OPEN") ?? [];
  const active = appointments?.filter((item) => item.status !== "CANCELLED" && item.status !== "NO_SHOW") ?? [];
  const waiting = appointments?.filter((item) => item.status === "REQUESTED").length ?? 0;

  return (
    <div className="space-y-7">
      <header>
        <p className="rise text-sm text-muted">{hello} · {formatDateOnly(new Date().toISOString())}</p>
        <h1 className="rise mt-1 text-3xl font-bold" style={{ "--d": "60ms" } as React.CSSProperties}>{user?.fullName}</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal><Metric icon="calendar" label="نوبت امروز" value={appointments ? active.length : null} tone="bg-accent-soft text-accent-deep" href="/staff/appointments" /></Reveal>
        <Reveal delay={70}><Metric icon="chat" label="مشاوره بدون پاسخ" value={consults ? open.length : null} tone="bg-warn-soft text-warn" href="/staff/consultations" /></Reveal>
        <Reveal delay={140}><Metric icon="users" label="بیمار ثبت‌شده" value={summary ? summary.patients : null} tone="bg-info-soft text-info" href="/staff/patients" /></Reveal>
        <Reveal delay={210}><Metric icon="file" label="کاربر بدون پرونده" value={summary ? summary.withoutRecord : null} tone="bg-ok-soft text-ok" href="/staff/patients?filter=noRecord" /></Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">نوبت‌های امروز {waiting ? <Badge tone="warn">{faDigits(String(waiting))} در انتظار تأیید</Badge> : null}</h2>
              <Link href="/staff/calendar" className="link-underline text-sm text-muted">تقویم</Link>
            </div>
            {!appointments ? <Skeleton className="h-40" /> : appointments.length === 0 ? (
              <Empty icon="calendar" title="برای امروز نوبتی نیست" text="نوبت‌های تازه همین‌جا و در تلگرام (اگر وصل باشد) دیده می‌شوند." />
            ) : (
              <ol className="relative space-y-3 before:absolute before:inset-y-3 before:start-[1.55rem] before:w-px before:bg-line">
                {appointments.map((item) => (
                  <li key={item.id}>
                    <Link href="/staff/appointments" className="card card-hover relative flex items-center gap-4 p-4">
                      <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-sm font-semibold text-paper">{formatClock(item.startsAt)}</span>
                      <span className="min-w-0 flex-1"><b className="block truncate">{item.patient.fullName}</b><span className="text-sm text-muted">{item.service.title}</span></span>
                      <StatusPill value={item.status} label={APPOINTMENT_STATUS_LABEL[item.status]} />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">مشاوره‌های منتظر پاسخ</h2>
              <Link href="/staff/consultations" className="link-underline text-sm text-muted">همه</Link>
            </div>
            {!consults ? <Skeleton className="h-40" /> : open.length === 0 ? (
              <Card className="text-center text-sm text-muted">همه مشاوره‌ها پاسخ داده شده است.</Card>
            ) : (
              <div className="space-y-3">
                {open.slice(0, 4).map((row) => (
                  <Link key={row.id} href={`/staff/consultations/${row.id}`} className="card card-hover block p-4">
                    <div className="flex items-center justify-between gap-2"><b>{row.patient.fullName}</b><Badge>{TOPIC_LABEL[row.topic]}</Badge></div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-7 text-muted">{row.messages[0]?.body}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
