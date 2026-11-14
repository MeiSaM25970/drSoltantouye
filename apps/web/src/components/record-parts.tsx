"use client";

import { FormEvent, useRef, useState } from "react";
import { formatToman } from "@clinic/shared";
import { ApiError, mediaUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/jalali";
import type { RecordDetail } from "@/lib/record-types";
import { Badge, Button, Empty, ErrorNote, Field, MoneyInput, Select, TextArea, TextInput } from "./ui";
import { Icon } from "./icons";
import { ConfirmButton, Modal, useToast } from "./interactive";

type Rec = NonNullable<RecordDetail["record"]>;

/* ───────── visit notes ───────── */

export function VisitTimeline({ visits, canAdd, onAdd }: { visits: Rec["visits"]; canAdd?: boolean; onAdd?: (body: string, internal: boolean) => Promise<void> }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();
  return (
    <div className="space-y-5">
      {canAdd && onAdd ? (
        <form
          className="card space-y-3 p-5"
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formEl = event.currentTarget;
            const form = new FormData(formEl);
            setPending(true);
            setError("");
            try {
              await onAdd(String(form.get("body")), form.get("internal") === "on");
              formEl.reset();
              toast("یادداشت ثبت شد");
            } catch (cause) {
              setError(cause instanceof ApiError ? cause.message : "ثبت نشد");
            } finally {
              setPending(false);
            }
          }}
        >
          <Field label="یادداشت ویزیت"><TextArea name="body" required minLength={2} placeholder="شرح درمان، توصیه‌ها، نوبت بعدی..." /></Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm"><input name="internal" type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--color-accent)]" />فقط برای مطب (بیمار نمی‌بیند)</label>
            <Button type="submit" loading={pending} icon="plus">ثبت یادداشت</Button>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </form>
      ) : null}

      {visits.length === 0 ? <Empty icon="clipboard" title="یادداشتی ثبت نشده" text="یادداشت‌های ویزیت و توصیه‌های پزشک اینجا دیده می‌شود." /> : null}

      <ol className="relative space-y-4 ps-6 before:absolute before:inset-y-2 before:start-[0.45rem] before:w-px before:bg-line">
        {visits.map((visit, index) => (
          <li key={visit.id} className="pop relative" style={{ animationDelay: `${index * 60}ms` }}>
            <span className={`absolute -start-6 top-5 h-3 w-3 rounded-full border-2 border-paper ${visit.internal ? "bg-muted" : "bg-accent"}`} />
            <article className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>{visit.author.fullName} · {formatDateTime(visit.createdAt)}</span>
                {visit.internal ? <Badge><Icon name="lock" size={12} />داخلی</Badge> : <Badge tone="accent"><Icon name="eye" size={12} />قابل دیدن برای بیمار</Badge>}
              </div>
              <p className="mt-3 whitespace-pre-line leading-8">{visit.body}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────── attachments ───────── */

export function AttachmentGrid({
  files,
  onUpload,
  onRemove,
  canRemove,
  emptyText = "تصویر یا رادیوگرافی هنوز اضافه نشده.",
}: {
  files: Rec["attachments"];
  onUpload?: (file: File, caption: string) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  canRemove?: boolean;
  emptyText?: string;
}) {
  const [preview, setPreview] = useState<Rec["attachments"][number] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const toast = useToast();

  return (
    <div className="space-y-5">
      {onUpload ? (
        <form
          className="card flex flex-wrap items-end gap-3 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const file = input.current?.files?.[0];
            if (!file) return setError("اول یک تصویر انتخاب کنید");
            const caption = String(new FormData(event.currentTarget).get("caption") ?? "");
            setPending(true);
            setError("");
            try {
              await onUpload(file, caption);
              if (input.current) input.current.value = "";
              setName("");
              (event.target as HTMLFormElement).reset();
              toast("تصویر اضافه شد");
            } catch (cause) {
              setError(cause instanceof ApiError ? cause.message : "بارگذاری نشد");
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="group flex min-w-52 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-paper px-4 py-3 transition hover:border-accent hover:bg-accent-soft/40">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:scale-110"><Icon name="upload" /></span>
            <span className="min-w-0 text-sm"><b className="block truncate">{name || "انتخاب تصویر"}</b><span className="text-xs text-muted">jpg، png یا webp تا ۲۵ مگابایت</span></span>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setName(event.target.files?.[0]?.name ?? "")} />
          </label>
          <div className="min-w-44 flex-1"><TextInput name="caption" placeholder="شرح کوتاه، اختیاری" maxLength={120} /></div>
          <Button type="submit" loading={pending} icon="upload">افزودن</Button>
          {error ? <div className="w-full"><ErrorNote>{error}</ErrorNote></div> : null}
        </form>
      ) : null}

      {files.length === 0 ? <Empty icon="image" title="تصویری نیست" text={emptyText} /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {files.map((file, index) => (
          <figure key={file.id} className="pop group relative overflow-hidden rounded-3xl bg-sunk" style={{ animationDelay: `${index * 50}ms` }}>
            <button onClick={() => setPreview(file)} className="shot block w-full" aria-label={file.caption || "نمایش تصویر"}>
              <img src={mediaUrl(file.url)} alt={file.caption || ""} loading="lazy" className="aspect-square w-full object-cover" />
            </button>
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/75 to-transparent p-3 pt-8 text-xs text-white">
              <span className="min-w-0 truncate">{file.caption || formatDateTime(file.createdAt)}</span>
              {file.byPatient ? <Badge tone="accent">بیمار</Badge> : null}
            </figcaption>
            {canRemove && onRemove ? (
              <span className="absolute end-2 top-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <ConfirmButton icon="trash" onConfirm={() => onRemove(file.id)} variant="soft">حذف</ConfirmButton>
              </span>
            ) : null}
          </figure>
        ))}
      </div>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.caption || "تصویر پرونده"} wide>
        {preview ? <img src={mediaUrl(preview.url)} alt={preview.caption || ""} className="max-h-[70vh] w-full rounded-2xl object-contain" /> : null}
      </Modal>
    </div>
  );
}

/* ───────── ledger ───────── */

export function LedgerPanel({ ledger, onAdd, onRemove }: { ledger: NonNullable<Rec["ledger"]>; onAdd: (entry: { kind: "CHARGE" | "PAYMENT"; title: string; amount: number }) => Promise<void>; onRemove: (id: string) => Promise<void> }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="جمع هزینه‌ها" value={formatToman(ledger.charged)} />
        <Summary label="پرداخت‌شده" value={formatToman(ledger.paid)} tone="ok" />
        <Summary label={ledger.balance > 0 ? "مانده بدهکاری" : ledger.balance < 0 ? "اضافه‌پرداخت" : "تسویه"} value={formatToman(Math.abs(ledger.balance))} tone={ledger.balance > 0 ? "bad" : "ok"} />
      </div>

      <form
        className="card grid gap-3 p-5 md:grid-cols-[9rem_1fr_11rem_auto] md:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          const formEl = event.currentTarget;
          const form = new FormData(formEl);
          const amount = Number(String(form.get("amount")).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[^\d]/g, ""));
          setPending(true);
          setError("");
          try {
            await onAdd({ kind: form.get("kind") as "CHARGE" | "PAYMENT", title: String(form.get("title")), amount });
            formEl.reset();
            toast("ردیف مالی ثبت شد");
          } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "ثبت نشد");
          } finally {
            setPending(false);
          }
        }}
      >
        <Field label="نوع"><Select name="kind" defaultValue="CHARGE" options={[{ value: "CHARGE", label: "هزینه درمان" }, { value: "PAYMENT", label: "پرداخت بیمار" }]} /></Field>
        <Field label="شرح"><TextInput name="title" required minLength={2} maxLength={120} placeholder="مثلاً جرم‌گیری" /></Field>
        <Field label="مبلغ (تومان)"><MoneyInput name="amount" required placeholder="1,500,000" /></Field>
        <Button type="submit" loading={pending} icon="plus">ثبت</Button>
        {error ? <div className="md:col-span-4"><ErrorNote>{error}</ErrorNote></div> : null}
      </form>

      {ledger.entries.length === 0 ? <Empty icon="wallet" title="ردیف مالی ثبت نشده" text="هزینه درمان و پرداخت‌های بیمار اینجا ثبت می‌شود." /> : null}
      <ul className="space-y-2">
        {ledger.entries.map((entry) => (
          <li key={entry.id} className="card flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${entry.kind === "PAYMENT" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}><Icon name={entry.kind === "PAYMENT" ? "check" : "wallet"} size={18} /></span>
              <div className="min-w-0">
                <p className="truncate font-medium">{entry.title}</p>
                <p className="text-xs text-muted">{entry.kind === "PAYMENT" ? "پرداخت" : "هزینه"} · {formatDateTime(entry.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <b className={entry.kind === "PAYMENT" ? "text-ok" : ""}>{entry.kind === "PAYMENT" ? "−" : "+"}{formatToman(entry.amount)}</b>
              <ConfirmButton icon="trash" onConfirm={() => onRemove(entry.id)}>حذف</ConfirmButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : ""}`}>{value}</p>
    </div>
  );
}

/* ───────── history ───────── */

export function AuditList({ audits }: { audits: RecordDetail["audits"] }) {
  if (!audits.length) return <Empty icon="clock" title="سابقه‌ای نیست" text="تغییرات پرونده اینجا ثبت می‌شود." />;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {audits.map((audit) => (
        <li key={audit.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3.5 text-sm">
          <span className="leading-7">{audit.detail}</span>
          <span className="text-xs text-muted">{audit.actor?.fullName ?? "مطب"} · {formatDateTime(audit.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
