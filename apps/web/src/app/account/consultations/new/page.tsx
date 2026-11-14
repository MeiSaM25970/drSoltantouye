"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TOPIC_LABEL, faDigits, type ConsultationTopic } from "@clinic/shared";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { Icon, type IconName } from "@/components/icons";
import { Button, ErrorNote, PageIntro, TextArea } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

const topicIcons: Record<ConsultationTopic, IconName> = { PAIN: "heart", COSMETIC: "sparkle", ORTHO: "tooth", EMERGENCY: "bell", OTHER: "chat" };

export default function NewConsultationPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [topic, setTopic] = useState<ConsultationTopic>("PAIN");
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const captcha = useRef<CaptchaHandle>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("topic", topic);
    form.set("body", body);
    const proof = captcha.current?.values();
    form.set("captchaToken", proof?.captchaToken ?? "");
    form.set("captchaAnswer", proof?.captchaAnswer ?? "");
    const file = fileRef.current?.files?.[0];
    if (file) form.set("image", file);
    setPending(true);
    setError("");
    try {
      const created = await api<{ id: string }>("/consultations", { method: "POST", body: form });
      router.push(`/account/consultations/${created.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "ارسال نشد");
      captcha.current?.refresh();
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-7">
      <PageIntro title="سؤال از مطب" text="شرح را واضح بنویسید و اگر عکس دارید ضمیمه کنید. تشخیص قطعی فقط در معاینه حضوری ممکن است." />

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-2">موضوع</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {(Object.keys(TOPIC_LABEL) as ConsultationTopic[]).map((key) => {
            const on = topic === key;
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => setTopic(key)} className={`flex flex-col items-center gap-2 rounded-3xl border px-3 py-4 text-sm transition duration-300 active:scale-95 ${on ? "border-accent bg-accent-soft font-medium text-accent-deep shadow-glow" : "border-line bg-surface hover:border-ink/30"}`}>
                <Icon name={topicIcons[key]} size={22} className={on ? "text-accent" : "text-muted"} />
                {TOPIC_LABEL[key]}
              </button>
            );
          })}
        </div>
        {topic === "EMERGENCY" ? <p className="pop mt-3 rounded-2xl bg-bad-soft px-4 py-3 text-sm leading-7 text-bad">برای درد شدید، تورم صورت یا تب بهتر است تلفنی با مطب تماس بگیرید یا به مرکز اورژانس مراجعه کنید.</p> : null}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-medium text-ink-2">شرح مشکل</h2><span className="text-xs text-muted">{faDigits(String(body.length))} / {faDigits("4000")}</span></div>
        <TextArea value={body} onChange={(event) => setBody(event.target.value)} required minLength={5} maxLength={4000} className="min-h-40" placeholder="از کی شروع شده؟ دقیقاً کجاست؟ دارو مصرف کرده‌اید؟" />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-2">عکس، اگر لازم است</h2>
        <label className="group flex cursor-pointer items-center gap-4 rounded-3xl border border-dashed border-line bg-surface px-5 py-4 transition hover:border-accent hover:bg-accent-soft/40">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent transition group-hover:scale-110"><Icon name="upload" /></span>
          <span className="min-w-0 text-sm"><b className="block truncate">{fileName || "انتخاب عکس"}</b><span className="text-xs text-muted">jpg، png یا webp</span></span>
          <input ref={fileRef} name="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
        </label>
      </section>

      <Captcha ref={captcha} className="max-w-md" />
      <ErrorNote>{error}</ErrorNote>
      <Button loading={pending} type="submit" size="lg" icon="send">ارسال مشاوره</Button>
    </form>
  );
}
