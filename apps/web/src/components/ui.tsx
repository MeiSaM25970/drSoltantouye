import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { control } from "./control-style";
import { Icon, type IconName } from "./icons";

/* ───────── buttons ───────── */

const variants = {
  primary: "bg-ink text-paper hover:bg-ink-2 shadow-[0_10px_24px_-12px_rgb(23_18_14/0.7)]",
  accent: "bg-accent text-white hover:bg-accent-deep shadow-glow",
  light: "bg-paper text-ink hover:bg-white",
  ghost: "border border-line bg-surface text-ink hover:border-ink/30 hover:bg-white",
  soft: "bg-sunk text-ink hover:bg-[#e8dfd0]",
  danger: "bg-bad text-white hover:opacity-90",
  outline: "border border-white/30 text-paper hover:bg-white/10",
} as const;

const sizes = {
  sm: "px-3.5 py-1.5 text-[13px]",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-[15px]",
} as const;

const base =
  "btn-shine inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export type ButtonVariant = keyof typeof variants;

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof sizes; loading?: boolean; icon?: IconName }) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <span className="h-4 w-4 animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-current border-t-transparent" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </Link>
  );
}

/* ───────── form controls ───────── */

export { control };
export { MoneyInput, Select, TextInput, type SelectOption } from "./fields";

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs leading-6 text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-bad">{error}</span> : null}
    </label>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} min-h-28 resize-y leading-7 ${props.className ?? ""}`} />;
}

/* ───────── layout bits ───────── */

export function PageIntro({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-accent"><span className="h-px w-6 bg-accent" />{eyebrow}</p> : null}
        <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight md:text-4xl">{title}</h1>
        {text ? <p className="mt-2.5 max-w-2xl text-[15px] leading-8 text-muted">{text}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <section className={`card ${padded ? "p-5 md:p-6" : ""} ${className}`}>{children}</section>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {aside}
    </div>
  );
}

export function Empty({ title, text, icon = "sparkle", action }: { title: string; text: string; icon?: IconName; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon name={icon} /></span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-7 text-muted">{text}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-20 rounded-3xl" />)}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="pop rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{children}</p>;
}

export function Avatar({ name, size = 40, tone = "accent" }: { name: string; size?: number; tone?: "accent" | "ink" }) {
  const letter = name.trim().charAt(0) || "؟";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${tone === "ink" ? "bg-ink text-paper" : "bg-accent-soft text-accent-deep"}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "ok" | "warn" | "bad" | "info" }) {
  const tones = {
    neutral: "bg-sunk text-ink-2",
    accent: "bg-accent-soft text-accent-deep",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    info: "bg-info-soft text-info",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

const statusTone: Record<string, "neutral" | "accent" | "ok" | "warn" | "bad" | "info"> = {
  REQUESTED: "warn",
  CONFIRMED: "info",
  ARRIVED: "accent",
  COMPLETED: "ok",
  CANCELLED: "bad",
  NO_SHOW: "bad",
  OPEN: "warn",
  ANSWERED: "ok",
  CLOSED: "neutral",
};

export function StatusPill({ value, label }: { value: string; label: string }) {
  return <Badge tone={statusTone[value] ?? "neutral"}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</Badge>;
}

export function Stat({ label, value, icon, tone = "accent", hint }: { label: string; value: ReactNode; icon: IconName; tone?: "accent" | "ok" | "warn" | "info"; hint?: string }) {
  const tones = { accent: "bg-accent-soft text-accent-deep", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", info: "bg-info-soft text-info" };
  return (
    <div className="card card-hover flex items-center gap-4 p-4 md:p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}><Icon name={icon} /></span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1.5 truncate text-[13px] text-muted">{label}</p>
        {hint ? <p className="truncate text-xs text-muted/70">{hint}</p> : null}
      </div>
    </div>
  );
}
