"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { faDigits } from "@clinic/shared";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/interactive";
import { Button, ButtonLink, ErrorNote, PageIntro, Skeleton, TextArea } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { dayBlock, formatDateOnly, todayIso } from "@/lib/jalali";

type Service = { id: string; slug: string; title: string; durationMin: number };
type Doctor = { id: string; fullName: string; specialty?: string; services: { id: string }[] };
type Day = { date: string; count: number };
type Slot = { start: string; label: string };

const HOUR = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", hourCycle: "h23" });

function StepTitle({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 text-base font-semibold">
      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs transition-colors duration-500 ${done ? "bg-ok text-white" : "bg-ink text-paper"}`}>{done ? <Icon name="check" size={14} strokeWidth={2.6} /> : faDigits(String(n))}</span>
      {title}
    </h2>
  );
}

function Booker() {
  const params = useSearchParams();
  const toast = useToast();
  const captcha = useRef<CaptchaHandle>(null);
  const [services, setServices] = useState<Service[] | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [days, setDays] = useState<Day[] | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [start, setStart] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<null | { when: string; service: string }>(null);

  useEffect(() => {
    Promise.all([api<Service[]>("/services"), api<Doctor[]>("/doctors")])
      .then(([serviceRows, doctorRows]) => {
        setServices(serviceRows);
        setDoctors(doctorRows);
        const wanted = serviceRows.find((service) => service.slug === params.get("service"));
        setServiceId(wanted?.id ?? serviceRows[0]?.id ?? "");
      })
      .catch((cause) => setError(cause.message));
  }, [params]);

  const availableDoctors = useMemo(() => doctors.filter((doctor) => doctor.services.some((service) => service.id === serviceId)), [doctors, serviceId]);

  useEffect(() => {
    if (!availableDoctors.some((doctor) => doctor.id === doctorId)) setDoctorId(availableDoctors[0]?.id ?? "");
  }, [availableDoctors, doctorId]);

  useEffect(() => {
    if (!doctorId || !serviceId) return;
    setDays(null);
    setDate("");
    setSlots(null);
    setStart("");
    api<{ days: Day[] }>(`/availability/days?doctorId=${doctorId}&serviceId=${serviceId}&from=${todayIso()}`)
      .then((result) => {
        setDays(result.days);
        setDate(result.days.find((day) => day.count > 0)?.date || "");
      })
      .catch((cause) => setError(cause.message));
  }, [doctorId, serviceId]);

  useEffect(() => {
    if (!doctorId || !serviceId || !date) return;
    setSlots(null);
    setStart("");
    api<Slot[]>(`/availability?doctorId=${doctorId}&serviceId=${serviceId}&date=${date}`)
      .then(setSlots)
      .catch((cause) => setError(cause.message));
  }, [doctorId, serviceId, date]);

  const service = services?.find((item) => item.id === serviceId);
  const doctor = doctors.find((item) => item.id === doctorId);
  const slot = slots?.find((item) => item.start === start);
  const morning = (slots ?? []).filter((item) => Number(HOUR.format(new Date(item.start))) < 13);
  const evening = (slots ?? []).filter((item) => Number(HOUR.format(new Date(item.start))) >= 13);

  async function submit() {
    if (!captcha.current?.ready()) {
      setError("کد داخل تصویر را بنویسید");
      return;
    }
    setPending(true);
    setError("");
    try {
      await api("/appointments", { method: "POST", body: JSON.stringify({ doctorId, serviceId, start, note: note || undefined, ...captcha.current?.values() }) });
      toast("درخواست نوبت ثبت شد");
      setDone({ when: `${formatDateOnly(start)}، ساعت ${slot?.label ?? ""}`, service: service?.title ?? "" });
    } catch (cause) {
      captcha.current?.refresh();
      setError(cause instanceof ApiError ? cause.message : "نوبت ثبت نشد");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="card pop mx-auto max-w-lg p-8 text-center md:p-12">
        <svg viewBox="0 0 52 52" className="mx-auto h-20 w-20" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" stroke="var(--color-ok)" strokeWidth="3" strokeDasharray="151" strokeDashoffset="151" style={{ animation: "draw 0.8s var(--ease-out-expo) forwards" }} />
          <path d="M15 27l8 8 14-16" fill="none" stroke="var(--color-ok)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40" style={{ animation: "draw 0.6s 0.55s var(--ease-out-expo) forwards" }} />
        </svg>
        <h1 className="mt-5 text-2xl font-bold">درخواست نوبت ثبت شد</h1>
        <p className="mt-3 leading-8 text-muted">{done.service}<br />{done.when}</p>
        <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm leading-7 text-warn">وضعیت فعلی «درخواست‌شده» است. بعد از تأیید مطب، نوبت قطعی می‌شود. پرداختی لازم نیست.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/account/appointments" icon="calendar">نوبت‌های من</ButtonLink>
          <ButtonLink href="/account/record" variant="ghost" icon="file">تکمیل پرونده</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageIntro title="گرفتن نوبت" text="ساعت‌های خالی از برنامه پزشک می‌آید. بعد از ثبت، مطب نوبت را تأیید می‌کند." />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="min-w-0 space-y-8">
          <section>
            <StepTitle n={1} title="خدمت" done={Boolean(service)} />
            {!services ? (
              <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((item) => {
                  const on = item.id === serviceId;
                  return (
                    <button key={item.id} type="button" onClick={() => setServiceId(item.id)} aria-pressed={on} className={`relative flex items-center justify-between gap-3 rounded-3xl border p-4 text-start transition duration-300 active:scale-[0.98] ${on ? "border-accent bg-accent-soft shadow-glow" : "border-line bg-surface hover:border-ink/30"}`}>
                      <span><b className="block">{item.title}</b><span className="text-xs text-muted">حدود {faDigits(String(item.durationMin))} دقیقه</span></span>
                      <span className={`grid h-6 w-6 place-items-center rounded-full transition duration-300 ${on ? "scale-100 bg-accent text-white" : "scale-75 bg-sunk text-transparent"}`}><Icon name="check" size={14} strokeWidth={2.6} /></span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {availableDoctors.length > 1 ? (
            <section>
              <StepTitle n={2} title="پزشک" done={Boolean(doctor)} />
              <div className="flex flex-wrap gap-2">
                {availableDoctors.map((item) => (
                  <button key={item.id} type="button" onClick={() => setDoctorId(item.id)} className={`rounded-full border px-5 py-2.5 text-sm transition active:scale-95 ${doctorId === item.id ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink/30"}`}>{item.fullName}</button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <StepTitle n={availableDoctors.length > 1 ? 3 : 2} title="روز" done={Boolean(date)} />
            {!days ? (
              <div className="flex gap-2"><Skeleton className="h-24 w-24" /><Skeleton className="h-24 w-24" /><Skeleton className="h-24 w-24" /></div>
            ) : (
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
                {days.map((day) => {
                  const block = dayBlock(`${day.date}T12:00:00+03:30`);
                  const on = date === day.date;
                  const off = day.count === 0;
                  return (
                    <button key={day.date} type="button" disabled={off} onClick={() => setDate(day.date)} aria-pressed={on} className={`flex w-[5.4rem] shrink-0 flex-col items-center rounded-3xl border px-2 py-3 transition duration-300 active:scale-95 disabled:cursor-not-allowed ${on ? "border-ink bg-ink text-paper shadow-lift" : off ? "border-dashed border-line bg-transparent text-muted/50" : "border-line bg-surface hover:border-ink/30"}`}>
                      <span className={`text-[11px] ${on ? "text-accent-2" : "text-muted"}`}>{block.weekday}</span>
                      <span className="text-2xl font-bold leading-snug">{block.day}</span>
                      <span className="text-[11px]">{block.month}</span>
                      <span className={`mt-1 text-[10px] ${on ? "text-paper/70" : "text-muted"}`}>{off ? "تعطیل" : `${faDigits(String(day.count))} ساعت`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <StepTitle n={availableDoctors.length > 1 ? 4 : 3} title="ساعت" done={Boolean(start)} />
            {!date ? (
              <p className="rounded-2xl bg-sunk px-4 py-3 text-sm text-muted">اول یک روز را انتخاب کنید.</p>
            ) : !slots ? (
              <div className="flex flex-wrap gap-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-11 w-24 rounded-2xl" />)}</div>
            ) : slots.length === 0 ? (
              <p className="rounded-2xl bg-sunk px-4 py-3 text-sm text-muted">برای این روز ساعتی نمانده. روز دیگری را انتخاب کنید.</p>
            ) : (
              <div key={date} className="space-y-4">
                {[["صبح", morning], ["عصر", evening]].map(([label, list]) => (list as Slot[]).length ? (
                  <div key={label as string}>
                    <p className="mb-2 text-xs text-muted">{label as string}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {(list as Slot[]).map((item, index) => (
                        <button key={item.start} type="button" onClick={() => setStart(item.start)} aria-pressed={start === item.start} style={{ animationDelay: `${index * 25}ms` }} className={`pop rounded-2xl border py-3 text-sm font-medium transition duration-300 active:scale-95 ${start === item.start ? "border-accent bg-accent text-white shadow-glow" : "border-line bg-surface hover:border-ink/30"}`}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null)}
              </div>
            )}
          </section>

          <section>
            <StepTitle n={availableDoctors.length > 1 ? 5 : 4} title="توضیح برای مطب" />
            <TextArea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="اگر درد یا نکته‌ای هست بنویسید (اختیاری)" />
          </section>
        </div>

        <aside className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">خلاصه نوبت</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row icon="tooth" label="خدمت" value={service?.title} />
            <Row icon="stethoscope" label="پزشک" value={doctor?.fullName} />
            <Row icon="calendar" label="روز" value={date ? formatDateOnly(`${date}T12:00:00+03:30`) : undefined} />
            <Row icon="clock" label="ساعت" value={slot?.label} />
          </dl>
          <Captcha ref={captcha} className="mt-5" />
          <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
          <Button className="mt-4 w-full" size="lg" loading={pending} disabled={!start || !serviceId || !doctorId} onClick={submit} icon="check">ثبت درخواست نوبت</Button>
          <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-muted"><Icon name="shield" size={14} className="mt-1 shrink-0 text-ok" />پرداخت اینترنتی لازم نیست. مطب بعد از بررسی، نوبت را تأیید می‌کند.</p>
          <p className="mt-2 text-xs text-muted">برای تغییر یا لغو، از <Link href="/account/appointments" className="link-underline text-ink">نوبت‌های من</Link> اقدام کنید.</p>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: "tooth" | "stethoscope" | "calendar" | "clock"; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-500 ${value ? "bg-accent-soft text-accent" : "bg-sunk text-muted"}`}><Icon name={icon} size={16} /></span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="truncate font-medium">{value ?? <span className="text-muted/60">انتخاب نشده</span>}</dd>
      </div>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /></div>}>
      <Booker />
    </Suspense>
  );
}

