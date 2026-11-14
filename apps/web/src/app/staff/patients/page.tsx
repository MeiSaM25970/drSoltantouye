"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { faDigits, formatPhone, normalizePhone } from "@clinic/shared";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { CountUp } from "@/components/motion";
import { Modal, Tabs, useToast } from "@/components/interactive";
import { Avatar, Badge, Button, Empty, ErrorNote, Field, ListSkeleton, PageIntro, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatDateOnly } from "@/lib/jalali";

type UserRow = {
  id: string;
  fullName: string;
  phone: string;
  roles: string[];
  createdAt: string;
  patientProfile: { record: { id: string; fileNo: number; fileStatus: string } | null } | null;
};
type Summary = { patients: number; withRecord: number; withoutRecord: number; newThisWeek: number; staff: number };

const ROLE: Record<string, string> = { PATIENT: "بیمار", SECRETARY: "منشی", DENTIST: "دندانپزشک", ADMIN: "مدیر" };

function AddPatient({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<null | { id: string; fullName: string; phone: string; tempPassword: string | null }>(null);

  function close() {
    setCreated(null);
    setError("");
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={created ? "بیمار ثبت شد" : "افزودن بیمار"}>
      {created ? (
        <div className="space-y-5">
          <div className="rounded-3xl bg-ok-soft p-5 text-center">
            <span className="pop mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok text-white"><Icon name="check" size={26} strokeWidth={2.6} /></span>
            <b className="mt-3 block">{created.fullName}</b>
            <span className="text-sm text-muted">{formatPhone(created.phone)}</span>
          </div>
          {created.tempPassword ? (
            <div className="rounded-3xl border border-dashed border-warn/40 bg-warn-soft p-4">
              <p className="text-sm leading-7 text-warn">رمز موقت فقط همین یک بار نمایش داده می‌شود. آن را به بیمار بدهید تا بعد از ورود عوض کند.</p>
              <div className="mt-3 flex items-center gap-2">
                <code dir="ltr" className="flex-1 select-all rounded-2xl bg-surface px-4 py-3 text-center text-lg font-semibold tracking-wider">{created.tempPassword}</code>
                <Button variant="soft" onClick={() => { void navigator.clipboard?.writeText(created.tempPassword ?? ""); toast("رمز کپی شد"); }}>کپی</Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button icon="file" onClick={() => router.push(`/staff/patients/${created.id}`)}>باز کردن پرونده</Button>
            <Button variant="ghost" onClick={close}>بستن</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            setError("");
            try {
              const password = String(form.get("password") || "");
              setCreated(await api("/patients", { method: "POST", body: JSON.stringify({ fullName: form.get("fullName"), phone: normalizePhone(String(form.get("phone"))), password: password || undefined }) }));
            } catch (cause) {
              setError(cause instanceof ApiError ? cause.message : "ثبت نشد");
            } finally {
              setPending(false);
            }
          }}
        >
          <p className="text-sm leading-7 text-muted">برای بیماری که حضوری آمده. حساب و پرونده خالی همزمان ساخته می‌شود و بعد می‌توانید همه اطلاعات را پر کنید.</p>
          <Field label="نام و نام خانوادگی"><TextInput name="fullName" required minLength={3} autoFocus /></Field>
          <Field label="شماره موبایل"><TextInput name="phone" required ltr inputMode="tel" placeholder="09111234567" /></Field>
          <Field label="رمز ورود" hint="خالی بگذارید تا رمز موقت ساخته شود"><TextInput name="password" ltr minLength={8} autoComplete="new-password" /></Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" loading={pending} icon="plus" className="w-full">ثبت بیمار و ساخت پرونده</Button>
        </form>
      )}
    </Modal>
  );
}

function List() {
  const params = useSearchParams();
  const { user } = useAuth();
  const canCreate = Boolean(user?.roles.some((role) => role === "SECRETARY" || role === "ADMIN"));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(params.get("filter") ?? "all");
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [add, setAdd] = useState(false);

  useEffect(() => {
    void api<Summary>("/patients/summary").then(setSummary).catch(() => undefined);
  }, [add]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void api<UserRow[]>(`/patients?q=${encodeURIComponent(query)}&filter=${filter}`).then(setRows).catch(() => setRows([]));
    }, 220);
    return () => clearTimeout(handle);
  }, [query, filter, add]);

  return (
    <div>
      <PageIntro
        title="بیماران و پرونده‌ها"
        text="همه کاربران ثبت‌شده در یک فهرست. روی هر نفر بزنید تا پرونده‌اش باز شود یا ساخته شود."
        action={canCreate ? <Button icon="plus" onClick={() => setAdd(true)}>افزودن بیمار</Button> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "بیمار", value: summary?.patients, tone: "text-ink" },
          { label: "دارای پرونده", value: summary?.withRecord, tone: "text-ok" },
          { label: "بدون پرونده", value: summary?.withoutRecord, tone: "text-warn" },
          { label: "جدید این هفته", value: summary?.newThisWeek, tone: "text-accent-deep" },
        ].map((item) => (
          <div key={item.label} className="card px-5 py-4">
            <span className={`block text-3xl font-bold ${item.tone}`}>{item.value === undefined ? <span className="skeleton inline-block h-8 w-10 rounded-lg align-middle" /> : <CountUp value={item.value} />}</span>
            <span className="text-sm text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Tabs
          variant="pill"
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "همه" },
            { id: "patients", label: "بیماران" },
            { id: "noRecord", label: "بدون پرونده" },
            { id: "withRecord", label: "دارای پرونده" },
            { id: "staff", label: "تیم مطب" },
          ]}
        />
        <div className="relative md:w-72">
          <Icon name="search" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام یا شماره موبایل" className="ps-11" />
        </div>
      </div>

      {!rows ? <ListSkeleton /> : null}
      {rows && rows.length === 0 ? <Empty icon="users" title="کسی پیدا نشد" text="عبارت جست‌وجو یا فیلتر را عوض کنید." action={canCreate ? <Button icon="plus" onClick={() => setAdd(true)}>افزودن بیمار</Button> : undefined} /> : null}
      <div key={filter} className="space-y-2.5">
        {rows?.map((row, index) => {
          const record = row.patientProfile?.record;
          const isPatient = row.roles.includes("PATIENT");
          return (
            <Link key={row.id} href={`/staff/patients/${row.id}`} style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }} className="card card-hover pop group flex items-center gap-4 p-3.5 md:p-4">
              <Avatar name={row.fullName} size={46} tone={isPatient ? "accent" : "ink"} />
              <span className="min-w-0 flex-1">
                <b className="block truncate">{row.fullName}</b>
                <span className="text-sm text-muted">{formatPhone(row.phone)}</span>
              </span>
              <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                {row.roles.filter((role) => role !== "PATIENT").map((role) => <Badge key={role} tone="info">{ROLE[role] ?? role}</Badge>)}
                {record ? <Badge tone="ok"><Icon name="file" size={12} />پرونده {faDigits(String(record.fileNo))}</Badge> : isPatient ? <Badge tone="warn">بدون پرونده</Badge> : null}
              </span>
              <span className="hidden text-xs text-muted lg:block">{formatDateOnly(row.createdAt)}</span>
              <Icon name="chevron" size={18} className="shrink-0 text-muted transition group-hover:-translate-x-1" />
            </Link>
          );
        })}
      </div>
      <AddPatient open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List />
    </Suspense>
  );
}
