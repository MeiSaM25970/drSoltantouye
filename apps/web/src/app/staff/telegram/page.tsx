"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { Switch, useToast } from "@/components/interactive";
import { Badge, Button, Card, PageIntro, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

type Status = {
  allowed: boolean;
  connected: boolean;
  botUsername: string | null;
  preferences: { appointmentCreated: boolean; appointmentCancelled: boolean; consultationCreated: boolean; consultationMessage: boolean };
};
type Outbox = { id: string; event: string; text: string; status: string; lastError?: string | null };

const labels = {
  appointmentCreated: "نوبت جدید",
  appointmentCancelled: "لغو نوبت",
  consultationCreated: "مشاوره جدید",
  consultationMessage: "پیام تازه در مشاوره",
};

export default function TelegramPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [link, setLink] = useState<{ url: string | null; code: string } | null>(null);
  const [outbox, setOutbox] = useState<Outbox[]>([]);

  async function load() {
    setStatus(await api<Status>("/telegram"));
    if (user?.roles.includes("ADMIN")) setOutbox(await api<Outbox[]>("/telegram/outbox"));
  }
  useEffect(() => {
    if (user) void load();
  }, [user]);

  if (!status) return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-40" /></div>;

  async function toggle(key: keyof Status["preferences"], value: boolean) {
    const next = { ...status!.preferences, [key]: value };
    setStatus({ ...status!, preferences: next });
    setStatus(await api<Status>("/telegram/preferences", { method: "PATCH", body: JSON.stringify(next) }));
    toast("ذخیره شد");
  }

  return (
    <div className="max-w-2xl">
      <PageIntro title="تلگرام" text="نوبت و مشاوره تازه را بلافاصله در تلگرام ببینید." />
      {!status.allowed ? (
        <p className="rounded-3xl bg-warn-soft px-5 py-4 text-sm leading-7 text-warn">مدیر هنوز اجازه اتصال تلگرام را برای شما باز نکرده است.</p>
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center gap-4">
            <span className={`grid h-14 w-14 place-items-center rounded-2xl ${status.connected ? "bg-ok-soft text-ok" : "bg-sunk text-muted"}`}><Icon name="telegram" size={26} /></span>
            <div className="min-w-0 flex-1">
              <b>{status.connected ? "متصل است" : "متصل نیست"}</b>
              <p className="text-sm text-muted">{status.connected ? "اعلان‌ها به همین گفتگو می‌رود." : "با یک لینک کوتاه ربات را وصل کنید."}</p>
            </div>
            <Button icon="send" onClick={async () => setLink(await api("/telegram/connect", { method: "POST" }))}>{status.connected ? "اتصال دوباره" : "ساخت لینک اتصال"}</Button>
            {status.connected ? <Button variant="ghost" onClick={async () => { setStatus(await api("/telegram/disconnect", { method: "POST" })); setLink(null); toast("اتصال قطع شد", "info"); }}>قطع اتصال</Button> : null}
          </Card>

          {link ? (
            <div className="pop rounded-3xl border border-dashed border-accent/40 bg-accent-soft p-5 text-sm leading-8">
              {link.url ? <a href={link.url} target="_blank" rel="noreferrer" className="link-underline break-all font-medium text-accent-deep">باز کردن ربات در تلگرام</a> : <>کد را برای ربات بفرستید: <code dir="ltr" className="rounded-lg bg-surface px-2 py-1">/start {link.code}</code></>}
              {!status.botUsername ? <p className="mt-2 text-xs text-muted">نام ربات روی سرور تنظیم نشده است و تا آن زمان فقط کد ساخته می‌شود.</p> : null}
            </div>
          ) : null}

          <Card>
            <h2 className="mb-4 font-semibold">رویدادهایی که می‌خواهم ببینم</h2>
            <div className="space-y-4">
              {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{labels[key]}</span>
                  <Switch label={labels[key]} checked={status.preferences[key]} onChange={(value) => toggle(key, value)} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {user?.roles.includes("ADMIN") ? (
        <section className="mt-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">صندوق ارسال</h2>
            <Button variant="soft" size="sm" onClick={async () => { setOutbox(await api("/telegram/outbox/retry", { method: "POST" })); toast("ارسال دوباره انجام شد"); }}>تلاش دوباره</Button>
          </div>
          {outbox.length === 0 ? <p className="card px-5 py-5 text-sm text-muted">پیام در صف نیست.</p> : null}
          <div className="space-y-2.5">
            {outbox.map((item) => (
              <article key={item.id} className="card p-4 text-sm">
                <div className="flex items-center gap-2"><Badge tone={item.status === "SENT" ? "ok" : item.status === "FAILED" ? "bad" : "warn"}>{item.status}</Badge><span className="text-muted">{item.event}</span></div>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-ink-2">{item.text}</p>
                {item.lastError ? <p className="mt-1 text-bad">{item.lastError}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
