"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, formatPhone } from "@clinic/shared";
import { isStaff, useAuth } from "./auth-provider";
import { Avatar } from "./ui";
import { Icon } from "./icons";
import { useToast } from "./interactive";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const staff = isStaff(user.roles);
  const role = user.roles.includes("ADMIN") ? ROLE_LABEL.ADMIN : user.roles.includes("DENTIST") ? ROLE_LABEL.DENTIST : user.roles.includes("SECRETARY") ? ROLE_LABEL.SECRETARY : ROLE_LABEL.PATIENT;

  async function exit() {
    setOpen(false);
    await logout();
    toast("از حساب خارج شدید", "info");
    router.replace("/");
  }

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pe-3 ps-1 transition hover:border-ink/30 hover:shadow-soft"
      >
        <Avatar name={user.fullName} size={compact ? 30 : 34} />
        {compact ? null : <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.fullName}</span>}
        <Icon name="chevronDown" size={14} className={`text-muted transition duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="pop absolute end-0 top-[calc(100%+0.6rem)] z-50 w-64 origin-top-left overflow-hidden rounded-3xl border border-line bg-surface p-2 shadow-lift">
          <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
            <Avatar name={user.fullName} size={42} tone="ink" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="text-xs text-muted">{role} · {formatPhone(user.phone)}</p>
            </div>
          </div>
          <nav className="mt-1.5 grid gap-0.5 text-sm">
            {staff ? <MenuLink href="/staff" icon="stethoscope" onNavigate={() => setOpen(false)}>پنل مطب</MenuLink> : null}
            {staff ? <MenuLink href="/staff/appointments" icon="home" onNavigate={() => setOpen(false)}>نوبت‌های مطب</MenuLink> : null}
            <MenuLink href={staff ? "/account/profile" : "/account"} icon="user" onNavigate={() => setOpen(false)}>{staff ? "مشخصات من" : "حساب من"}</MenuLink>
            <MenuLink href="/" icon="home" onNavigate={() => setOpen(false)}>سایت مطب</MenuLink>
            <button role="menuitem" onClick={exit} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-bad transition hover:bg-bad-soft">
              <Icon name="logout" size={18} />
              خروج از حساب
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, icon, children, onNavigate }: { href: string; icon: "user" | "stethoscope" | "home"; children: React.ReactNode; onNavigate: () => void }) {
  return (
    <Link role="menuitem" href={href} onClick={onNavigate} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-paper">
      <Icon name={icon} size={18} className="text-muted" />
      {children}
    </Link>
  );
}
