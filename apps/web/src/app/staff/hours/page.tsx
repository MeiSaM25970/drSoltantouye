"use client";

import { FormEvent, useEffect, useState } from "react";
import { WEEKDAY_LABEL } from "@clinic/shared";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ConfirmButton, JalaliDateField, Tabs, useToast } from "@/components/interactive";
import { Badge, Button, Card, ErrorNote, Field, PageIntro, Skeleton, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDateTime, minutesFromTime, timeFromMinutes, todayIso } from "@/lib/jalali";

type Hour = { weekday: number; startMin: number; endMin: number };
type Block = { id: string; startsAt: string; endsAt: string; reason?: string | null };
type Doctor = { id: string; specialty: string; user: { fullName: string }; hours: Hour[]; blocks: Block[] };

const order = [6, 0, 1, 2, 3, 4, 5];

export default function HoursPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [hours, setHours] = useState<Hour[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState(todayIso());
  const canEdit = Boolean(user?.roles.includes("ADMIN"));

  async function loadAll() {
    const rows = await api<Doctor[]>("/doctors/manage/all");
    setDoctors(rows);
    return rows;
  }

  async function refreshBlocks() {
    if (user?.roles.includes("ADMIN") || user?.roles.includes("SECRETARY")) {
      await loadAll();
      return;
    }
    const blocks = await api<Block[]>(`/doctors/${doctorId}/blocks`);
    setDoctors((current) => current?.map((item) => (item.id === doctorId ? { ...item, blocks } : item)) ?? current);
  }

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      if (user.roles.includes("ADMIN") || user.roles.includes("SECRETARY")) {
        const rows = await loadAll();
        setDoctorId(rows[0]?.id ?? "");
        setHours(rows[0]?.hours ?? []);
      } else if (user.doctor) {
        const [hourRows, blocks] = await Promise.all([api<Hour[]>(`/doctors/${user.doctor.id}/hours`), api<Block[]>(`/doctors/${user.doctor.id}/blocks`)]);
        setDoctors([{ id: user.doctor.id, specialty: user.doctor.specialty, user: { fullName: user.fullName }, hours: hourRows, blocks }]);
        setDoctorId(user.doctor.id);
        setHours(hourRows);
      } else setDoctors([]);
    };
    void run().catch((cause) => setError(cause.message));
  }, [user]);

  const doctor = doctors?.find((item) => item.id === doctorId);

  function setShift(weekday: number, index: number, key: "startMin" | "endMin", value: string) {
    setHours((current) => {
      const rest = current.filter((hour) => hour.weekday !== weekday);
      const existing = current.filter((hour) => hour.weekday === weekday);
      const shifts = [0, 1].map((shiftIndex) => existing[shiftIndex] ?? { weekday, startMin: 0, endMin: 0 });
      shifts[index] = { ...shifts[index], weekday, [key]: value ? minutesFromTime(value) : 0 };
      return [...rest, ...shifts];
    });
  }

  async function saveHours() {
    setSaving(true);
    setError("");
    try {
      const saved = await api<Hour[]>(`/doctors/${doctorId}/hours`, { method: "PUT", body: JSON.stringify({ hours: hours.filter((hour) => hour.endMin > hour.startMin) }) });
      setHours(saved);
      toast("ساعت‌های کاری ذخیره شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ذخیره نشد");
    } finally {
      setSaving(false);
    }
  }

  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError("");
    try {
      await api(`/doctors/${doctorId}/blocks`, {
        method: "POST",
        body: JSON.stringify({ date: blockDate, startMin: minutesFromTime(String(form.get("start"))), endMin: minutesFromTime(String(form.get("end"))), reason: form.get("reason") }),
      });
      toast("بازه بسته شد");
      formEl.reset();
      await refreshBlocks();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "بازه ثبت نشد");
    }
  }

  if (!doctors) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-80" /></div>;

  return (
    <div>
      <PageIntro title="ساعت کاری" text={canEdit ? "هر روز می‌تواند دو شیفت داشته باشد. روز بدون ساعت، تعطیل حساب می‌شود." : "ساعت کاری فقط توسط مدیر تغییر می‌کند و اینجا برای اطلاع شما نمایش داده می‌شود."} />
      {doctors.length > 1 ? (
        <Tabs variant="pill" className="mb-6" value={doctorId} onChange={(id) => { setDoctorId(id); setHours(doctors.find((item) => item.id === id)?.hours ?? []); }} items={doctors.map((item) => ({ id: item.id, label: item.user.fullName }))} />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {order.map((weekday) => {
          const shifts = hours.filter((hour) => hour.weekday === weekday);
          const open = shifts.some((shift) => shift.endMin > shift.startMin);
          return (
            <Card key={weekday} className={`pop p-4 ${open ? "" : "bg-sunk/50"}`}>
              <div className="mb-3 flex items-center justify-between">
                <b>{WEEKDAY_LABEL[weekday]}</b>
                {open ? <Badge tone="ok">باز</Badge> : <Badge>تعطیل</Badge>}
              </div>
              <div className="space-y-2">
                {[0, 1].map((shiftIndex) => {
                  const shift = shifts[shiftIndex];
                  const active = Boolean(shift && (shift.startMin || shift.endMin));
                  return (
                    <div key={shiftIndex} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs text-muted">شیفت {shiftIndex === 0 ? "اول" : "دوم"}</span>
                      <TextInput type="time" ltr disabled={!canEdit} value={active ? timeFromMinutes(shift.startMin) : ""} onChange={(event) => setShift(weekday, shiftIndex, "startMin", event.target.value)} className="!px-3 !py-2" aria-label="شروع" />
                      <span className="text-muted">تا</span>
                      <TextInput type="time" ltr disabled={!canEdit} value={active ? timeFromMinutes(shift.endMin) : ""} onChange={(event) => setShift(weekday, shiftIndex, "endMin", event.target.value)} className="!px-3 !py-2" aria-label="پایان" />
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      {canEdit ? <Button className="mt-2" size="lg" icon="check" loading={saving} onClick={saveHours}>ذخیره ساعت‌ها</Button> : null}

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Icon name="clock" size={20} className="text-accent" />تعطیلی موردی</h2>
        <p className="mt-1 text-sm text-muted">برای مرخصی یا جلسه، یک بازه را ببندید تا نوبت‌گیری در آن ساعت‌ها غیرفعال شود.</p>
        <ul className="mt-4 space-y-2.5">
          {doctor?.blocks.length === 0 ? <li className="card px-5 py-5 text-sm text-muted">بازه بسته‌ای ثبت نشده.</li> : null}
          {doctor?.blocks.map((block) => (
            <li key={block.id} className="card flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
              <span><b>{formatDateTime(block.startsAt)}</b> تا <b>{formatDateTime(block.endsAt)}</b>{block.reason ? <span className="text-muted"> · {block.reason}</span> : null}</span>
              <ConfirmButton icon="trash" label="باز شود" onConfirm={async () => { await api(`/blocks/${block.id}`, { method: "DELETE" }); await refreshBlocks(); toast("بازه باز شد", "info"); }}>حذف</ConfirmButton>
            </li>
          ))}
        </ul>
        <form className="card mt-5 grid gap-4 p-5 md:grid-cols-2" onSubmit={addBlock}>
          <div className="md:col-span-2"><Field label="تاریخ"><JalaliDateField value={blockDate} onChange={setBlockDate} yearsBack={0} yearsAhead={2} /></Field></div>
          <Field label="از ساعت"><TextInput name="start" type="time" required defaultValue="09:00" ltr /></Field>
          <Field label="تا ساعت"><TextInput name="end" type="time" required defaultValue="13:00" ltr /></Field>
          <div className="md:col-span-2"><Field label="دلیل"><TextInput name="reason" placeholder="مثلاً مرخصی" /></Field></div>
          <div className="md:col-span-2"><Button type="submit" icon="lock">بستن این بازه</Button></div>
        </form>
      </section>
    </div>
  );
}
