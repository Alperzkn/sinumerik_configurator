"use client";

import { useRef, useState } from "react";
import { FileUp, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useConverterStore } from "@/store/converter-store";
import { parseText, rowsFromSheetMatrix, textToMatrix } from "@/lib/convert-808d/parser";
import type { InputRow, LineBasis } from "@/lib/convert-808d/types";
import { trackAction } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { BasisPill, BASIS_HELP, BASIS_TEXT } from "./basis-pill";

const PLACEHOLDER = `1FL6064-1AC61-2AA1\t3\tSIMOTICS S-1FL6 1.5 kW 2000 rpm
6FC5370-2AM03-0AA0\t1\tSINUMERIK 808D ADVANCED M PPU 161.3 horizontal
6SL3210-5DE16-0UA0\t3\tSINAMICS V70 5.8 A`;

const LEGEND: LineBasis[] = ["pdf", "derived", "verified", "review", "none", "replaced"];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-3 p-3.5">{children}</div>
    </section>
  );
}

export function InputRail() {
  const addConversion = useConverterStore((s) => s.addConversion);
  const loadExample = useConverterStore((s) => s.loadExample);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const commit = (rows: InputRow[], unparsed: string[], source: string) => {
    addConversion(name, rows, unparsed);
    setText("");
    setName("");
    void trackAction("convert_808d", { source, rows: rows.length, unparsed: unparsed.length });
  };

  const handleConvert = () => {
    const { rows, unparsed } = parseText(text);
    if (!rows.length && !unparsed.length) {
      toast.warning("Nothing to convert", "Paste rows from Excel first.");
      return;
    }
    if (!rows.length) {
      toast.warning("No Siemens article numbers found", "Try “Read with AI” for messy text.");
      return;
    }
    commit(rows, unparsed, "paste");
    toast.success(`Converted ${rows.length} line${rows.length === 1 ? "" : "s"}`);
  };

  const handleAi = async () => {
    const body = text.trim();
    if (!body) {
      toast.warning("Paste some text first");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/convert/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      const data = (await res.json()) as { rows?: InputRow[]; message?: string };
      if (!res.ok) {
        toast.error("AI reading failed", data.message ?? `HTTP ${res.status}`);
        return;
      }
      const rows = data.rows ?? [];
      if (!rows.length) {
        toast.warning("AI found no article numbers");
        return;
      }
      commit(rows, [], "ai");
      toast.success(`AI read ${rows.length} lines`, "Products were selected by the rule engine.");
    } catch (err) {
      toast.error("AI reading failed", err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(false);
    }
  };

  const handleFiles = async (list: FileList | File[] | null) => {
    if (!list) return;
    let n = 0;
    for (const f of Array.from(list)) {
      const base = f.name.replace(/\.[^.]+$/, "");
      try {
        if (/\.(xlsx|xls)$/i.test(f.name)) {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
          for (const sn of wb.SheetNames) {
            const mx = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], {
              header: 1,
              raw: false,
              defval: "",
            });
            if (!mx.length) continue;
            const cfgName = wb.SheetNames.length > 1 && !/^sheet\d*$/i.test(sn) ? `${base} – ${sn}` : base;
            for (const c of rowsFromSheetMatrix(mx, cfgName)) {
              if (c.rows.length) {
                addConversion(c.name, c.rows, c.unparsed);
                n++;
              }
            }
          }
        } else {
          const mx = textToMatrix(await f.text());
          for (const c of rowsFromSheetMatrix(mx, base)) {
            if (c.rows.length) {
              addConversion(c.name, c.rows, c.unparsed);
              n++;
            }
          }
        }
      } catch (err) {
        toast.error(`Could not read ${f.name}`, err instanceof Error ? err.message : String(err));
      }
    }
    if (n) {
      toast.success(`${n} configuration${n === 1 ? "" : "s"} converted`);
      void trackAction("convert_808d", { source: "file", configurations: n });
    } else {
      toast.warning("No article numbers found in the file(s)");
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[4.5rem]">
      <Panel title="Paste from Excel">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Configuration name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. VMC 850 – customer X"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Rows copied from Excel (description, article number and quantity in any column order)
          </span>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            className="min-h-40 whitespace-pre font-mono text-xs leading-relaxed"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={handleConvert} disabled={aiBusy}>
            <Wand2 data-icon="inline-start" />
            Convert pasted rows
          </Button>
          <Button
            variant="outline"
            onClick={handleAi}
            disabled={aiBusy}
            title="Uses Claude only to read the pasted text into rows; product selection stays rule-based"
          >
            <Sparkles data-icon="inline-start" />
            {aiBusy ? "Reading…" : "Read with AI"}
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Rule-based reading works on tab-separated cells. “Read with AI” helps with messy text (merged
          cells, quantities written as words, PDF copies). AI never chooses products.{" "}
          <button type="button" onClick={loadExample} className="text-primary underline-offset-2 hover:underline">
            Load the example list
          </button>
        </p>
      </Panel>

      <Panel title="Upload configuration files">
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-4 py-5 text-center text-xs text-muted-foreground transition-colors",
            dragOver ? "border-primary bg-primary/8 text-foreground" : "border-border bg-muted/30 hover:bg-muted/50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.txt,.tsv"
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <FileUp className="h-4 w-4" />
          <span>
            Drop .xlsx / .csv files here or click to choose. Each file (or each “Configuration” value in the
            template) becomes one configuration.
          </span>
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Template columns: <Kbd>Configuration</Kbd> <Kbd>Article No.</Kbd> <Kbd>Qty</Kbd> <Kbd>Description</Kbd>.
          Any spreadsheet with an article-number column also works.
        </p>
      </Panel>

      <Panel title="Selection rules">
        <dl className="grid grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-2 text-xs text-muted-foreground">
          {LEGEND.map((k) => (
            <div key={k} className="contents">
              <dt>
                <BasisPill cls={k} label={k === "pdf" ? "PDF p.xx" : BASIS_TEXT[k]} />
              </dt>
              <dd className="leading-snug">{BASIS_HELP[k]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Products are only taken from the “SINUMERIK 828D Smart system – Details” PDF. Cables are the one
          exception, and they are marked.
        </p>
      </Panel>
    </aside>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border bg-muted/50 px-1 font-mono text-[11px] text-foreground">{children}</span>
  );
}
