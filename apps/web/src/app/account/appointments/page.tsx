"use client";

import { useEffect, useState } from "react";
import { APPOINTMENT_STATUS_LABEL, type AppointmentStatus } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { ConfirmButton, Tabs, useToast } from "@/components/interactive";
import { ButtonLink, Empty, ErrorNote, ListSkeleton, PageIntro, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { dayBlock, formatClock, relativeDay } from "@/lib/jalali";

type Appointment = {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  note?: string | null;
  service: { title: string };
  doctor: { user: { fullName: string } };
};

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");
  const toast = useToast();

  async function load() {
    setItems(await api<Appointment[]>("/appointments?scope=mine"));
  }

  useEffect(() => {
    void load().catch((cause) => setError(cause.message));
  }, []);

  const now = Date.now() - 3_600_000;
  const upcoming = (items ?? []).filter((item) => ["REQUESTED", "CONFIRMED", "ARRIVED"].includes(item.status) && new Date(item.startsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const cancelled = (items ?? []).filter((item) => item.status === "CANCELLED" || item.status === "NO_SHOW");
  const past = (items ?? []).filter((item) => !upcoming.includes(item) && !cancelled.includes(item));
  const lists: Record<string, Appointment[]> = { upcoming, past, cancelled };
  const shown = lists[tab] ?? [];

  return (
    <div>
      <PageIntro
        title="نوبت‌های من"
        text="تا قبل از انجام شدن، نوبت درخواست‌شده یا تأییدشده را می‌توانید لغو کنید."
        action={<ButtonLink href="/account/appointments/new" icon="plus">نوبت جدید</ButtonLink>}
      />
      <Tabs
        variant="pill"
        value={tab}
        onChange={setTab}
        className="mb-6"
        items={[
          { id: "upcoming", label: "پیش‌رو", badge: upcoming.length || undefined },
          { id: "past", label: "گذشته" },
          { id: "cancelled", label: "لغو شده" },
        ]}
      />
      <ErrorNote>{error}</ErrorNote>
      {!items ? <ListSkeleton /> : null}
      {items && shown.length === 0 ? (
        <Empty
          icon="calendar"
          title={tab === "upcoming" ? "نوبت پیش‌رویی ندارید" : "موردی نیست"}
          text={tab === "upcoming" ? "یک خدمت و ساعت خالی را انتخاب کنید. پرداختی لازم نیست." : "اینجا نوبت‌های قبلی شما دیده می‌شود."}
          action={tab === "upcoming" ? <ButtonLink href="/account/appointments/new" icon="calendar">گرفتن نوبت</ButtonLink> : undefined}
        />
      ) : null}
      <div key={tab} className="space-y-3">
        {shown.map((item, index) => {
          const block = dayBlock(item.startsAt);
          const canCancel = item.status === "REQUESTED" || item.status === "CONFIRMED";
          return (
            <article key={item.id} className="card card-hover pop flex gap-4 p-4 md:p-5" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="grid w-20 shrink-0 place-items-center rounded-2xl bg-paper py-3 text-center">
                <span className="text-xs text-muted">{block.month}</span>
                <span className="text-3xl font-bold leading-tight">{block.day}</span>
                <span className="text-[11px] text-accent-deep">{relativeDay(item.startsAt) ?? block.weekday}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{item.service.title}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted"><span>{item.doctor.user.fullName}</span><span className="inline-flex items-center gap-1"><Icon name="clock" size={14} />{formatClock(item.startsAt)}</span></p>
                  </div>
                  <StatusPill value={item.status} label={APPOINTMENT_STATUS_LABEL[item.status]} />
                </div>
                {item.note ? <p className="mt-2 text-sm leading-7 text-ink-2">{item.note}</p> : null}
                {canCancel ? (
                  <div className="mt-3">
                    <ConfirmButton
                      label="بله، لغو شود"
                      onConfirm={async () => {
                        await api(`/appointments/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
                        toast("نوبت لغو شد", "info");
                        await load();
                      }}
                    >
                      لغو نوبت
                    </ConfirmButton>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
