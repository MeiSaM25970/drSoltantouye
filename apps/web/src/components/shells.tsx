"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABEL, formatPhone } from "@clinic/shared";
import { isStaff, useAuth } from "./auth-provider";
import { Brand } from "./brand";
import { Icon, type IconName } from "./icons";
import { Avatar, Skeleton } from "./ui";
import { UserMenu } from "./user-menu";
import { useToast } from "./interactive";

type NavItem = { href: string; label: string; icon: IconName; match: (path: string) => boolean };

const accountNav: NavItem[] = [
  { href: "/account", label: "خلاصه", icon: "home", match: (path) => path === "/account" },
  { href: "/account/appointments", label: "نوبت‌ها", icon: "calendar", match: (path) => path.startsWith("/account/appointments") },
  { href: "/account/consultations", label: "مشاوره", icon: "chat", match: (path) => path.startsWith("/account/consultations") },
  { href: "/account/record", label: "پرونده", icon: "file", match: (path) => path.startsWith("/account/record") },
  { href: "/account/profile", label: "مشخصات", icon: "user", match: (path) => path.startsWith("/account/profile") },
];

function GateSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 md:px-6" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <p className="sr-only">در حال بررسی ورود...</p>
    </div>
  );
}

function SignedOut({ next }: { next: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon name="lock" /></span>
      <h1 className="mt-5 text-2xl font-semibold">برای ادامه وارد شوید</h1>
      <p className="mt-2 text-muted">این صفحه مخصوص کاربران واردشده است.</p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-shine mt-6 inline-flex rounded-full bg-ink px-7 py-3 text-sm font-medium text-paper">ورود</Link>
    </div>
  );
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [user, router, pathname]);

  if (user === undefined) return <GateSkeleton />;
  if (user === null) return <SignedOut next={pathname} />;

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b border-line/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <Brand />
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted transition hover:bg-sunk hover:text-ink sm:flex">
              <Icon name="home" size={16} />سایت مطب
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:grid md:grid-cols-[13.5rem_1fr] md:gap-10 md:px-6 md:pb-14 md:pt-10">
        <aside className="hidden md:block">
          <nav className="sticky top-24 grid gap-1" aria-label="حساب">
            {accountNav.map((item) => <SideLink key={item.href} item={item} active={item.match(pathname)} />)}
            {isStaff(user.roles) ? (
              <Link href="/staff" className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-accent/40 px-4 py-3 text-sm font-medium text-accent-deep transition hover:bg-accent-soft">
                <Icon name="stethoscope" size={18} />پنل مطب
              </Link>
            ) : null}
          </nav>
        </aside>
        <main className="page-in min-w-0" key={pathname}>{children}</main>
      </div>

      <nav className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[1.75rem] border border-line p-1.5 shadow-lift md:hidden" aria-label="حساب">
        {accountNav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 rounded-[1.25rem] py-2 text-[11px] transition-all duration-300 ${active ? "bg-ink text-paper" : "text-muted"}`}>
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SideLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-300 ${active ? "bg-ink font-medium text-paper shadow-soft" : "text-ink-2 hover:bg-surface hover:shadow-soft"}`}
    >
      <Icon name={item.icon} size={18} className={active ? "text-accent-2" : "text-muted transition group-hover:text-accent"} />
      {item.label}
    </Link>
  );
}

/* ───────── staff ───────── */

const dailyNav: NavItem[] = [
  { href: "/staff", label: "امروز", icon: "home", match: (path) => path === "/staff" },
  { href: "/staff/calendar", label: "تقویم", icon: "calendar", match: (path) => path.startsWith("/staff/calendar") },
  { href: "/staff/appointments", label: "نوبت‌ها", icon: "clipboard", match: (path) => path.startsWith("/staff/appointments") },
  { href: "/staff/patients", label: "بیماران و پرونده‌ها", icon: "users", match: (path) => path.startsWith("/staff/patients") },
  { href: "/staff/consultations", label: "مشاوره‌ها", icon: "chat", match: (path) => path.startsWith("/staff/consultations") },
];

const clinicNav: NavItem[] = [
  { href: "/staff/hours", label: "ساعت کاری", icon: "clock", match: (path) => path.startsWith("/staff/hours") },
  { href: "/staff/telegram", label: "تلگرام", icon: "telegram", match: (path) => path.startsWith("/staff/telegram") },
  { href: "/staff/team", label: "تیم", icon: "stethoscope", match: (path) => path.startsWith("/staff/team") },
  { href: "/staff/services", label: "خدمات", icon: "tooth", match: (path) => path.startsWith("/staff/services") },
  { href: "/staff/gallery", label: "گالری و پست‌ها", icon: "image", match: (path) => path.startsWith("/staff/gallery") },
  { href: "/staff/content", label: "تصویر و متن صفحه اول", icon: "sparkle", match: (path) => path.startsWith("/staff/content") },
  { href: "/staff/settings", label: "تنظیمات صفحه اول", icon: "settings", match: (path) => path.startsWith("/staff/settings") },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (user && !isStaff(user.roles)) router.replace("/account");
  }, [user, router, pathname]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  if (user === undefined) return <GateSkeleton />;
  if (user === null) return <SignedOut next={pathname} />;
  if (!isStaff(user.roles)) return <GateSkeleton />;

  const manage = user.roles.includes("ADMIN") ? clinicNav : clinicNav.slice(0, 2);
  const role = user.roles.includes("ADMIN") ? ROLE_LABEL.ADMIN : user.roles.includes("DENTIST") ? ROLE_LABEL.DENTIST : ROLE_LABEL.SECRETARY;

  const nav = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5"><Brand /></div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-[11px] font-medium text-muted">کار روزانه</p>
        <div className="grid gap-1">{dailyNav.map((item) => <SideLink key={item.href} item={item} active={item.match(pathname)} onNavigate={() => setDrawer(false)} />)}</div>
        <p className="px-3 pb-2 pt-6 text-[11px] font-medium text-muted">مدیریت مطب</p>
        <div className="grid gap-1">{manage.map((item) => <SideLink key={item.href} item={item} active={item.match(pathname)} onNavigate={() => setDrawer(false)} />)}</div>
      </div>
      <div className="m-3 rounded-3xl bg-paper p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} size={40} tone="ink" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{role} · {formatPhone(user.phone)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/" className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-2 text-xs transition hover:border-ink/30"><Icon name="home" size={14} />سایت</Link>
          <button
            onClick={async () => {
              await logout();
              toast("از حساب خارج شدید", "info");
              router.replace("/");
            }}
            className="flex items-center justify-center gap-1.5 rounded-full bg-bad-soft py-2 text-xs font-medium text-bad transition hover:opacity-80"
          >
            <Icon name="logout" size={14} />خروج
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17.5rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-e border-line bg-surface lg:block">{nav}</aside>

      <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-line/70 px-4 py-2.5 lg:hidden">
        <Brand />
        <button onClick={() => setDrawer(true)} aria-label="منو" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface"><Icon name="menu" /></button>
      </header>

      <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? "" : "pointer-events-none"}`} aria-hidden={!drawer}>
        <div onClick={() => setDrawer(false)} className={`absolute inset-0 bg-ink/45 backdrop-blur-sm transition-opacity duration-500 ${drawer ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute inset-y-0 right-0 w-[19rem] max-w-[86vw] bg-surface shadow-lift transition-transform duration-500 ease-[var(--ease-out-expo)] ${drawer ? "translate-x-0" : "translate-x-full"}`}>{nav}</div>
      </div>

      <main key={pathname} className="page-in min-w-0 px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
