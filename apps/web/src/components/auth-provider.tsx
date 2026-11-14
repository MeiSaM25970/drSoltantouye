"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "@clinic/shared";
import { api } from "@/lib/api";

export type Profile = {
  id: string;
  fullName: string;
  phone: string;
  roles: Role[];
  doctor: { id: string; slug: string; specialty: string } | null;
  staff: { title: string | null; telegramAllowed: boolean } | null;
  telegram: {
    allowed: boolean;
    connected: boolean;
    preferences: {
      appointmentCreated: boolean;
      appointmentCancelled: boolean;
      consultationCreated: boolean;
      consultationMessage: boolean;
    };
  } | null;
};

type AuthValue = {
  user: Profile | null | undefined;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null | undefined>(undefined);

  async function refresh() {
    try {
      setUser(await api<Profile>("/auth/me"));
    } catch {
      setUser(null);
    }
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }

  useEffect(() => {
    let cancelled = false;
    api<Profile>("/auth/me")
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={{ user, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("auth missing");
  return value;
}

export function isStaff(roles: readonly string[] = []) {
  return roles.some((role) => role === "ADMIN" || role === "SECRETARY" || role === "DENTIST");
}
