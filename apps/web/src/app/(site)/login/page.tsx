"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { normalizePhone } from "@clinic/shared";
import { ApiError, api, safeNext } from "@/lib/api";
import { isStaff, useAuth } from "@/components/auth-provider";
import { AuthLayout, PasswordInput } from "@/components/auth-ui";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { Button, ErrorNote, Field, TextInput } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const captcha = useRef<CaptchaHandle>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const profile = await api<{ roles: string[] }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: normalizePhone(String(form.get("phone") ?? "")), password: form.get("password"), ...captcha.current?.values() }),
      });
      await refresh();
      router.push(safeNext(params.get("next"), isStaff(profile.roles) ? "/staff" : "/account"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ورود انجام نشد");
      captcha.current?.refresh();
      setPending(false);
    }
  }

  return (
    <AuthLayout
      image="/photos/clinic.jpg"
      title="به مطب دکتر سلطان‌طویه خوش آمدید."
      lead="نوبت، مشاوره و پرونده‌تان در یک حساب."
      perks={["نوبت بدون پرداخت اینترنتی", "پاسخ مشاوره در همین حساب", "پرونده و طرح درمان شما"]}
    >
      <form method="post" onSubmit={onSubmit} className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold">ورود</h1>
          <p className="mt-2 text-sm leading-7 text-muted">با شماره موبایل و رمزی که ساخته‌اید وارد شوید.</p>
        </div>
        <Field label="شماره موبایل">
          <TextInput name="phone" ltr inputMode="tel" autoComplete="tel" required placeholder="09111234567" autoFocus />
        </Field>
        <Field label="رمز عبور">
          <PasswordInput name="password" autoComplete="current-password" required />
        </Field>
        <Captcha ref={captcha} />
        <ErrorNote>{error}</ErrorNote>
        <Button loading={pending} type="submit" size="lg" className="w-full">ورود به حساب</Button>
        <p className="text-center text-sm text-muted">حساب ندارید؟ <Link className="link-underline font-medium text-ink" href="/register">ثبت‌نام</Link></p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
