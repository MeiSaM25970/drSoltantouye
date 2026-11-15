"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { faDigits, formatPhone, patientCompletion, type RecordPatch, type ToothCondition } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { Modal, Ring, Tabs, useToast } from "@/components/interactive";
import { Odontogram } from "@/components/odontogram";
import { AttachmentGrid, AuditList, LedgerPanel, VisitTimeline } from "@/components/record-parts";
import { SectionForm } from "@/components/record-form";
import { Avatar, Badge, Button, Card, ErrorNote, Skeleton } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDateOnly } from "@/lib/jalali";
import type { RecordDetail } from "@/lib/record-types";

const ROLE: Record<string, string> = { PATIENT: "بیمار", SECRETARY: "منشی", DENTIST: "دندانپزشک", ADMIN: "مدیر" };

export default function PatientFilePage() {
  const params = useParams<{ userId: string }>();
  const toast = useToast();
  const router = useRouter();
  const { user: me } = useAuth();
  const [confirm, setConfirm] = useState<"record" | "patient" | null>(null);
  const [removing, setRemoving] = useState(false);
  const [data, setData] = useState<RecordDetail | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("patient");
  const base = `/patients/${params.userId}`;

  const load = useCallback(async () => {
    setData(await api<RecordDetail>(`/patients/${params.userId}`));
  }, [params.userId]);

  useEffect(() => {
    void load().catch((cause) => setError(cause.message));
  }, [load]);

  if (!data) {
    return error ? <ErrorNote>{error}</ErrorNote> : <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-12 w-72" /><Skeleton className="h-72" /></div>;
  }

  const { user, access, record } = data;
  const isPatient = user.roles.includes("PATIENT");

  async function create() {
    setCreating(true);
    setError("");
    try {
      await api(`${base}/record`, { method: "POST" });
      await load();
      toast("پرونده ساخته شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "پرونده ساخته نشد");
    } finally {
      setCreating(false);
    }
  }

  const isAdmin = Boolean(me?.roles.includes("ADMIN"));
  const staffAccount = user.roles.some((role) => role !== "PATIENT");

  async function remove() {
    if (!confirm) return;
    setRemoving(true);
    setError("");
    try {
      await api(confirm === "patient" ? base : `${base}/record`, { method: "DELETE" });
      if (confirm === "patient") {
        toast("بیمار حذف شد");
        router.replace("/staff/patients");
        return;
      }
      setConfirm(null);
      await load();
      toast("پرونده حذف شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "حذف انجام نشد");
      setConfirm(null);
    } finally {
      setRemoving(false);
    }
  }

  const confirmModal = (
    <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === "patient" ? "حذف بیمار" : "حذف پرونده"}>
      <p className="leading-8 text-muted">
        {confirm === "patient"
          ? `حساب «${user.fullName}»، پرونده، نوبت‌ها، مشاوره‌ها و همهٔ تصویرها برای همیشه پاک می‌شود.`
          : `پرونده و تصویرهای «${user.fullName}» برای همیشه پاک می‌شود. حساب و نوبت‌های بیمار می‌ماند.`}
        {" "}این کار برگشت ندارد.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="soft" onClick={() => setConfirm(null)}>انصراف</Button>
        <Button variant="danger" icon="trash" loading={removing} onClick={remove}>{confirm === "patient" ? "حذف بیمار" : "حذف پرونده"}</Button>
      </div>
    </Modal>
  );

  const adminActions = isAdmin ? (
    <div className="relative flex flex-wrap gap-2 sm:ms-auto">
      {record ? <Button variant="outline" size="sm" icon="trash" onClick={() => setConfirm("record")}>حذف پرونده</Button> : null}
      {!staffAccount ? <Button variant="outline" size="sm" icon="trash" onClick={() => setConfirm("patient")}>حذف بیمار</Button> : null}
    </div>
  ) : null;

  const header = (
    <section className="mesh-dark grain relative mb-6 overflow-hidden rounded-[2rem] p-5 text-paper md:p-8">
      <Link href="/staff/patients" className="relative mb-5 inline-flex items-center gap-1.5 text-sm text-paper/60 transition hover:text-paper"><Icon name="arrow" size={16} className="-scale-x-100" />فهرست بیماران</Link>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
        <Avatar name={user.fullName} size={68} />
        <div className="min-w-0 w-full sm:w-auto sm:flex-1">
          <h1 className="text-2xl font-bold md:text-3xl">{user.fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-paper/70">
            <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-paper"><Icon name="phone" size={15} />{formatPhone(user.phone)}</a>
            {user.roles.map((role) => <span key={role} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{ROLE[role] ?? role}</span>)}
            <span className="text-xs">عضو از {formatDateOnly(user.createdAt)}</span>
          </div>
        </div>
        {record ? <HeaderRing record={record} /> : null}
        {adminActions}
      </div>
    </section>
  );

  if (!record) {
    return (
      <div>
        {header}
        {confirmModal}
        <div className="card mx-auto max-w-xl p-8 text-center md:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft text-accent"><Icon name="file" size={30} /></span>
          <h2 className="mt-5 text-xl font-bold">{isPatient ? "این بیمار هنوز پرونده ندارد" : "برای این کاربر پرونده‌ای نیست"}</h2>
          <p className="mt-2 leading-8 text-muted">با ساختن پرونده، همه بخش‌های اطلاعات بیمار، معاینه و امور مطب بر اساس نقش شما باز می‌شود.</p>
          <div className="mt-6"><ErrorNote>{error}</ErrorNote></div>
          <Button size="lg" icon="plus" loading={creating} onClick={create} className="mt-2">ساخت پرونده</Button>
        </div>
      </div>
    );
  }

  const alerts = Array.isArray((record.values as Record<string, unknown>).alerts) ? ((record.values as Record<string, unknown>).alerts as string[]) : [];
  const save = (patch: RecordPatch) => api(`${base}/record`, { method: "PATCH", body: JSON.stringify(patch) }).then(() => load());
  const showClinic = access.clinic || Boolean(record.ledger);

  return (
    <div>
      {header}
      {confirmModal}
      {error ? <div className="mb-4"><ErrorNote>{error}</ErrorNote></div> : null}

      {alerts.length ? (
        <div className="pop mb-6 flex flex-wrap items-center gap-2 rounded-3xl border border-bad/25 bg-bad-soft px-5 py-3.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-bad"><Icon name="bell" size={16} />هشدار پزشکی</span>
          {alerts.map((alert) => <Badge key={alert} tone="bad">{alert}</Badge>)}
        </div>
      ) : null}

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: "patient", label: "اطلاعات بیمار", icon: "user" },
          { id: "clinical", label: "معاینه و درمان", icon: "stethoscope" },
          { id: "clinic", label: "امور مطب", icon: "wallet", hidden: !showClinic },
          { id: "files", label: "تصاویر", icon: "image", badge: record.attachments.length || undefined },
          { id: "history", label: "تاریخچه", icon: "clock" },
        ]}
      />

      <div key={tab} className="page-in">
        {tab === "patient" ? (
          <>
            <SectionForm section="patient" values={record.values} editable={access.patient} onSave={save} />
          </>
        ) : null}

        {tab === "clinical" ? (
          <div className="space-y-8">
            <div>
              <SectionForm section="clinical" values={record.values} editable={access.clinical} onSave={save} />
            </div>
            <Card>
              <h2 className="mb-4 font-semibold">نقشه دندان‌ها</h2>
              <Odontogram
                editable={access.clinical}
                teeth={record.teeth}
                onSave={async (tooth: { fdi: number; condition: ToothCondition; note?: string }) => {
                  await api(`${base}/teeth`, { method: "POST", body: JSON.stringify(tooth) });
                  await load();
                }}
              />
            </Card>
            <div>
              <h2 className="mb-3 font-semibold">یادداشت ویزیت‌ها</h2>
              <VisitTimeline
                visits={record.visits}
                canAdd={access.clinical}
                onAdd={async (body, internal) => {
                  await api(`${base}/visits`, { method: "POST", body: JSON.stringify({ body, internal }) });
                  await load();
                }}
              />
            </div>
          </div>
        ) : null}

        {tab === "clinic" && showClinic ? (
          <div className="space-y-8">
            <div>
              <SectionForm section="clinic" values={record.values} editable={access.clinic} onSave={save} />
            </div>
            {record.ledger ? (
              <div>
                <h2 className="mb-3 font-semibold">حساب مالی</h2>
                <LedgerPanel
                  ledger={record.ledger}
                  onAdd={async (entry) => {
                    await api(`${base}/ledger`, { method: "POST", body: JSON.stringify(entry) });
                    await load();
                  }}
                  onRemove={async (id) => {
                    await api(`${base}/ledger/${id}`, { method: "DELETE" });
                    await load();
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "files" ? (
          <AttachmentGrid
            files={record.attachments}
            canRemove
            onUpload={async (file, caption) => {
              const form = new FormData();
              form.set("file", file);
              if (caption) form.set("caption", caption);
              await api(`${base}/attachments`, { method: "POST", body: form });
              await load();
            }}
            onRemove={async (id) => {
              await api(`${base}/attachments/${id}`, { method: "DELETE" });
              await load();
            }}
          />
        ) : null}

        {tab === "history" ? <AuditList audits={data.audits} /> : null}
      </div>
    </div>
  );
}

function HeaderRing({ record }: { record: NonNullable<RecordDetail["record"]> }) {
  const completion = patientCompletion(record.values);
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white/10 p-3 pe-5 backdrop-blur">
      <Ring percent={completion.percent} size={64} />
      <div>
        <p className="text-[11px] text-paper/60">پرونده شماره</p>
        <p className="text-xl font-bold">{faDigits(String(record.fileNo))}</p>
      </div>
    </div>
  );
}
