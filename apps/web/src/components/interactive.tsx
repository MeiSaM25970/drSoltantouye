"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import jalaali from "jalaali-js";
import { faDigits } from "@clinic/shared";
import { Icon, type IconName } from "./icons";
import { Button } from "./ui";
import { control } from "./control-style";
import { Select } from "./fields";
import { JALALI_MONTHS, currentJalali } from "@/lib/jalali";

/* ───────── toast ───────── */

type Toast = { id: number; message: string; tone: "ok" | "bad" | "info" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  const tones = { ok: "bg-ink text-paper", bad: "bg-bad text-white", info: "bg-info text-white" };
  const icons: Record<Toast["tone"], IconName> = { ok: "check", bad: "x", info: "bell" };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-5 py-3 text-sm shadow-lift [animation:toast-in_0.45s_var(--ease-spring)_both] ${tones[item.tone]}`}>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20"><Icon name={icons[item.tone]} size={12} strokeWidth={2.4} /></span>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ───────── modal / sheet ───────── */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="بستن" className="fade absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full overflow-auto rounded-t-[2rem] bg-surface p-6 shadow-lift [animation:sheet-in_0.5s_var(--ease-out-expo)_both] md:rounded-[2rem] md:p-8 ${wide ? "md:max-w-2xl" : "md:max-w-md"}`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-full bg-sunk transition hover:bg-line"><Icon name="x" size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────── tabs with a sliding indicator ───────── */

export type TabItem = { id: string; label: string; icon?: IconName; badge?: ReactNode; hidden?: boolean };

export function Tabs({ items, value, onChange, variant = "underline", className = "" }: { items: TabItem[]; value: string; onChange: (id: string) => void; variant?: "underline" | "pill"; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const visible = items.filter((item) => !item.hidden);

  const measure = useCallback(() => {
    const active = wrap.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (active) setBox({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, visible.length]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    // Badges and fonts change tab widths after first paint, so follow every tab's size.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    wrap.current?.querySelectorAll("[data-tab]").forEach((tab) => observer?.observe(tab));
    if (wrap.current) observer?.observe(wrap.current);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [measure, visible.length]);

  const pill = variant === "pill";
  return (
    <div className={`scrollbar-none overflow-x-auto ${className}`}>
      <div ref={wrap} role="tablist" className={`relative inline-flex min-w-full gap-1 md:min-w-0 ${pill ? "rounded-full bg-sunk p-1" : "border-b border-line"}`}>
        {box ? (
          <span
            aria-hidden="true"
            className={`absolute transition-all duration-500 ease-[var(--ease-out-expo)] ${pill ? "inset-y-1 rounded-full bg-surface shadow-soft" : "bottom-0 h-0.5 rounded-full bg-accent"}`}
            style={{ left: box.left, width: box.width }}
          />
        ) : null}
        {visible.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              data-tab={item.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={`relative z-10 flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-300 ${pill ? "rounded-full px-4 py-2" : "px-4 py-3"} ${active ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {item.icon ? <Icon name={item.icon} size={16} /> : null}
              {item.label}
              {item.badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] leading-5 text-white">{item.badge}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── switch ───────── */

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${checked ? "bg-accent" : "bg-line"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-[var(--ease-spring)] ${checked ? "right-6" : "right-1"}`} />
    </button>
  );
}

/* ───────── accordion ───────── */

export function Accordion({ items }: { items: { id: string; title: string; body: ReactNode }[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[1.75rem] border border-line bg-surface">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id}>
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-start text-base font-medium transition hover:bg-paper md:px-7"
            >
              {item.title}
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition duration-500 ${isOpen ? "rotate-45 bg-accent text-white" : "bg-sunk"}`}><Icon name="plus" size={16} /></span>
            </button>
            <div className={`grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="px-5 pb-6 text-[15px] leading-8 text-muted md:px-7">{item.body}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── confirm-on-second-click ───────── */

export function ConfirmButton({ onConfirm, children, label = "مطمئنید؟", variant = "ghost", size = "sm", icon }: { onConfirm: () => void | Promise<void>; children: ReactNode; label?: string; variant?: "ghost" | "danger" | "soft"; size?: "sm" | "md"; icon?: IconName }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3200);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <Button
      type="button"
      size={size}
      variant={armed ? "danger" : variant}
      icon={armed ? undefined : icon}
      onClick={async () => {
        if (!armed) return setArmed(true);
        setArmed(false);
        await onConfirm();
      }}
    >
      {armed ? label : children}
    </Button>
  );
}

/* ───────── progress ring ───────── */

export function Ring({ percent, size = 88, label }: { percent: number; size?: number; label?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${percent} درصد`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-sunk)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.2s var(--ease-out-expo)" }}
        />
      </svg>
      <span className="absolute text-lg font-semibold">{faDigits(String(percent))}٪</span>
    </div>
  );
}

/* ───────── chip multi-select ───────── */

export function ChipGroup({ options, value, onChange, disabled }: { options: readonly { value: string; label: string }[]; value: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const on = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((item) => item !== option.value) : [...value, option.value])}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] transition duration-300 active:scale-95 disabled:cursor-not-allowed ${on ? "border-accent bg-accent-soft font-medium text-accent-deep" : "border-line bg-surface text-ink-2 hover:border-ink/30"} ${disabled && !on ? "opacity-50" : ""}`}
          >
            <span className={`grid overflow-hidden transition-all duration-300 ${on ? "w-3.5 opacity-100" : "w-0 opacity-0"}`}><Icon name="check" size={14} strokeWidth={2.4} /></span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── tag list ───────── */

export function TagInput({ value, onChange, disabled, placeholder }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim();
    if (text && !value.includes(text) && value.length < 12) onChange([...value, text]);
    setDraft("");
  };
  return (
    <div>
      {value.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <span key={tag} className="pop inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-[13px] text-warn">
              {tag}
              {!disabled ? <button type="button" aria-label={`حذف ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))}><Icon name="x" size={12} strokeWidth={2.4} /></button> : null}
            </span>
          ))}
        </div>
      ) : null}
      {!disabled ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={placeholder ?? "بنویسید و Enter بزنید"}
            maxLength={80}
            className={control}
          />
          <Button type="button" variant="soft" onClick={add} icon="plus">افزودن</Button>
        </div>
      ) : null}
    </div>
  );
}

/* ───────── Jalali date picker (value is an ISO yyyy-mm-dd string) ───────── */

type Draft = { y: string; m: string; d: string };

function toDraft(iso: string): Draft {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { y: "", m: "", d: "" };
  const [gy, gm, gd] = iso.split("-").map(Number);
  const j = jalaali.toJalaali(gy, gm, gd);
  return { y: String(j.jy), m: String(j.jm), d: String(j.jd) };
}

export function JalaliDateField({ value, onChange, disabled, yearsBack = 100, yearsAhead = 0 }: { value: string; onChange: (iso: string) => void; disabled?: boolean; yearsBack?: number; yearsAhead?: number }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setDraft(toDraft(value));
    }
  }, [value]);

  const now = currentJalali();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = now.jy + yearsAhead; year >= now.jy - yearsBack; year -= 1) list.push(year);
    return list;
  }, [now.jy, yearsAhead, yearsBack]);

  const monthLength = draft.y && draft.m ? jalaali.jalaaliMonthLength(Number(draft.y), Number(draft.m)) : 31;

  function update(next: Draft) {
    const length = next.y && next.m ? jalaali.jalaaliMonthLength(Number(next.y), Number(next.m)) : 31;
    if (next.d && Number(next.d) > length) next = { ...next, d: String(length) };
    setDraft(next);
    if (next.y && next.m && next.d) {
      const g = jalaali.toGregorian(Number(next.y), Number(next.m), Number(next.d));
      const iso = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
      lastEmitted.current = iso;
      onChange(iso);
    } else if (!next.y && !next.m && !next.d) {
      lastEmitted.current = "";
      onChange("");
    }
  }

  const dayOptions = Array.from({ length: monthLength }, (_, index) => ({ value: String(index + 1), label: faDigits(String(index + 1)) }));
  const monthOptions = JALALI_MONTHS.map((name, index) => ({ value: String(index + 1), label: name }));
  const yearOptions = years.map((year) => ({ value: String(year), label: faDigits(String(year)) }));
  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2" dir="rtl">
      <Select aria-label="روز" disabled={disabled} align="center" placeholder="روز" searchable={false} value={draft.d} options={dayOptions} onChange={(d) => update({ ...draft, d })} />
      <Select aria-label="ماه" disabled={disabled} align="center" placeholder="ماه" searchable={false} value={draft.m} options={monthOptions} onChange={(m) => update({ ...draft, m })} />
      <Select aria-label="سال" disabled={disabled} align="center" placeholder="سال" searchable={false} value={draft.y} options={yearOptions} onChange={(y) => update({ ...draft, y })} />
    </div>
  );
}
