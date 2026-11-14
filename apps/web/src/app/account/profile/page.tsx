"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@clinic/shared";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { PasswordInput, StrengthBar } from "@/components/auth-ui";
import { useToast } from "@/components/interactive";
import { Avatar, Badge, Button, Card, ErrorNote, Field, PageIntro, TextInput } from "@/components/ui";

const ROLE: Record<string, string> = { PATIENT: "بیمار", SECRETARY: "منشی", DENTIST: "دندانپزشک", ADMIN: "مدیر" };

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("/auth/me", { method: "PATCH", body: JSON.stringify({ fullName: form.get("fullName"), password: password || undefined }) });
      await refresh();
      setPassword("");
      toast("مشخصات ذخیره شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ذخیره نشد");
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageIntro title="مشخصات حساب" text="شماره موبایل شناسه ورود شماست و تغییر نمی‌کند." />
      <Card className="mb-5 flex items-center gap-4">
        <Avatar name={user.fullName} size={60} />
        <div className="min-w-0">
          <b className="block truncate text-lg">{user.fullName}</b>
          <span className="text-sm text-muted">{formatPhone(user.phone)}</span>
          <div className="mt-2 flex flex-wrap gap-1.5">{user.roles.map((role) => <Badge key={role} tone={role === "PATIENT" ? "neutral" : "accent"}>{ROLE[role] ?? role}</Badge>)}</div>
        </div>
      </Card>
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="نام و نام خانوادگی"><TextInput name="fullName" defaultValue={user.fullName} required minLength={3} /></Field>
        <Field label="رمز جدید" hint="اگر نمی‌خواهید عوض شود خالی بگذارید">
          <PasswordInput name="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {password ? <StrengthBar password={password} /> : null}
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" loading={pending} icon="check">ذخیره تغییرات</Button>
      </form>
      <Card className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div><b>خروج از حساب</b><p className="text-sm text-muted">روی این دستگاه از حساب خارج می‌شوید.</p></div>
        <Button variant="outline" icon="logout" onClick={async () => { await logout(); router.replace("/"); }}>خروج</Button>
      </Card>
    </div>
  );
}
