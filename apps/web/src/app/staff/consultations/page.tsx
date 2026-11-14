"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSULTATION_STATUS_LABEL, TOPIC_LABEL, type ConsultationTopic } from "@clinic/shared";
import { Avatar, Empty, ListSkeleton, PageIntro, StatusPill } from "@/components/ui";
import { Tabs } from "@/components/interactive";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/jalali";

type Row = { id: string; topic: ConsultationTopic; status: keyof typeof CONSULTATION_STATUS_LABEL; updatedAt?: string; patient: { fullName: string }; messages: { body: string }[] };

export default function StaffConsultationsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState("OPEN");
  useEffect(() => {
    void api<Row[]>("/consultations").then(setRows).catch(() => setRows([]));
  }, []);
  const count = (status: string) => rows?.filter((row) => row.status === status).length ?? 0;
  const shown = rows?.filter((row) => (tab === "ALL" ? true : row.status === tab)) ?? [];
  return (
    <div>
      <PageIntro title="صندوق مشاوره" text="پیام‌های باز را جواب بدهید. بستن گفتگو از داخل همان صفحه انجام می‌شود." />
      <Tabs
        variant="pill"
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: "OPEN", label: "بدون پاسخ", badge: count("OPEN") || undefined },
          { id: "ANSWERED", label: "پاسخ داده شده" },
          { id: "CLOSED", label: "بسته" },
          { id: "ALL", label: "همه" },
        ]}
      />
      {!rows ? <ListSkeleton /> : null}
      {rows && shown.length === 0 ? <Empty icon="chat" title="موردی نیست" text="در این دسته مشاوره‌ای وجود ندارد." /> : null}
      <div key={tab} className="space-y-3">
        {shown.map((row, index) => (
          <Link key={row.id} href={`/staff/consultations/${row.id}`} style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }} className="card card-hover pop group flex items-center gap-4 p-4">
            <Avatar name={row.patient.fullName} size={46} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center justify-between gap-2"><b>{row.patient.fullName} · {TOPIC_LABEL[row.topic]}</b><StatusPill value={row.status} label={CONSULTATION_STATUS_LABEL[row.status]} /></span>
              <span className="mt-1 line-clamp-2 block text-sm leading-7 text-muted">{row.messages[0]?.body}</span>
              {row.updatedAt ? <span className="text-xs text-muted/70">{formatDateOnly(row.updatedAt)}</span> : null}
            </span>
            <Icon name="chevron" size={18} className="shrink-0 text-muted transition group-hover:-translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
