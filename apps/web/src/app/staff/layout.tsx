import type { Metadata } from "next";
import { StaffShell } from "@/components/shells";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = privateRobots;

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
