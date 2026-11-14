"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLINIC_SEED, formatPhone } from "@clinic/shared";
import { isStaff, useAuth } from "./auth-provider";
import { Brand } from "./brand";
import { Icon, type IconName } from "./icons";
import { ButtonLink } from "./ui";
import { UserMenu } from "./user-menu";

type NavLink = { href: string; label: string; icon: IconName; current: (path: string) => boolean };

const staffLinks: NavLink[] = [
  { href: "/staff/appointments", label: "نوبت‌ها", icon: "clipboard", current: (path) => path.startsWith("/staff/appointments") },
  { href: "/staff/consultations", label: "مشاوره", icon: "chat", current: (path) => path.startsWith("/staff/consultations") },
  { href: "/staff", label: "پنل مطب", icon: "stethoscope", current: (path) => path === "/staff" },
];

const baseLinks: NavLink[] = [
  { href: "/", label: "خانه", icon: "home", current: (path) => path === "/" },
  { href: "/services", label: "خدمات", icon: "tooth", current: (path) => path.startsWith("/services") },
  { href: "/doctors", label: "پزشک", icon: "stethoscope", current: (path) => path.startsWith("/doctors") },
  { href: "/posts", label: "پست‌ها", icon: "image", current: (path) => path.startsWith("/posts") },
];

const patientLinks: NavLink[] = [
  { href: "/account/consultations/new", label: "مشاوره", icon: "chat", current: (path) => path.startsWith("/account/consultations") },
  { href: "/account/appointments/new", label: "نوبت", icon: "calendar", current: (path) => path.startsWith("/account/appointments") },
];

export function SiteHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = [...baseLinks, ...(user && isStaff(user.roles) ? staffLinks : patientLinks)];
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${scrolled || open ? "glass border-b border-line/70 shadow-soft" : "border-b border-transparent"}`}>
      <div className={`mx-auto flex max-w-6xl items-center gap-3 px-4 transition-all duration-500 md:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] ${scrolled ? "py-2.5" : "py-4"}`}>
        <div className="min-w-0 justify-self-start"><Brand /></div>

        <nav className="hidden items-center gap-1 justify-self-center rounded-full border border-line/80 bg-surface/70 p-1 text-sm backdrop-blur lg:flex" aria-label="منوی اصلی">
          {links.map((link) => {
            const active = link.current(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${active ? "bg-ink font-medium text-paper shadow-soft" : "text-ink-2 hover:bg-sunk"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0 lg:justify-self-end">
          {user ? (
            <UserMenu />
          ) : user === null ? (
            <>
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-2 transition hover:bg-sunk sm:inline">ورود</Link>
              <ButtonLink href="/register" size="sm" variant="primary" className="hidden sm:inline-flex">ثبت‌نام</ButtonLink>
            </>
          ) : (
            <span className="skeleton h-10 w-24 rounded-full" />
          )}
          <button
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            aria-expanded={open}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-surface transition active:scale-95 lg:hidden"
          >
            <span className="relative block h-3.5 w-5">
              <span className={`absolute inset-x-0 h-0.5 rounded bg-ink transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute inset-x-0 top-1.5 h-0.5 rounded bg-ink transition-all duration-300 ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute inset-x-0 h-0.5 rounded bg-ink transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      <div className={`absolute inset-x-0 top-full h-[100dvh] lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} />
        <nav
          aria-label="منوی موبایل"
          className={`absolute inset-x-3 top-2 overflow-hidden rounded-[2rem] border border-line bg-surface p-3 shadow-lift transition-all duration-500 ease-[var(--ease-out-expo)] ${open ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"}`}
        >
          <div className="grid gap-1">
            {links.map((link, index) => {
              const active = link.current(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  tabIndex={open ? 0 : -1}
                  aria-current={active ? "page" : undefined}
                  style={{ transitionDelay: open ? `${index * 40 + 80}ms` : "0ms" }}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base transition-all duration-500 ${open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"} ${active ? "bg-ink font-medium text-paper" : "hover:bg-paper"}`}
                >
                  <Icon name={link.icon} size={20} className={active ? "text-accent-2" : "text-muted"} />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 border-t border-line pt-3">
            {user === null ? (
              <div className="grid grid-cols-2 gap-2">
                <ButtonLink href="/login" variant="ghost">ورود</ButtonLink>
                <ButtonLink href="/register" variant="primary">ثبت‌نام</ButtonLink>
              </div>
            ) : null}
            <a href={`tel:+98${CLINIC_SEED.phone1.slice(1)}`} className="flex items-center justify-center gap-2 rounded-2xl bg-accent-soft py-3 text-sm font-medium text-accent-deep">
              <Icon name="phone" size={16} />
              {formatPhone(CLINIC_SEED.phone1)}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
