"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CONTENT_FIELDS, CONTENT_GROUPS, resolveContent, type ContentField, type ContentGroupId } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { ConfirmButton, Tabs, useToast } from "@/components/interactive";
import { Button, ButtonLink, ErrorNote, Field, PageIntro, Skeleton, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { siteImage } from "@/lib/photos";

type Overrides = Record<string, string>;
type ClinicWithContent = { content?: Overrides };

export default function ContentPage() {
  const toast = useToast();
  const router = useRouter();
  const [overrides, setOverrides] = useState<Overrides | null>(null);
  const [group, setGroup] = useState<ContentGroupId>("hero");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    void api<ClinicWithContent>("/clinic").then((clinic) => setOverrides(clinic.content ?? {}));
  }, []);

  if (!overrides) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-80" /></div>;

  const values = resolveContent(overrides);
  const info = CONTENT_GROUPS.find((item) => item.id === group)!;
  const fields = CONTENT_FIELDS.filter((field) => field.group === group);
  const images = fields.filter((field) => field.kind === "image");
  const texts = fields.filter((field) => field.kind !== "image");

  function applied(next: ClinicWithContent) {
    setOverrides(next.content ?? {});
    router.refresh();
  }

  async function saveTexts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const body = Object.fromEntries(texts.map((field) => [field.key, String(form.get(field.key) ?? "")]));
      applied(await api<ClinicWithContent>("/clinic/content", { method: "PUT", body: JSON.stringify({ values: body }) }));
      toast("متن‌ها ذخیره شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ذخیره نشد");
    } finally {
      setPending(false);
    }
  }

  async function upload(field: ContentField, file: File | undefined) {
    if (!file) return;
    setBusyKey(field.key);
    setError("");
    try {
      const body = new FormData();
      body.append("key", field.key);
      body.append("file", file);
      applied(await api<ClinicWithContent>("/clinic/content/image", { method: "POST", body }));
      toast("عکس عوض شد");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "عکس بارگذاری نشد");
    } finally {
      setBusyKey("");
    }
  }

  async function reset(field: ContentField) {
    setBusyKey(field.key);
    try {
      applied(await api<ClinicWithContent>(`/clinic/content/${encodeURIComponent(field.key)}`, { method: "DELETE" }));
      toast("عکس پیش‌فرض برگشت", "info");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div>
      <PageIntro
        title="تصویر و متن صفحه اول"
        text="هر عکس و عنوانی که در صفحه اول می‌بینید از همین‌جا عوض می‌شود. عکس هر خدمت را در صفحه «خدمات» عوض کنید."
        action={<ButtonLink href="/" variant="ghost" icon="home">دیدن سایت</ButtonLink>}
      />
      <Tabs className="mb-6" value={group} onChange={(id) => { setError(""); setGroup(id as ContentGroupId); }} items={CONTENT_GROUPS.map((item) => ({ id: item.id, label: item.label }))} />

      <div key={group} className="page-in space-y-6">
        <p className="text-sm leading-7 text-muted">{info.hint}</p>
        <ErrorNote>{error}</ErrorNote>

        {images.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((field) => (
              <ImageCard
                key={field.key}
                field={field}
                src={values[field.key]}
                custom={Boolean(overrides[field.key])}
                busy={busyKey === field.key}
                onPick={(file) => void upload(field, file)}
                onReset={() => reset(field)}
              />
            ))}
          </div>
        ) : null}

        {texts.length ? (
          <form onSubmit={saveTexts} className="card max-w-3xl space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {texts.map((field) => (
                <Field key={`${group}-${field.key}`} label={field.label} className={field.kind === "textarea" ? "sm:col-span-2" : ""}>
                  {field.kind === "textarea" ? (
                    <TextArea name={field.key} defaultValue={values[field.key]} maxLength={400} />
                  ) : (
                    <TextInput name={field.key} defaultValue={values[field.key]} maxLength={120} />
                  )}
                </Field>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">متن خالی یا برابر پیش‌فرض، همان متن اصلی سایت را برمی‌گرداند.</p>
              <Button type="submit" loading={pending} icon="check">ذخیره متن‌ها</Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function ImageCard({ field, src, custom, busy, onPick, onReset }: { field: ContentField; src: string; custom: boolean; busy: boolean; onPick: (file: File | undefined) => void; onReset: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[4/3] bg-sunk">
        <img src={siteImage(src)} alt={field.label} className="h-full w-full object-cover" />
        {busy ? <div className="absolute inset-0 grid place-items-center bg-ink/40 text-sm text-white backdrop-blur-sm">در حال بارگذاری…</div> : null}
        {custom ? <span className="absolute start-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] text-white">عکس شما</span> : null}
      </div>
      <div className="p-4">
        <p className="font-semibold">{field.label}</p>
        {field.hint ? <p className="mt-1 text-xs text-muted">{field.hint}</p> : null}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { onPick(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" icon="upload" loading={busy} onClick={() => input.current?.click()}>{custom ? "تعویض عکس" : "بارگذاری عکس"}</Button>
          {custom ? <ConfirmButton icon="trash" label="عکس پیش‌فرض برگردد؟" onConfirm={onReset}>پیش‌فرض</ConfirmButton> : null}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted"><Icon name="image" size={12} />jpg، png یا webp تا ۲۵ مگابایت</p>
      </div>
    </article>
  );
}
