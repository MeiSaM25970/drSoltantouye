"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { faDigits } from "@clinic/shared";
import { Modal, Switch, useToast } from "@/components/interactive";
import { Badge, Button, Empty, ErrorNote, Field, ListSkeleton, PageIntro, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { serviceImageOf } from "@/lib/photos";

type Service = { id: string; title: string; summary: string; description: string; durationMin: number; published: boolean; slug: string; imageUrl: string };

export default function ServicesAdminPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Service[] | null>(null);
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setRows(await api<Service[]>("/services/manage"));
  }
  useEffect(() => {
    void load().catch(() => setRows([]));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { title: form.get("title"), summary: form.get("summary"), description: form.get("description"), durationMin: Number(form.get("durationMin")) };
    setPending(true);
    setError("");
    try {
      if (editing === "new") await api("/services", { method: "POST", body: JSON.stringify(body) });
      else if (editing) await api(`/services/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast(editing === "new" ? "خدمت اضافه شد" : "خدمت ذخیره شد");
      setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ذخیره نشد");
    } finally {
      setPending(false);
    }
  }

  const current = editing && editing !== "new" ? editing : null;

  async function changeImage(file: File | undefined) {
    if (!file || !current) return;
    setImageBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const updated = await api<Service>(`/services/${current.id}/image`, { method: "POST", body });
      setEditing({ ...current, imageUrl: updated.imageUrl });
      toast("عکس خدمت عوض شد");
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "عکس بارگذاری نشد");
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearImage() {
    if (!current) return;
    setImageBusy(true);
    try {
      await api(`/services/${current.id}/image`, { method: "DELETE" });
      setEditing({ ...current, imageUrl: "" });
      toast("عکس پیش‌فرض برگشت", "info");
      await load();
    } finally {
      setImageBusy(false);
    }
  }
  return (
    <div>
      <PageIntro title="خدمات" text="خدمت تازه به همه پزشک‌های فعال وصل می‌شود. خدمت مخفی در سایت و نوبت‌گیری دیده نمی‌شود." action={<Button icon="plus" onClick={() => { setError(""); setEditing("new"); }}>خدمت تازه</Button>} />
      {!rows ? <ListSkeleton /> : null}
      {rows?.length === 0 ? <Empty icon="tooth" title="خدمتی تعریف نشده" text="اولین خدمت را اضافه کنید." /> : null}
      <div className="space-y-3">
        {rows?.map((service, index) => (
          <article key={service.id} style={{ animationDelay: `${index * 45}ms` }} className={`card card-hover pop flex flex-wrap items-center gap-4 p-4 md:p-5 ${service.published ? "" : "opacity-70"}`}>
            <img src={serviceImageOf(service).src} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><b>{service.title}</b><Badge>{faDigits(String(service.durationMin))} دقیقه</Badge>{service.published ? null : <Badge tone="warn">مخفی</Badge>}</div>
              <p className="mt-1 line-clamp-1 text-sm text-muted">{service.summary}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted"><Switch label="نمایش در سایت" checked={service.published} onChange={async (value) => { await api(`/services/${service.id}`, { method: "PATCH", body: JSON.stringify({ published: value }) }); toast(value ? "خدمت منتشر شد" : "خدمت مخفی شد"); await load(); }} />نمایش در سایت</label>
            <Button variant="soft" size="sm" icon="settings" onClick={() => { setError(""); setEditing(service); }}>ویرایش</Button>
          </article>
        ))}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={current ? "ویرایش خدمت" : "خدمت تازه"}>
        <form key={current?.id ?? "new"} className="space-y-4" onSubmit={submit}>
          {current ? (
            <div className="flex items-center gap-4 rounded-2xl bg-paper p-3">
              <img src={serviceImageOf(current).src} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">عکس خدمت</p>
                <p className="mt-0.5 text-xs text-muted">در صفحه اول، صفحه خدمات و صفحه خود خدمت دیده می‌شود.</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void changeImage(event.target.files?.[0])} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="soft" icon="upload" loading={imageBusy} onClick={() => fileRef.current?.click()}>{current.imageUrl ? "تعویض عکس" : "بارگذاری عکس"}</Button>
                  {current.imageUrl ? <Button type="button" size="sm" variant="ghost" icon="trash" onClick={() => void clearImage()}>پیش‌فرض</Button> : null}
                </div>
              </div>
            </div>
          ) : null}
          <Field label="عنوان"><TextInput name="title" required defaultValue={current?.title} /></Field>
          <Field label="مدت (دقیقه)"><TextInput name="durationMin" type="number" min={15} step={15} required defaultValue={current?.durationMin ?? 30} ltr /></Field>
          <Field label="خلاصه"><TextInput name="summary" required defaultValue={current?.summary} /></Field>
          <Field label="توضیح کامل"><TextArea name="description" required defaultValue={current?.description} /></Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" loading={pending} icon="check" className="w-full">ذخیره</Button>
        </form>
      </Modal>
    </div>
  );
}
