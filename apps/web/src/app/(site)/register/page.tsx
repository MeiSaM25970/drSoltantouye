"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizePhone } from "@clinic/shared";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { AuthLayout, PasswordInput, StrengthBar } from "@/components/auth-ui";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { Button, ErrorNote, Field, TextInput } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const captcha = useRef<CaptchaHandle>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: normalizePhone(String(form.get("phone") ?? "")),
          password: form.get("password"),
          ...captcha.current?.values(),
        }),
      });
      await refresh();
      router.push("/account");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ثبت‌نام انجام نشد");
      captcha.current?.refresh();
      setPending(false);
    }
  }

  return (
    <AuthLayout
      image="/photos/light.jpg"
      title="چند ثانیه تا اولین نوبت."
      lead="بعد از ثبت‌نام می‌توانید پرونده سلامت خودتان را هم کامل کنید تا ویزیت سریع‌تر شود."
      perks={["ثبت‌نام رایگان", "بدون پرداخت اینترنتی", "پرونده را خودتان کامل می‌کنید"]}
    >
      <form method="post" onSubmit={onSubmit} className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold">ثبت‌نام بیمار</h1>
          <p className="mt-2 text-sm leading-7 text-muted">فقط نام، موبایل و یک رمز.</p>
        </div>
        <Field label="نام و نام خانوادگی"><TextInput name="fullName" autoComplete="name" required minLength={3} autoFocus /></Field>
        <Field label="شماره موبایل"><TextInput name="phone" ltr inputMode="tel" autoComplete="tel" required placeholder="09111234567" /></Field>
        <div>
          <Field label="رمز عبور"><PasswordInput name="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          <StrengthBar password={password} />
        </div>
        <Captcha ref={captcha} />
        <ErrorNote>{error}</ErrorNote>
        <Button loading={pending} type="submit" size="lg" className="w-full">ساخت حساب</Button>
        <p className="text-center text-sm text-muted">قبلاً آمده‌اید؟ <Link className="link-underline font-medium text-ink" href="/login">ورود</Link></p>
      </form>
    </AuthLayout>
  );
}
