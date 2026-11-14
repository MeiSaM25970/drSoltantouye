"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "./icons";

export type CaptchaHandle = {
  /** Fields the API expects next to the form data. */
  values: () => { captchaToken: string; captchaAnswer: string };
  /** True once five digits are typed. */
  ready: () => boolean;
  /** Fetches a fresh picture and clears the answer. Call it after any failed submit. */
  refresh: () => void;
};

type Issued = { token: string; svg: string; expiresIn: number };

const toLatin = (value: string) => value.replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 0x0660)).replace(/\D/g, "").slice(0, 5);

export const Captcha = forwardRef<CaptchaHandle, { className?: string }>(function Captcha({ className = "" }, ref) {
  const [issued, setIssued] = useState<Issued | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [turn, setTurn] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setAnswer("");
    try {
      setIssued(await api<Issued>("/captcha"));
      setTurn((value) => value + 1);
    } catch {
      setIssued(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!issued) return;
    const timer = window.setTimeout(() => void load(), Math.max(10, issued.expiresIn - 15) * 1000);
    return () => window.clearTimeout(timer);
  }, [issued, load]);

  useImperativeHandle(
    ref,
    () => ({
      values: () => ({ captchaToken: issued?.token ?? "", captchaAnswer: answer }),
      ready: () => Boolean(issued) && answer.length === 5,
      refresh: () => void load(),
    }),
    [issued, answer, load],
  );

  const done = answer.length === 5;
  return (
    <div className={`rounded-3xl border border-line bg-paper p-3 ${className}`}>
      <div className="mb-2.5 flex items-center justify-between px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5 font-medium text-ink-2"><Icon name="shield" size={15} className="text-accent" />کد امنیتی</span>
        <button type="button" onClick={() => void load()} disabled={loading} className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition hover:bg-sunk hover:text-ink disabled:opacity-60" aria-label="گرفتن تصویر تازه">
          <Icon name="refresh" size={14} className={loading ? "animate-spin" : "transition duration-500 group-hover:rotate-180"} />
          تصویر تازه
        </button>
      </div>

      <div className="relative mx-auto aspect-[240/88] w-full max-w-[18rem] overflow-hidden rounded-2xl border border-line/70 bg-surface">
        {issued ? (
          <img
            key={turn}
            src={`data:image/svg+xml;utf8,${encodeURIComponent(issued.svg)}`}
            alt="کد ۵ رقمی داخل تصویر"
            draggable={false}
            className="pop h-full w-full select-none"
          />
        ) : failed ? (
          <button type="button" onClick={() => void load()} className="grid h-full w-full place-items-center text-sm text-bad">تصویر بارگذاری نشد. دوباره بزنید</button>
        ) : null}
        {loading && !issued ? <div className="skeleton absolute inset-0" /> : null}
        {loading && issued ? <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px]" /> : null}
      </div>

      <div className="relative mt-2.5">
        <input
          name="captchaAnswer"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={5}
          value={answer}
          onChange={(event) => setAnswer(toLatin(event.target.value))}
          placeholder="کد داخل تصویر"
          aria-label="کد داخل تصویر"
          className={`w-full rounded-2xl border bg-surface px-4 py-3 text-center text-lg font-semibold tracking-[0.55em] outline-none transition duration-300 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-accent focus:shadow-glow ${done ? "border-ok/60" : "border-line"}`}
        />
        <span className={`pointer-events-none absolute end-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-ok text-white transition duration-300 ${done ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
          <Icon name="check" size={14} strokeWidth={2.6} />
        </span>
      </div>
    </div>
  );
});
