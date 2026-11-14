import type { RecordValues, ToothCondition } from "@clinic/shared";

export type RecordDetail = {
  user: { id: string; fullName: string; phone: string; roles: string[]; createdAt: string };
  access: { patient: boolean; clinical: boolean; clinic: boolean; ledger: boolean };
  record: null | {
    id: string;
    fileNo: number;
    createdAt: string;
    updatedAt: string;
    values: RecordValues;
    teeth: { fdi: number; condition: ToothCondition; note?: string | null }[];
    attachments: { id: string; url: string; caption?: string | null; byPatient: boolean; createdAt: string }[];
    visits: { id: string; body: string; internal: boolean; createdAt: string; author: { fullName: string } }[];
    ledger: null | {
      entries: { id: string; kind: "CHARGE" | "PAYMENT"; title: string; amount: number; createdAt: string }[];
      charged: number;
      paid: number;
      balance: number;
    };
  };
  audits: { id: string; detail?: string | null; createdAt: string; actor?: { fullName: string } | null }[];
};
