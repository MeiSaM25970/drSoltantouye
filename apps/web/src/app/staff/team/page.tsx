"use client";

import { FormEvent, useEffect, useState } from "react";
import { ROLE_LABEL, formatPhone, normalizePhone, type Role } from "@clinic/shared";
import { ChipGroup, Modal, Switch, useToast } from "@/components/interactive";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Badge, Button, Empty, ErrorNote, Field, ListSkeleton, PageIntro, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

type Row = { id: string; fullName: string; phone: string; roles: Role[]; telegramAllowed?: boolean };
const staffRoles = (["SECRETARY", "DENTIST", "ADMIN"] as Role[]).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

export default function TeamPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<string[]>(["SECRETARY"]);
  const [pending, setPending] = useState(false);

  async function load() {
    setRows(await api<Row[]>("/patients?q=&filter=staff"));
  }
  useEffect(() => {
    void load().catch(() => setRows([]));
  }, []);

  async function patch(row: Row, body: object, done: string) {
    try {
      await api(`/users/${row.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast(done);
      await load();
    } catch (cause) {
      toast(cause instanceof ApiError ? cause.message : "تغییر ذخیره نشد", "bad");
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!roles.length) return setError("حداقل یک نقش انتخاب کنید");
    setPending(true);
    setError("");
    try {
      await api("/users/staff", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: normalizePhone(String(form.get("phone"))),
          password: form.get("password"),
          roles,
          specialty: roles.includes("DENTIST") ? form.get("specialty") || undefined : undefined,
          telegramAllowed: form.get("telegramAllowed") === "on",
        }),
      });
      toast("عضو تازه ساخته شد");
      setOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ساخته نشد");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageIntro title="تیم مطب" text="منشی، پزشک و مدیر را اینجا می‌سازید. بیمار خودش ثبت‌نام می‌کند یا منشی او را از بخش بیماران اضافه می‌کند." action={<Button icon="plus" onClick={() => { setError(""); setOpen(true); }}>عضو تازه</Button>} />
      {!rows ? <ListSkeleton /> : null}
      {rows && rows.length === 0 ? <Empty icon="users" title="هنوز عضوی نیست" text="اولین عضو تیم را اضافه کنید." /> : null}
      <div className="space-y-3">
        {rows?.map((row, index) => (
          <article key={row.id} style={{ animationDelay: `${index * 50}ms` }} className="card pop p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={row.fullName} size={48} tone="ink" />
              <div className="min-w-0 flex-1">
                <b className="block">{row.fullName}</b>
                <span className="text-sm text-muted">{formatPhone(row.phone)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">{row.roles.filter((role) => role !== "PATIENT").map((role) => <Badge key={role} tone="info">{ROLE_LABEL[role]}</Badge>)}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
              <ChipGroup
                disabled={row.id === me?.id}
                options={staffRoles}
                value={row.roles}
                onChange={(next) => next.length && patch(row, { roles: next.concat(row.roles.includes("PATIENT") ? ["PATIENT"] : []) }, "نقش‌ها ذخیره شد")}
              />
              <label className="flex items-center gap-2 text-sm text-muted"><Switch label="اعلان تلگرام" checked={Boolean(row.telegramAllowed)} onChange={(value) => patch(row, { telegramAllowed: value }, value ? "تلگرام باز شد" : "تلگرام بسته شد")} />اعلان تلگرام</label>
            </div>
          </article>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="عضو تازه تیم">
        <form className="space-y-4" onSubmit={add}>
          <Field label="نام و نام خانوادگی"><TextInput name="fullName" required minLength={3} autoFocus /></Field>
          <Field label="شماره موبایل"><TextInput name="phone" required ltr inputMode="tel" placeholder="09111234567" /></Field>
          <Field label="رمز موقت" hint="حداقل ۸ کاراکتر. بعد از ورود می‌تواند عوض کند."><TextInput name="password" required minLength={8} ltr autoComplete="new-password" /></Field>
          <Field label="نقش"><ChipGroup options={staffRoles} value={roles} onChange={setRoles} /></Field>
          {roles.includes("DENTIST") ? <Field label="تخصص"><TextInput name="specialty" placeholder="مثلاً ایمپلنت و جراحی" /></Field> : null}
          <label className="flex items-center gap-2 text-sm"><input name="telegramAllowed" type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" />اجازه اتصال تلگرام</label>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" loading={pending} icon="plus" className="w-full">افزودن به تیم</Button>
        </form>
      </Modal>
    </div>
  );
}
