"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Brand } from "./brand";
import { Icon } from "./icons";
import { control } from "./ui";

export function AuthLayout({ image, title, lead, perks, children }: { image: string; title: string; lead: string; perks: string[]; children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-stretch gap-6 px-4 py-6 md:px-6 md:py-10 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden rounded-[2.5rem] lg:block">
        <img src={image} alt="" className="ken absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
        <div className="orb-a absolute -top-10 start-10 h-48 w-48 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10 text-paper">
          <Brand tone="light" />
          <div>
            <h2 className="rise max-w-sm text-3xl font-bold leading-[1.5]">{title}</h2>
            <p className="rise mt-3 max-w-sm leading-8 text-paper/70" style={{ "--d": "100ms" } as React.CSSProperties}>{lead}</p>
            <ul className="mt-6 grid gap-3">
              {perks.map((perk, index) => (
                <li key={perk} className="rise flex items-center gap-3 text-sm" style={{ "--d": `${250 + index * 120}ms` } as React.CSSProperties}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white"><Icon name="check" size={14} strokeWidth={2.4} /></span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
      <div className="flex items-center">
        <div className="card rise w-full p-6 sm:p-9">{children}</div>
      </div>
    </div>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${control} ltr-field pl-12 pr-4`} />
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
        className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-sunk hover:text-ink"
      >
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
}

export function StrengthBar({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
  const labels = ["", "ضعیف", "متوسط", "خوب", "قوی"];
  const colors = ["bg-line", "bg-bad", "bg-warn", "bg-info", "bg-ok"];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${score >= step ? colors[score] : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-1.5 h-4 text-xs text-muted">{password ? `قدرت رمز: ${labels[score] || "ضعیف"}` : "حداقل ۸ کاراکتر"}</p>
    </div>
  );
}
