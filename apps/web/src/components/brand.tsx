"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { Icon } from "./icons";

const LogoContext = createContext("");

export function BrandProvider({ logoUrl, children }: { logoUrl: string; children: React.ReactNode }) {
  return <LogoContext.Provider value={logoUrl}>{children}</LogoContext.Provider>;
}

export function BrandMark({ size = 40, logoUrl }: { size?: number; logoUrl?: string }) {
  const contextLogo = useContext(LogoContext);
  const logo = logoUrl ?? contextLogo;
  if (logo) {
    return (
      <span
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-[0.9rem] bg-white shadow-soft ring-1 ring-line/70"
        style={{ width: size, height: size }}
      >
        <img src={mediaUrl(logo)} alt="لوگوی مطب" className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[0.9rem] bg-gradient-to-br from-accent-2 via-accent to-accent-deep text-white shadow-glow"
      style={{ width: size, height: size }}
    >
      <Icon name="tooth" size={size * 0.56} strokeWidth={1.9} />
      <span className="absolute -top-3 end-0 h-6 w-6 rounded-full bg-white/25 blur-md" />
    </span>
  );
}

export function Brand({ tone = "dark", href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3">
      <span className="transition duration-500 group-hover:-rotate-6 group-hover:scale-105"><BrandMark /></span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-[15px] font-semibold ${tone === "light" ? "text-paper" : "text-ink"}`}>دکتر امیر سلطان‌طویه</span>
        <span className={`block truncate text-[11px] ${tone === "light" ? "text-paper/60" : "text-muted"}`}>مرکز ایمپلنت دیجیتال · ساری</span>
      </span>
    </Link>
  );
}
