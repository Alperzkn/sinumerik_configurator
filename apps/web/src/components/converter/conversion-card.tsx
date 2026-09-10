"use client";

import { Fragment, useState } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useConverterStore } from "@/store/converter-store";
import { conversionToTsv, exportConversionsXlsx, safeName } from "@/lib/convert-808d/export";
import { isSelectedLine } from "@/lib/convert-808d/engine";
import type { Conversion, NoteLevel } from "@/lib/convert-808d/types";
import { trackAction } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { BasisPill, basisLabel } from "./basis-pill";

const NOTE_DOT: Record<NoteLevel, string> = {
  info: "bg-sky-500",
  warn: "bg-amber-500",
  crit: "bg-destructive",
  ok: "bg-emerald-500",
};

const TH = "whitespace-nowrap border-b px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";
const TD = "border-b border-border/60 px-2.5 py-2 align-top";

export function ConversionCard({ conversion }: { conversion: Conversion }) {
  const view = useConverterStore((s) => s.views[conversion.id] ?? "result");
  const setView = useConverterStore((s) => s.setView);
  const rename = useConverterStore((s) => s.renameConversion);
  const remove = useConverterStore((s) => s.removeConversion);
  const [nameDraft, setNameDraft] = useState(conversion.name);
  const [editingId, setEditingId] = useState(conversion.id);

  // Reset the draft when a different conversion is shown in this slot.
  if (editingId !== conversion.id) {
    setEditingId(conversion.id);
    setNameDraft(conversion.name);
  }

  const res = conversion.result;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(conversionToTsv(conversion));
      toast.success("Copied", "Paste into Excel.");
      void trackAction("export", { format: "clipboard", feature: "convert_808d" });
    } catch {
      toast.error("Clipboard not available");
    }
  };

  const handleExport = async () => {
    try {
      await exportConversionsXlsx([conversion], `${safeName(conversion.name)}_828D_Smart.xlsx`);
      void trackAction("export", { format: "xlsx", feature: "convert_808d" });
    } catch (err) {
      toast.error("Export failed", err instanceof Error ? err.message : String(err));
    }
  };

  // Precompute where a new group starts so the render stays pure.
  const groupStarts = new Set<number>();
  res.lines.forEach((l, i) => {
    if (i === 0 || l.grp !== res.lines[i - 1].grp) groupStarts.add(i);
  });

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-3.5 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Input
            aria-label="Configuration name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => rename(conversion.id, nameDraft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-auto min-w-56 bg-background font-medium"
          />
          <span className="text-xs text-muted-foreground">
            {conversion.rows.length} input lines · {res.tech === "T" ? "turning" : "milling"} · PPU{" "}
            {res.orient === "V" ? "vertical" : "horizontal"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy data-icon="inline-start" />
            Copy as table
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download data-icon="inline-start" />
            Export Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => remove(conversion.id)}>
            <Trash2 data-icon="inline-start" />
            Remove
          </Button>
        </div>
      </header>

      <div className="flex gap-1 border-b px-3.5 pt-2" role="tablist">
        {(["result", "input"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={view === v}
            onClick={() => setView(conversion.id, v)}
            className={cn(
              "-mb-px rounded-t-md border border-b-0 border-transparent px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              view === v && "border-border bg-card text-foreground",
            )}
          >
            {v === "result" ? "828D Smart selection" : "808D input as read"}
          </button>
        ))}
      </div>

      {view === "result" ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>828D Smart article</th>
                  <th className={cn(TH, "text-right")}>Qty</th>
                  <th className={TH}>Description</th>
                  <th className={TH}>Basis</th>
                  <th className={TH}>Source</th>
                  <th className={TH}>Replaces (808D)</th>
                </tr>
              </thead>
              <tbody>
                {res.lines.map((l, i) => {
                  const groupRow = groupStarts.has(i) ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        {l.grp}
                      </td>
                    </tr>
                  ) : null;
                  const showOrigQty = l.origQty != null && l.orig && !l.orig.startsWith("(");
                  return (
                    <Fragment key={i}>
                      {groupRow}
                      <tr>
                        <td className={cn(TD, "whitespace-nowrap font-mono text-xs font-medium")}>{l.mlfb}</td>
                        <td className={cn(TD, "whitespace-nowrap text-right tabular-nums")}>
                          {isSelectedLine(l) ? l.qty : ""}
                        </td>
                        <td className={cn(TD, "min-w-64")}>
                          {l.desc}
                          {l.note && <div className="mt-1 text-xs text-muted-foreground">{l.note}</div>}
                        </td>
                        <td className={TD}>
                          <BasisPill cls={l.cls} label={basisLabel(l)} />
                        </td>
                        <td className={cn(TD, "min-w-56 text-xs text-muted-foreground")}>{l.src}</td>
                        <td className={cn(TD, "min-w-48 text-xs text-muted-foreground")}>
                          <span className="font-mono">
                            {l.orig}
                            {showOrigQty ? ` ×${l.origQty}` : ""}
                          </span>
                          {l.origDesc && <div className="mt-0.5">{l.origDesc}</div>}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-1.5 border-t px-3.5 py-3 text-[13px]">
            {res.notes.map(([k, t], i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", NOTE_DOT[k])} aria-label={k} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={TH}>808D article</th>
                <th className={cn(TH, "text-right")}>Qty</th>
                <th className={TH}>Description</th>
              </tr>
            </thead>
            <tbody>
              {conversion.rows.length ? (
                conversion.rows.map((r, i) => (
                  <tr key={i}>
                    <td className={cn(TD, "whitespace-nowrap font-mono text-xs font-medium")}>{r.mlfb}</td>
                    <td className={cn(TD, "whitespace-nowrap text-right tabular-nums")}>
                      {r.qty}
                      {r.qtyAssumed && <BasisPill cls="review" label="assumed" className="ml-1.5" />}
                    </td>
                    <td className={TD}>{r.desc}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-3.5 py-8 text-center text-muted-foreground">
                    No article numbers recognised.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {conversion.unparsed.length > 0 && (
        <details className="border-t">
          <summary className="cursor-pointer px-3.5 py-2.5 text-[13px] text-muted-foreground">
            {conversion.unparsed.length} line(s) could not be read (no article number found)
          </summary>
          <pre className="whitespace-pre-wrap px-3.5 pb-3 font-mono text-xs text-destructive">
            {conversion.unparsed.join("\n")}
          </pre>
        </details>
      )}
    </section>
  );
}
