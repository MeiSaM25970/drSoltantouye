"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { APPOINTMENT_STATUS_LABEL, faDigits, formatPhone, type AppointmentStatus } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { Tabs, useToast } from "@/components/interactive";
import { Button, Empty, ErrorNote, ListSkeleton, PageIntro, StatusPill } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { dayBlock, formatClock, relativeDay, tehranDateKey, todayIso } from "@/lib/jalali";

type Appointment = {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  note?: string | null;
  patient: { id: string; fullName: string; phone: string };
  service: { title: string };
  doctor: { user: { fullName: string } };
};

const next: Partial<Record<AppointmentStatus, { to: AppointmentStatus; label: string; variant: "primary" | "soft" }[]>> = {
  REQUESTED: [{ to: "CONFIRMED", label: "تأیید نوبت", variant: "primary" }],
  CONFIRMED: [{ to: "ARRIVED", label: "ثبت حضور", variant: "primary" }, { to: "NO_SHOW", label: "نیامد", variant: "soft" }],
  ARRIVED: [{ to: "COMPLETED", label: "پایان ویزیت", variant: "primary" }],
};

export default function StaffAppointmentsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isDoctor = Boolean(user?.roles.includes("DENTIST"));
  const [mine, setMine] = useState<boolean | null>(null);
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pending");
  const [busy, setBusy] = useState("");

  const scope = mine ?? isDoctor;

  async function load() {
    setItems(await api<Appointment[]>(`/appointments${isDoctor && scope ? "?scope=doctor" : ""}`));
  }
  useEffect(() => {
    if (!user) return;
    void load().catch((cause) => setError(cause.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, scope]);

  async function change(id: string, status: AppointmentStatus) {
    setBusy(id + status);
    try {
      await api(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast(`وضعیت: ${APPOINTMENT_STATUS_LABEL[status]}`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر نکرد");
    } finally {
      setBusy("");
    }
  }

  const groups = useMemo(() => {
    const rows = items ?? [];
    const today = todayIso();
    return {
      pending: rows.filter((item) => item.status === "REQUESTED"),
      today: rows.filter((item) => tehranDateKey(item.startsAt) === today && !["CANCELLED", "NO_SHOW"].includes(item.status)),
      upcoming: rows.filter((item) => tehranDateKey(item.startsAt) > today && ["REQUESTED", "CONFIRMED"].includes(item.status)),
      done: rows.filter((item) => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status)).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    } as Record<string, Appointment[]>;
  }, [items]);
  const shown = groups[tab] ?? [];

  return (
    <div>
      <PageIntro title="نوبت‌ها" text="با یک کلیک نوبت را تأیید یا وضعیت حضور بیمار را ثبت کنید. لغو و تأیید به تلگرام تیم هم می‌رود." />
      {isDoctor ? (
        <div className="mb-4 inline-flex gap-1 rounded-full border border-line bg-surface p-1 text-sm">
          {[{ id: true, label: "نوبت‌های من" }, { id: false, label: "همهٔ نوبت‌های مطب" }].map((option) => (
            <button key={String(option.id)} onClick={() => { setItems(null); setMine(option.id); }} className={`rounded-full px-4 py-1.5 transition ${scope === option.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"}`}>{option.label}</button>
          ))}
        </div>
      ) : null}
      <Tabs
        variant="pill"
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: "pending", label: "منتظر تأیید", badge: groups.pending.length || undefined },
          { id: "today", label: "امروز", badge: groups.today.length || undefined },
          { id: "upcoming", label: "پیش‌رو" },
          { id: "done", label: "بایگانی" },
        ]}
      />
      <ErrorNote>{error}</ErrorNote>
      {!items ? <ListSkeleton /> : null}
      {items && shown.length === 0 ? <Empty icon="calendar" title="موردی نیست" text="در این دسته نوبتی دیده نمی‌شود." /> : null}
      <div key={tab} className="space-y-3">
        {shown.map((item, index) => {
          const block = dayBlock(item.startsAt);
          return (
            <article key={item.id} className="card card-hover pop flex gap-4 p-4" style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}>
              <div className="grid w-[4.5rem] shrink-0 place-items-center rounded-2xl bg-paper py-2.5 text-center">
                <span className="text-[11px] text-muted">{block.month}</span>
                <span className="text-2xl font-bold leading-tight">{block.day}</span>
                <span className="text-[11px] text-accent-deep">{relativeDay(item.startsAt) ?? block.weekday}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/staff/patients/${item.patient.id}`} className="link-underline font-semibold">{item.patient.fullName}</Link>
                    <p className="mt-0.5 text-sm text-muted">{formatPhone(item.patient.phone)}</p>
                  </div>
                  <StatusPill value={item.status} label={APPOINTMENT_STATUS_LABEL[item.status]} />
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm"><span>{item.service.title}</span><span className="inline-flex items-center gap-1 text-muted"><Icon name="clock" size={14} />{formatClock(item.startsAt)}</span><span className="text-muted">{item.doctor.user.fullName}</span></p>
                {item.note ? <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm leading-7 text-ink-2">{item.note}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {next[item.status]?.map((action) => (
                    <Button key={action.to} size="sm" variant={action.variant} loading={busy === item.id + action.to} onClick={() => change(item.id, action.to)}>{action.label}</Button>
                  ))}
                  {item.status === "REQUESTED" || item.status === "CONFIRMED" ? <Button size="sm" variant="ghost" loading={busy === item.id + "CANCELLED"} onClick={() => change(item.id, "CANCELLED")}>لغو</Button> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted">{faDigits(String(items?.length ?? 0))} نوبت در مجموع</p>
    </div>
  );
}
