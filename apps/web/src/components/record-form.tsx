"use client";

import { useEffect, useMemo, useState } from "react";
import {
  faDigits,
  emptyValue,
  groupsOf,
  isFilled,
  optionLabel,
  type RecordField,
  type RecordPatch,
  type RecordSection,
  type RecordValue,
  type RecordValues,
} from "@clinic/shared";
import { ApiError } from "@/lib/api";
import { formatIsoDate } from "@/lib/jalali";
import { Badge, Button, ErrorNote, Select, TextArea, TextInput } from "./ui";
import { control } from "./control-style";
import { Icon } from "./icons";
import { ChipGroup, JalaliDateField, Switch, TagInput, useToast } from "./interactive";

function same(a: RecordValue | undefined, b: RecordValue | undefined) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function SectionForm({
  section,
  values,
  editable,
  onSave,
}: {
  section: RecordSection;
  values: RecordValues;
  editable: boolean;
  onSave: (patch: RecordPatch) => Promise<void>;
}) {
  const toast = useToast();
  const groups = useMemo(
    () => groupsOf(section).map((group) => ({ ...group, fields: group.fields.filter((field) => field.key in values) })).filter((group) => group.fields.length),
    [section, values],
  );
  const [draft, setDraft] = useState<RecordValues>(values);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(values);
  }, [values]);

  const changed = useMemo(
    () => groups.flatMap((group) => group.fields).filter((field) => !same(draft[field.key], values[field.key])).map((field) => field.key),
    [groups, draft, values],
  );
  const dirty = editable && changed.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!groups.length) return null;

  async function save() {
    setPending(true);
    setError("");
    try {
      const patch: Record<string, RecordValue> = {};
      for (const key of changed) patch[key] = draft[key] ?? "";
      await onSave(patch as RecordPatch);
      toast("تغییرات ذخیره شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ذخیره نشد. دوباره تلاش کنید");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.title} className="card p-5 md:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold"><span className="h-4 w-1 rounded-full bg-accent" />{group.title}</h3>
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.key} className={field.wide ? "md:col-span-2" : ""}>
                <FieldControl
                  field={field}
                  value={draft[field.key] ?? emptyValue(field)}
                  editable={editable}
                  onChange={(next) => setDraft((current) => ({ ...current, [field.key]: next }))}
                  dirty={changed.includes(field.key)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {dirty ? (
        <div className="pop sticky bottom-20 z-30 md:bottom-5">
          <div className="glass mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full border border-line px-3 py-2.5 shadow-lift ps-5">
            <p className="text-sm"><span className="font-semibold text-accent-deep">{faDigits(String(changed.length))}</span> تغییر ذخیره نشده</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="soft" onClick={() => setDraft(values)}>انصراف</Button>
              <Button type="button" size="sm" loading={pending} onClick={save} icon="check">ذخیره</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldControl({ field, value, editable, onChange, dirty }: { field: RecordField; value: RecordValue; editable: boolean; onChange: (value: RecordValue) => void; dirty: boolean }) {
  if (!editable) return <ReadOnly field={field} value={value} />;

  const label = (
    <span className="flex items-center gap-2">
      {field.label}
      {dirty ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="تغییر کرده" /> : null}
    </span>
  );
  const hint = field.hint;

  switch (field.kind) {
    case "text":
      return (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          <TextInput ltr={field.ltr} inputMode={field.ltr ? "numeric" : undefined} maxLength={field.max} placeholder={field.placeholder} value={String(value)} onChange={(event) => onChange(event.target.value)} />
          {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
        </label>
      );
    case "textarea":
      return (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          <TextArea maxLength={field.max} placeholder={field.placeholder} value={String(value)} onChange={(event) => onChange(event.target.value)} className="min-h-24" />
          {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
        </label>
      );
    case "select":
      return (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          <Select value={String(value)} onChange={onChange} options={field.options ?? []} allowClear />
        </label>
      );
    case "date":
      return (
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          <JalaliDateField value={String(value)} onChange={onChange} yearsBack={field.key === "birthDate" ? 100 : 1} yearsAhead={field.key === "birthDate" ? 0 : 3} />
        </div>
      );
    case "multi":
      return (
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-2">{label}</span>
          <ChipGroup options={field.options ?? []} value={value as string[]} onChange={onChange} />
          {hint ? <span className="mt-2 block text-xs text-muted">{hint}</span> : null}
        </div>
      );
    case "toggle":
      return (
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          <div className={`${control} flex items-center justify-between gap-4`}>
            <span className={value ? "font-medium text-ok" : "text-muted"}>{value ? "بله" : "خیر"}</span>
            <Switch checked={Boolean(value)} onChange={onChange} label={field.label} />
          </div>
        </div>
      );
    case "list":
      return (
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          <TagInput value={value as string[]} onChange={onChange} />
          {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
        </div>
      );
  }
}

function ReadOnly({ field, value }: { field: RecordField; value: RecordValue }) {
  let body: React.ReactNode;
  if (!isFilled(value) && field.kind !== "toggle") {
    body = <span className="text-muted/60">ثبت نشده</span>;
  } else if (field.kind === "select") {
    body = optionLabel(field, String(value));
  } else if (field.kind === "date") {
    body = formatIsoDate(String(value));
  } else if (field.kind === "multi") {
    body = (
      <span className="flex flex-wrap gap-1.5">
        {(value as string[]).map((item) => <Badge key={item} tone="accent">{optionLabel(field, item)}</Badge>)}
      </span>
    );
  } else if (field.kind === "list") {
    body = (
      <span className="flex flex-wrap gap-1.5">
        {(value as string[]).map((item) => <Badge key={item} tone="warn">{item}</Badge>)}
      </span>
    );
  } else if (field.kind === "toggle") {
    body = value ? <Badge tone="ok"><Icon name="check" size={12} />بله</Badge> : <Badge>خیر</Badge>;
  } else {
    body = <span className={`whitespace-pre-line ${field.ltr ? "ltr-field inline-block" : ""}`}>{String(value)}</span>;
  }
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{field.label}</p>
      <div className="text-[15px] leading-7">{body}</div>
    </div>
  );
}