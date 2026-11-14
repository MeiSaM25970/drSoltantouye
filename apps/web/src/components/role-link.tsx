"use client";

import type { ComponentProps, ReactNode } from "react";
import { isStaff, useAuth } from "./auth-provider";
import { ButtonLink } from "./ui";

type Kind = "book" | "consult";

const PATIENT: Record<Kind, string> = {
  book: "/account/appointments/new",
  consult: "/account/consultations/new",
};

const STAFF: Record<Kind, { href: string; label: string; icon: ComponentProps<typeof ButtonLink>["icon"] }> = {
  book: { href: "/staff/appointments", label: "نوبت‌های مطب", icon: "clipboard" },
  consult: { href: "/staff/consultations", label: "صندوق مشاوره", icon: "chat" },
};

/** Public-site call to action: patients book, staff jump to their own work queue. */
export function RoleButtonLink({
  kind,
  href,
  children,
  icon,
  ...rest
}: { kind: Kind; href?: string; children: ReactNode } & Omit<ComponentProps<typeof ButtonLink>, "href" | "children">) {
  const { user } = useAuth();
  if (user && isStaff(user.roles)) {
    const staff = STAFF[kind];
    return (
      <ButtonLink {...rest} href={staff.href} icon={staff.icon}>
        {staff.label}
      </ButtonLink>
    );
  }
  return (
    <ButtonLink {...rest} href={href ?? PATIENT[kind]} icon={icon}>
      {children}
    </ButtonLink>
  );
}
