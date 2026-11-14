import type { Metadata } from "next";
import { AccountShell } from "@/components/shells";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = privateRobots;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
