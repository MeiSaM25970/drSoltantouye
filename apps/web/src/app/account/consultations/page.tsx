"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSULTATION_STATUS_LABEL, TOPIC_LABEL, type ConsultationTopic } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { ButtonLink, Empty, ListSkeleton, PageIntro, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateOnly } from "@/lib/jalali";

type Row = { id: string; topic: ConsultationTopic; status: keyof typeof CONSULTATION_STATUS_LABEL; updatedAt?: string; messages: { body: string }[] };

export default function ConsultationsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    void api<Row[]>("/consultations").then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div>
      <PageIntro title="مشاوره‌ها" text="پاسخ مطب همین‌جا می‌آید. این گفتگو جای ویزیت حضوری نیست." action={<ButtonLink href="/account/consultations/new" icon="plus">سؤال جدید</ButtonLink>} />
      {!rows ? <ListSkeleton /> : null}
      {rows?.length === 0 ? <Empty icon="chat" title="مشاوره‌ای ندارید" text="اگر درد یا سؤال زیبایی دارید، کوتاه بنویسید تا مطب جواب بدهد." action={<ButtonLink href="/account/consultations/new" icon="chat">پرسیدن سؤال</ButtonLink>} /> : null}
      <div className="space-y-3">
        {rows?.map((row, index) => (
          <Link key={row.id} href={`/account/consultations/${row.id}`} className="card card-hover pop group flex items-center gap-4 p-5" style={{ animationDelay: `${index * 60}ms` }}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon name="chat" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><b>{TOPIC_LABEL[row.topic]}</b><StatusPill value={row.status} label={CONSULTATION_STATUS_LABEL[row.status]} /></span>
              <span className="mt-1 line-clamp-1 block text-sm text-muted">{row.messages[0]?.body}</span>
              {row.updatedAt ? <span className="mt-1 block text-xs text-muted/70">{formatDateOnly(row.updatedAt)}</span> : null}
            </span>
            <Icon name="chevron" size={18} className="shrink-0 text-muted transition group-hover:-translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
