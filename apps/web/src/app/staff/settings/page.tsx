"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CLINIC_SEED } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { ConfirmButton, Tabs, useToast } from "@/components/interactive";
import { Button, Card, ErrorNote, Field, PageIntro, Skeleton, TextArea, TextInput } from "@/components/ui";
import { BrandMark } from "@/components/brand";
import { ApiError, api } from "@/lib/api";

type Clinic = typeof CLINIC_SEED;
type Faq = { id: string; question: string; answer: string };

const groups: { id: string; label: string; fields: { key: keyof Clinic; label: string; area?: boolean; ltr?: boolean }[] }[] = [
  {
    id: "hero",
    label: "صفحه اول",
    fields: [
      { key: "name", label: "نام مرکز" },
      { key: "tagline", label: "عنوان کوتاه" },
      { key: "heroTitle", label: "تیتر صفحه اول" },
      { key: "heroLead", label: "توضیح صفحه اول", area: true },
    ],
  },
  {
    id: "about",
    label: "درباره پزشک",
    fields: [
      { key: "doctorName", label: "نام پزشک" },
      { key: "about", label: "درباره", area: true },
    ],
  },
  {
    id: "contact",
    label: "تماس و آدرس",
    fields: [
      { key: "address", label: "آدرس", area: true },
      { key: "phone1", label: "تلفن اول", ltr: true },
      { key: "phone2", label: "تلفن دوم", ltr: true },
      { key: "instagram", label: "آی‌دی اینستاگرام", ltr: true },
      { key: "hoursNote", label: "ساعت کاری روی سایت", area: true },
    ],
  },
];

export default function SettingsPage() {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [tab, setTab] = useState("hero");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void api<Clinic>("/clinic").then(setClinic);
    void api<Faq[]>("/faqs/manage").then(setFaqs);
  }, []);

  if (!clinic) return <div className="space-y-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-72" /></div>;
  const group = groups.find((item) => item.id === tab);

  async function changeLogo(file: File | undefined) {
    if (!file) return;
    setLogoBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      setClinic(await api<Clinic>("/clinic/logo", { method: "POST", body }));
      toast("لوگو عوض شد");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "لوگو بارگذاری نشد");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    try {
      setClinic(await api<Clinic>("/clinic/logo", { method: "DELETE" }));
      toast("لوگوی پیش‌فرض برگشت", "info");
      router.refresh();
    } finally {
      setLogoBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const body = Object.fromEntries(group!.fields.map((field) => [field.key, form.get(field.key)]));
      setClinic(await api("/clinic", { method: "PATCH", body: JSON.stringify(body) }));
      toast("تنظیمات ذخیره شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ذخیره نشد");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageIntro title="تنظیمات صفحه اول" text="متن‌های سایت از همین‌جا عوض می‌شود و بعد از ذخیره در صفحه اول دیده می‌شود." />
      <Tabs className="mb-6" value={tab} onChange={setTab} items={[...groups.map((item) => ({ id: item.id, label: item.label })), { id: "logo", label: "لوگو", icon: "image" as const }, { id: "faq", label: "پرسش‌های رایج", icon: "chat" as const }]} />

      <div key={tab} className="page-in">
        {group ? (
          <form onSubmit={save} className="card max-w-3xl space-y-5 p-6">
            {group.fields.map((field) => (
              <Field key={field.key} label={field.label}>
                {field.area ? <TextArea name={field.key} defaultValue={clinic[field.key] as string} /> : <TextInput name={field.key} defaultValue={clinic[field.key] as string} ltr={field.ltr} />}
              </Field>
            ))}
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" loading={pending} icon="check">ذخیره</Button>
          </form>
        ) : tab === "logo" ? (
          <div className="card max-w-3xl space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-5">
              <BrandMark size={96} logoUrl={clinic.logoUrl} />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">لوگوی مطب</h2>
                <p className="mt-1 text-sm leading-7 text-muted">لوگو در هدر، منوی پنل‌ها، فوتر و صفحه ورود دیده می‌شود. عکس مربعی یا با زمینه شفاف، jpg، png یا webp تا ۲۵ مگابایت.</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void changeLogo(event.target.files?.[0])} />
            <ErrorNote>{error}</ErrorNote>
            <div className="flex flex-wrap gap-3">
              <Button type="button" loading={logoBusy} icon="upload" onClick={() => fileRef.current?.click()}>{clinic.logoUrl ? "تعویض لوگو" : "بارگذاری لوگو"}</Button>
              {clinic.logoUrl ? <ConfirmButton icon="trash" label="لوگوی پیش‌فرض برگردد؟" onConfirm={removeLogo}>برگشت به لوگوی پیش‌فرض</ConfirmButton> : null}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {faqs.map((faq) => (
              <Card key={faq.id} className="flex items-start justify-between gap-4">
                <div><b>{faq.question}</b><p className="mt-1 text-sm leading-7 text-muted">{faq.answer}</p></div>
                <ConfirmButton icon="trash" label="حذف شود" onConfirm={async () => { await api(`/faqs/${faq.id}`, { method: "DELETE" }); setFaqs(await api("/faqs/manage")); toast("حذف شد", "info"); }}>حذف</ConfirmButton>
              </Card>
            ))}
            <form
              className="card space-y-3 p-5"
              onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const formEl = event.currentTarget;
                const form = new FormData(formEl);
                setAdding(true);
                try {
                  await api("/faqs", { method: "POST", body: JSON.stringify({ question: form.get("question"), answer: form.get("answer") }) });
                  setFaqs(await api("/faqs/manage"));
                  formEl.reset();
                  toast("پرسش اضافه شد");
                } finally {
                  setAdding(false);
                }
              }}
            >
              <h2 className="flex items-center gap-2 font-semibold"><Icon name="plus" size={18} className="text-accent" />پرسش تازه</h2>
              <TextInput name="question" required placeholder="پرسش" minLength={3} />
              <TextArea name="answer" required placeholder="پاسخ" />
              <Button type="submit" loading={adding} icon="plus">افزودن پرسش</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
