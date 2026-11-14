"use client";

import { useState } from "react";
import { LOWER_TEETH, TOOTH_LABEL, UPPER_TEETH, faDigits, type ToothCondition } from "@clinic/shared";
import { Button, TextInput } from "./ui";
import { Icon } from "./icons";

const fill: Record<ToothCondition, string> = {
  SOUND: "#fffdfa",
  CARIES: "#e8a597",
  FILLED: "#a8c2dd",
  ROOT_CANAL: "#efcd8a",
  CROWN: "#dab78a",
  IMPLANT: "#a5cbbc",
  MISSING: "transparent",
  BRIDGE: "#c3badf",
};

const TOOTH_PATH =
  "M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .8 3.4 1.3 5.2.5 2 .6 5.3 1.6 7.3.5 1 1.6 1.3 2.2.4.9-1.3.9-4.1 3.4-4.1s2.5 2.8 3.4 4.1c.6.9 1.7.6 2.2-.4 1-2 1.1-5.3 1.6-7.3.5-1.8 1.3-3.2 1.3-5.2C20.5 5 19 3 16.5 3c-1.7 0-2.6.9-4.5.9S9.2 3 7.5 3Z";

type Tooth = { fdi: number; condition: ToothCondition; note?: string | null };

function widthOf(fdi: number) {
  const n = fdi % 10;
  if (n <= 2) return 0.78;
  if (n === 3) return 0.9;
  if (n <= 5) return 0.95;
  return 1.15;
}

export function Odontogram({
  teeth,
  editable,
  onSave,
}: {
  teeth: Tooth[];
  editable?: boolean;
  onSave?: (tooth: { fdi: number; condition: ToothCondition; note?: string }) => Promise<void>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [condition, setCondition] = useState<ToothCondition>("SOUND");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const map = new Map(teeth.map((tooth) => [tooth.fdi, tooth]));
  const current = selected ? map.get(selected) : undefined;

  function choose(fdi: number) {
    const found = map.get(fdi);
    setSelected(fdi);
    setCondition(found?.condition ?? "SOUND");
    setNote(found?.note ?? "");
  }

  const counts = new Map<ToothCondition, number>();
  for (const tooth of teeth) counts.set(tooth.condition, (counts.get(tooth.condition) ?? 0) + 1);

  return (
    <div>
      <div className="rounded-[1.75rem] bg-gradient-to-b from-paper to-sunk/60 p-4 md:p-8">
        <div dir="ltr" className="mx-auto max-w-3xl">
          <p className="mb-6 flex justify-between text-[11px] font-medium text-muted"><span className="rounded-full bg-sunk px-2.5 py-1">راست بیمار</span><span className="rounded-full bg-sunk px-2.5 py-1">چپ بیمار</span></p>
          <Arch ids={UPPER_TEETH} upper map={map} selected={selected} onChoose={choose} />
          <div className="relative my-8 h-px bg-gradient-to-r from-transparent via-line to-transparent md:my-10"><span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-line" /></div>
          <Arch ids={LOWER_TEETH} map={map} selected={selected} onChoose={choose} />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-muted">
          {(Object.keys(TOOTH_LABEL) as ToothCondition[]).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-ink/20" style={{ background: fill[key], borderStyle: key === "MISSING" ? "dashed" : "solid" }} />
              {TOOTH_LABEL[key]}
              {counts.get(key) ? <b className="text-ink">{faDigits(String(counts.get(key)))}</b> : null}
            </span>
          ))}
        </div>
      </div>

      {selected ? (
        <div key={selected} className="pop mt-4 rounded-[1.5rem] border border-line bg-surface p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold">دندان {faDigits(String(selected))}</p>
            <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full bg-sunk" aria-label="بستن"><Icon name="x" size={14} /></button>
          </div>
          {editable ? (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!onSave) return;
                setPending(true);
                try {
                  await onSave({ fdi: selected, condition, note });
                } finally {
                  setPending(false);
                }
              }}
            >
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TOOTH_LABEL) as ToothCondition[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCondition(key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition active:scale-95 ${condition === key ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink/30"}`}
                  >
                    <span className="h-3 w-3 rounded-full border border-ink/25" style={{ background: fill[key] }} />
                    {TOOTH_LABEL[key]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="یادداشت دندان، اختیاری" maxLength={300} />
                <Button type="submit" loading={pending} icon="check">ثبت</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm leading-7 text-muted">
              {TOOTH_LABEL[current?.condition ?? "SOUND"]}
              {current?.note ? ` · ${current.note}` : ""}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">{editable ? "روی یک دندان بزنید تا وضعیتش را ثبت کنید." : "روی هر دندان بزنید تا جزئیاتش را ببینید."}</p>
      )}
    </div>
  );
}

function Arch({ ids, upper, map, selected, onChoose }: { ids: number[]; upper?: boolean; map: Map<number, Tooth>; selected: number | null; onChoose: (fdi: number) => void }) {
  const center = (ids.length - 1) / 2;
  return (
    <div className="flex items-end gap-1 px-0.5 md:gap-2.5 md:px-2" style={{ paddingTop: upper ? 18 : 0, paddingBottom: upper ? 0 : 18 }}>
      {ids.map((fdi, index) => {
        const tooth = map.get(fdi);
        const status = tooth?.condition ?? "SOUND";
        const dist = Math.abs(index - center) / center;
        const lift = Math.round(dist * dist * (upper ? -14 : 14));
        const isSelected = selected === fdi;
        return (
          <button
            key={fdi}
            type="button"
            onClick={() => onChoose(fdi)}
            aria-label={`دندان ${fdi}، ${TOOTH_LABEL[status]}`}
            aria-pressed={isSelected}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            style={{ flex: widthOf(fdi), transform: `translateY(${lift}px)`, order: 0 }}
          >
            {!upper ? <span className={`text-[9px] leading-none md:text-[10px] ${isSelected ? "font-bold text-accent-deep" : "text-muted"}`}>{faDigits(String(fdi))}</span> : null}
            <svg
              viewBox="0 0 24 24"
              className={`w-full max-w-10 transition duration-300 group-hover:-translate-y-0.5 group-active:scale-90 ${isSelected ? "drop-shadow-[0_6px_10px_rgb(180_105_58/0.55)]" : ""}`}
              style={{ transform: upper ? undefined : "scaleY(-1)" }}
            >
              <path
                d={TOOTH_PATH}
                fill={fill[status]}
                stroke={isSelected ? "var(--color-accent)" : "#8f8274"}
                strokeWidth={isSelected ? 1.8 : 1.1}
                strokeDasharray={status === "MISSING" ? "2 2" : undefined}
                opacity={status === "MISSING" ? 0.55 : 1}
              />
              {status === "IMPLANT" ? <path d="M12 13v6M10 15h4M10.5 17.5h3" stroke="#3f6b58" strokeWidth="1.2" fill="none" strokeLinecap="round" /> : null}
              {status === "ROOT_CANAL" ? <path d="M10 10v8M14 10v8" stroke="#a2651a" strokeWidth="1.1" fill="none" strokeLinecap="round" /> : null}
            </svg>
            {upper ? <span className={`text-[9px] leading-none md:text-[10px] ${isSelected ? "font-bold text-accent-deep" : "text-muted"}`}>{faDigits(String(fdi))}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
