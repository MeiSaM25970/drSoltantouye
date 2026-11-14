"use client";

import { useCallback, useEffect, useState } from "react";
import { faDigits, patientCompletion, type RecordPatch } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { Ring, Tabs, useToast } from "@/components/interactive";
import { Odontogram } from "@/components/odontogram";
import { AttachmentGrid, VisitTimeline } from "@/components/record-parts";
import { SectionForm } from "@/components/record-form";
import { Button, Card, ErrorNote, PageIntro, Skeleton } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDateOnly } from "@/lib/jalali";
import type { RecordDetail } from "@/lib/record-types";

const intro = [
  { icon: "heart", title: "سلامت عمومی", text: "بیماری، دارو و حساسیت" },
  { icon: "tooth", title: "سابقه دندانی", text: "دلیل مراجعه و عادت‌ها" },
  { icon: "shield", title: "محرمانه", text: "فقط شما و تیم درمان می‌بینید" },
] as const;

export default function RecordPage() {
  const toast = useToast();
  const [data, setData] = useState<RecordDetail | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("mine");

  const load = useCallback(async () => {
    setData(await api<RecordDetail>("/patients/me"));
  }, []);

  useEffect(() => {
    void load().catch((cause) => setError(cause.message));
  }, [load]);

  async function create() {
    setCreating(true);
    setError("");
    try {
      setData(await api<RecordDetail>("/patients/me/record", { method: "POST" }));
      toast("پرونده شما ساخته شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "پرونده ساخته نشد");
    } finally {
      setCreating(false);
    }
  }

  if (!data) return error ? <ErrorNote>{error}</ErrorNote> : <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;

  const record = data.record;

  if (!record) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card relative overflow-hidden p-8 text-center md:p-12">
          <div className="orb-a absolute -top-16 start-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
          <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-accent text-white shadow-glow"><Icon name="file" size={34} /></span>
          <h1 className="relative mt-6 text-2xl font-bold md:text-3xl">پرونده دندانپزشکی شما</h1>
          <p className="relative mx-auto mt-3 max-w-md leading-8 text-muted">پرونده را همین حالا بسازید و سابقه سلامت را قبل از ویزیت وارد کنید. وقت معاینه کوتاه‌تر می‌شود و درمان ایمن‌تر.</p>
          <div className="relative mt-7 grid gap-3 text-start sm:grid-cols-3">
            {intro.map((item) => (
              <div key={item.title} className="rounded-2xl bg-paper p-4">
                <Icon name={item.icon} className="text-accent" size={20} />
                <b className="mt-2 block text-sm">{item.title}</b>
                <span className="text-xs leading-6 text-muted">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-8"><ErrorNote>{error}</ErrorNote></div>
          <Button size="lg" loading={creating} onClick={create} icon="plus" className="relative mt-2">ساخت پرونده</Button>
        </div>
      </div>
    );
  }

  const completion = patientCompletion(record.values);
  const hasTreatment = ["diagnosis", "treatmentPlan"].some((key) => Boolean((record.values as Record<string, unknown>)[key])) || record.teeth.length > 0 || record.visits.length > 0;
  const mine = record.attachments.filter((item) => item.byPatient);

  async function save(patch: RecordPatch) {
    await api("/patients/me/record", { method: "PATCH", body: JSON.stringify(patch) });
    await load();
  }

  return (
    <div>
      <PageIntro title="پرونده من" text="اطلاعات شما فقط برای تیم درمان قابل دیدن است. هر زمان می‌توانید ویرایش کنید." />

      <section className="mesh-dark grain relative mb-7 overflow-hidden rounded-[2rem] p-6 text-paper md:p-8">
        <div className="relative flex flex-wrap items-center gap-6">
          <Ring percent={completion.percent} size={96} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-paper/60">شماره پرونده</p>
            <p className="text-3xl font-bold tracking-wide">{faDigits(String(record.fileNo))}</p>
            <p className="mt-1 text-sm text-paper/70">{completion.percent === 100 ? "همه موارد اصلی تکمیل است" : `${faDigits(String(completion.total - completion.filled))} مورد اصلی باقی مانده`} · ساخته‌شده در {formatDateOnly(record.createdAt)}</p>
          </div>
        </div>
      </section>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: "mine", label: "اطلاعات من", icon: "user" },
          { id: "treatment", label: "وضعیت درمان", icon: "tooth", hidden: !hasTreatment },
          { id: "files", label: "تصاویر", icon: "image", badge: record.attachments.length || undefined },
        ]}
      />

      <div key={tab} className="page-in">
        {tab === "mine" ? <SectionForm section="patient" values={record.values} editable={data.access.patient} onSave={save} /> : null}

        {tab === "treatment" ? (
          <div className="space-y-6">
            <p className="rounded-2xl bg-info-soft px-4 py-3 text-sm leading-7 text-info">این بخش را دندانپزشک تکمیل می‌کند و شما فقط می‌توانید ببینید.</p>
            <SectionForm section="clinical" values={record.values} editable={false} onSave={save} hideHeader />
            {record.teeth.length ? (
              <Card>
                <h2 className="mb-4 font-semibold">نقشه دندان‌ها</h2>
                <Odontogram teeth={record.teeth} />
              </Card>
            ) : null}
            {record.visits.length ? (
              <div>
                <h2 className="mb-3 font-semibold">یادداشت ویزیت‌ها</h2>
                <VisitTimeline visits={record.visits} />
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "files" ? (
          <div className="space-y-4">
            <p className="text-sm leading-7 text-muted">رادیوگرافی، عکس دندان یا برگه آزمایش را اینجا بگذارید. فایل‌هایی که خودتان اضافه کرده‌اید فقط توسط مطب حذف می‌شود.</p>
            <AttachmentGrid
              files={record.attachments}
              onUpload={async (file, caption) => {
                const form = new FormData();
                form.set("file", file);
                if (caption) form.set("caption", caption);
                await api("/patients/me/attachments", { method: "POST", body: form });
                await load();
              }}
              emptyText={mine.length ? "" : "تصویری هنوز اضافه نشده."}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
