"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ConfirmButton, Switch, useToast } from "@/components/interactive";
import { Badge, Button, Card, Empty, ErrorNote, PageIntro, Skeleton, TextInput } from "@/components/ui";
import { ApiError, api, mediaUrl } from "@/lib/api";

type Item = { id: string; kind: "IMAGE" | "VIDEO"; url: string; caption: string; published: boolean; sortOrder: number };

export default function GalleryAdminPage() {
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setItems(await api<Item[]>("/gallery/manage"));
  }
  useEffect(() => {
    void load().catch(() => setItems([]));
  }, []);

  async function sync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncing(true);
    setError("");
    try {
      const result = await api<{ imported: number; updated: number; failed: number }>("/gallery/sync", { method: "POST", body: JSON.stringify({ token: token || undefined }) });
      toast(`${result.imported} پست تازه، ${result.updated} به‌روز، ${result.failed} ناموفق`);
      setToken("");
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "همگام‌سازی نشد");
    } finally {
      setSyncing(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setUploading(true);
    setError("");
    try {
      await api("/gallery", { method: "POST", body: new FormData(formEl) });
      formEl.reset();
      setFileName("");
      toast("در صفحه اول گذاشته شد");
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "بارگذاری نشد");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageIntro title="گالری و پست‌ها" text="فایل و کپشن روی همین سایت ذخیره می‌شود تا بدون اینستاگرام هم باز شود." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold"><Icon name="instagram" size={18} className="text-accent" />آوردن از اینستاگرام</h2>
          <p className="mt-2 text-sm leading-7 text-muted">حساب باید حرفه‌ای باشد. توکن بلندمدت با دسترسی instagram_business_basic را اینجا بگذارید یا در متغیر INSTAGRAM_ACCESS_TOKEN سرور قرار دهید.</p>
          <form onSubmit={sync} className="mt-4 flex flex-wrap items-center gap-3">
            <TextInput value={token} onChange={(event) => setToken(event.target.value)} type="password" placeholder="توکن اینستاگرام" className="min-w-0 flex-1" autoComplete="off" ltr />
            <Button type="submit" loading={syncing} icon="upload">آوردن پست‌ها</Button>
          </form>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-semibold"><Icon name="image" size={18} className="text-accent" />آپلود دستی</h2>
          <form onSubmit={upload} className="mt-4 space-y-3">
            <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-paper px-4 py-3 transition hover:border-accent hover:bg-accent-soft/40">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:scale-110"><Icon name="upload" /></span>
              <span className="min-w-0 text-sm"><b className="block truncate">{fileName || "انتخاب عکس یا ویدیو"}</b><span className="text-xs text-muted">jpg، png، webp، mp4 یا webm</span></span>
              <input ref={fileRef} name="file" type="file" required accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2"><TextInput name="caption" placeholder="شرح کوتاه" /><TextInput name="instagramUrl" placeholder="لینک پست، اختیاری" ltr /></div>
            <Button type="submit" loading={uploading} icon="plus">گذاشتن در صفحه اول</Button>
          </form>
        </Card>
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>

      <h2 className="mb-4 mt-9 font-semibold">همه پست‌ها</h2>
      {!items ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div> : null}
      {items?.length === 0 ? <Empty icon="image" title="هنوز پستی نیست" text="از بالا فایل بگذارید یا از اینستاگرام بیاورید." /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((item, index) => (
          <article key={item.id} style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }} className="card pop overflow-hidden">
            <div className="relative aspect-[4/3] bg-sunk">
              {item.kind === "VIDEO" ? <video src={mediaUrl(item.url)} className="h-full w-full object-cover" muted /> : <img src={mediaUrl(item.url)} alt={item.caption} className={`h-full w-full object-cover transition ${item.published ? "" : "opacity-40 grayscale"}`} />}
              <div className="absolute start-3 top-3 flex gap-1.5">{item.kind === "VIDEO" ? <Badge tone="info">ویدیو</Badge> : null}{item.published ? null : <Badge tone="warn">مخفی</Badge>}</div>
            </div>
            <div className="p-4">
              <p className="line-clamp-2 min-h-12 text-sm leading-6">{item.caption || <span className="text-muted">بدون شرح</span>}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-muted"><Switch label="نمایش" checked={item.published} onChange={async (value) => { await api(`/gallery/${item.id}`, { method: "PATCH", body: JSON.stringify({ published: value }) }); await load(); }} />نمایش</label>
                <div className="flex gap-1.5">
                  <Button variant="soft" size="sm" aria-label="بالاتر" disabled={index === 0} onClick={async () => {
                    const swap = items[index - 1];
                    await api(`/gallery/${item.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: swap.sortOrder }) });
                    await api(`/gallery/${swap.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: item.sortOrder }) });
                    await load();
                  }}><Icon name="arrowUp" size={16} /></Button>
                  <ConfirmButton variant="ghost" icon="trash" label="حذف شود" onConfirm={async () => { await api(`/gallery/${item.id}`, { method: "DELETE" }); toast("حذف شد", "info"); await load(); }}>حذف</ConfirmButton>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
