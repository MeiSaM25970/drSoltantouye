"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CONSULTATION_STATUS_LABEL, TOPIC_LABEL, type ConsultationTopic } from "@clinic/shared";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { Avatar, Button, ErrorNote, Skeleton, StatusPill, TextArea } from "@/components/ui";
import { ApiError, api, mediaUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/jalali";

type Message = { id: string; body: string; imageUrl?: string | null; createdAt: string; author: { id?: string; fullName: string } };
type Thread = {
  id: string;
  topic: ConsultationTopic;
  status: keyof typeof CONSULTATION_STATUS_LABEL;
  patient?: { id?: string; fullName: string };
  messages: Message[];
};

export function ConsultationThread({ staff = false }: { staff?: boolean }) {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  async function load() {
    setThread(await api<Thread>(`/consultations/${params.id}`));
  }

  useEffect(() => {
    void load().catch((cause) => setError(cause.message));
    const timer = window.setInterval(() => void load().catch(() => undefined), 20000);
    return () => window.clearInterval(timer);
  }, [params.id]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages.length]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("body", body);
    const file = fileRef.current?.files?.[0];
    if (file) form.set("image", file);
    setPending(true);
    setError("");
    try {
      setThread(await api<Thread>(`/consultations/${params.id}/messages`, { method: "POST", body: form }));
      setBody("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "پیام ارسال نشد");
    } finally {
      setPending(false);
    }
  }

  if (!thread) return error ? <ErrorNote>{error}</ErrorNote> : <div className="space-y-3"><Skeleton className="h-12 w-60" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

  const back = staff ? "/staff/consultations" : "/account/consultations";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={back} aria-label="بازگشت" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface transition hover:border-ink/30"><Icon name="arrow" size={18} className="-scale-x-100" /></Link>
          <div>
            <h1 className="text-xl font-bold">مشاوره {TOPIC_LABEL[thread.topic]}{staff && thread.patient ? ` · ${thread.patient.fullName}` : ""}</h1>
            <p className="text-xs text-muted">این گفتگو جای ویزیت حضوری نیست.</p>
          </div>
        </div>
        <StatusPill value={thread.status} label={CONSULTATION_STATUS_LABEL[thread.status]} />
      </div>

      <div className="space-y-4">
        {thread.messages.map((message, index) => {
          const mine = message.author.id ? message.author.id === user?.id : false;
          return (
            <div key={message.id} className={`pop flex items-end gap-2.5 ${mine ? "flex-row" : "flex-row-reverse"}`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <Avatar name={message.author.fullName} size={34} tone={mine ? "accent" : "ink"} />
              <div className={`max-w-[82%] rounded-3xl px-5 py-3.5 shadow-soft ${mine ? "rounded-br-lg bg-ink text-paper" : "rounded-bl-lg border border-line bg-surface"}`}>
                <p className={`text-[11px] ${mine ? "text-paper/60" : "text-muted"}`}>{message.author.fullName} · {formatDateTime(message.createdAt)}</p>
                <p className="mt-1 whitespace-pre-line leading-8">{message.body}</p>
                {message.imageUrl ? <a href={mediaUrl(message.imageUrl)} target="_blank" rel="noreferrer"><img src={mediaUrl(message.imageUrl)} alt="" className="mt-3 max-h-72 rounded-2xl" /></a> : null}
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {thread.status !== "CLOSED" || staff ? (
        <form onSubmit={send} className="glass sticky bottom-20 mt-6 space-y-3 rounded-[1.75rem] border border-line p-3 shadow-lift md:bottom-4">
          <TextArea value={body} onChange={(event) => setBody(event.target.value)} required placeholder={staff ? "پاسخ به بیمار" : "پیام بعدی"} className="min-h-20 border-transparent bg-surface" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm text-muted transition hover:bg-sunk">
              <Icon name="image" size={18} />{fileName || "افزودن عکس"}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            </label>
            <div className="flex gap-2">
              {staff ? (
                <Button type="button" variant="soft" onClick={async () => {
                  setThread(await api(`/consultations/${params.id}`, { method: "PATCH", body: JSON.stringify({ status: thread.status === "CLOSED" ? "OPEN" : "CLOSED" }) }));
                }}>
                  {thread.status === "CLOSED" ? "باز کردن" : "بستن مشاوره"}
                </Button>
              ) : null}
              <Button type="submit" loading={pending} icon="send">ارسال</Button>
            </div>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </form>
      ) : <p className="mt-6 rounded-2xl bg-sunk px-4 py-3 text-center text-sm text-muted">این مشاوره بسته شده است. برای سؤال تازه، مشاوره جدید بسازید.</p>}
    </div>
  );
}
