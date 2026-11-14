"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { APPOINTMENT_STATUS_LABEL, faDigits, type AppointmentStatus } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { Empty, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { JALALI_MONTHS, WEEK_HEAD, currentJalali, dayRange, formatClock, formatDateOnly, monthMatrix, shiftMonth, tehranDateKey, todayIso } from "@/lib/jalali";

type Appointment = { id: string; startsAt: string; status: AppointmentStatus; patient: { id: string; fullName: string }; service: { title: string } };

export default function CalendarPage() {
  const now = currentJalali();
  const [cursor, setCursor] = useState({ jy: now.jy, jm: now.jm });
  const [selected, setSelected] = useState(todayIso());
  const [items, setItems] = useState<Appointment[]>([]);
  const cells = useMemo(() => monthMatrix(cursor.jy, cursor.jm), [cursor]);
  const today = todayIso();

  useEffect(() => {
    const dates = cells.flatMap((cell) => (cell ? [cell.iso] : []));
    if (!dates.length) return;
    const from = dayRange(dates[0]).from;
    const to = dayRange(dates[dates.length - 1]).to;
    void api<Appointment[]>(`/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(setItems).catch(() => setItems([]));
  }, [cells]);

  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.status === "CANCELLED" || item.status === "NO_SHOW") continue;
    const key = tehranDateKey(item.startsAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dayItems = items.filter((item) => tehranDateKey(item.startsAt) === selected);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
      <section className="card p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <button aria-label="ماه قبل" onClick={() => setCursor((value) => shiftMonth(value.jy, value.jm, -1))} className="grid h-10 w-10 place-items-center rounded-full border border-line transition hover:bg-sunk active:scale-90"><Icon name="chevron" size={18} className="-scale-x-100" /></button>
          <h1 key={`${cursor.jy}-${cursor.jm}`} className="rise text-xl font-bold md:text-2xl">{JALALI_MONTHS[cursor.jm - 1]} {faDigits(String(cursor.jy))}</h1>
          <button aria-label="ماه بعد" onClick={() => setCursor((value) => shiftMonth(value.jy, value.jm, 1))} className="grid h-10 w-10 place-items-center rounded-full border border-line transition hover:bg-sunk active:scale-90"><Icon name="chevron" size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
          {WEEK_HEAD.map((day) => <span key={day} className="py-1">{day}</span>)}
        </div>
        <div key={`${cursor.jy}-${cursor.jm}`} className="fade mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((cell, index) => {
            if (!cell) return <span key={`empty-${index}`} />;
            const count = counts.get(cell.iso) ?? 0;
            const on = selected === cell.iso;
            return (
              <button key={cell.iso} onClick={() => setSelected(cell.iso)} aria-pressed={on} className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl border text-sm transition duration-300 active:scale-95 md:min-h-[4.5rem] ${on ? "border-ink bg-ink text-paper shadow-lift" : cell.iso === today ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink/30"}`}>
                <span className="font-medium">{faDigits(String(cell.jd))}</span>
                {count ? <span className={`mt-0.5 rounded-full px-1.5 text-[10px] ${on ? "bg-white/20" : "bg-accent text-white"}`}>{faDigits(String(count))}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="xl:sticky xl:top-6">
        <h2 className="mb-3 text-lg font-semibold">{formatDateOnly(`${selected}T12:00:00+03:30`)}</h2>
        {dayItems.length === 0 ? <Empty icon="calendar" title="نوبتی نیست" text="برای این روز نوبتی ثبت نشده." /> : null}
        <div key={selected} className="space-y-2.5">
          {dayItems.map((item, index) => (
            <Link key={item.id} href={`/staff/patients/${item.patient.id}`} style={{ animationDelay: `${index * 45}ms` }} className="card card-hover pop flex items-center gap-3 p-3.5">
              <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-ink text-sm font-semibold text-paper">{formatClock(item.startsAt)}</span>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.patient.fullName}</b><span className="text-xs text-muted">{item.service.title}</span></span>
              <StatusPill value={item.status} label={APPOINTMENT_STATUS_LABEL[item.status]} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
