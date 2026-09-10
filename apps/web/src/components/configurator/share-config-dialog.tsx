"use client";

import { useMemo, useRef, useState } from "react";
import { specsToSizingInput } from "@/lib/sizing/specs-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useConfiguratorStore } from "@/store/configurator-store";
import {
  parseSharedConfigText,
  serializeConfigAsShareableText,
  ShareParseError,
  type SharedConfigPayload,
} from "@/lib/share/config-sharing";
import { modifyConfiguration } from "@/lib/ai/modify-engine";
import { parseText, rowsFromSheetMatrix, textToMatrix } from "@/lib/convert-808d/parser";
import { importBomRows, type BomImportResult } from "@/lib/import/bom-import";
import { EMPTY_MACHINE_SPECS } from "@/store/configurator-store";
import type { InputRow } from "@/lib/convert-808d/types";

interface ShareConfigDialogProps {
  open: boolean;
  onClose: () => void;
  /** Which tab to show first. Defaults to "share" when a config exists, "import" otherwise. */
  defaultTab?: ShareTab;
}

type ShareTab = "share" | "import" | "bom";

export function ShareConfigDialog({ open, onClose, defaultTab }: ShareConfigDialogProps) {
  const {
    configuration,
    machineDescription,
    selectedTemplate,
    machineSpecs,
    loadSavedSnapshot,
    setConfiguration,
    pushHistory,
  } = useConfiguratorStore();

  const initialTab = defaultTab ?? (configuration ? "share" : "import");
  const [tab, setTab] = useState<ShareTab>(initialTab);
  // "Import BOM" tab: pasted / uploaded article rows → catalog match preview.
  const [bomText, setBomText] = useState("");
  const [bomSourceName, setBomSourceName] = useState("");
  const [bomPreview, setBomPreview] = useState<BomImportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareRef = useRef<HTMLTextAreaElement>(null);

  // Keep internal tab state in sync with the prop when the dialog reopens.
  // "Adjust state while rendering" pattern — no effect, no extra commit.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTab(defaultTab ?? (configuration ? "share" : "import"));
      setError(null);
      setCopied(false);
    }
  }

  const shareText = useMemo(() => {
    if (!configuration) return "";
    const payload: SharedConfigPayload = {
      machineDescription,
      selectedTemplate,
      machineSpecs,
      configuration,
    };
    const title = selectedTemplate
      ? `${selectedTemplate.replace(/_/g, " ")} (${configuration.totalAxes} axes)`
      : `${configuration.totalAxes}-axis ${configuration.controlUnit.id}`;
    return serializeConfigAsShareableText(payload, { title });
  }, [configuration, machineDescription, selectedTemplate, machineSpecs]);

  const handleCopy = async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Copied", "Paste it anywhere to share your configuration.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the textarea so user can Cmd/Ctrl+C manually.
      shareRef.current?.select();
      toast.info("Select and copy manually", "Clipboard API unavailable in this context.");
    }
  };

  const parsePastedPayload = (): SharedConfigPayload | null => {
    setError(null);
    try {
      return parseSharedConfigText(pastedText);
    } catch (e) {
      const msg =
        e instanceof ShareParseError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not parse the pasted text.";
      setError(msg);
      toast.error("Import failed", msg);
      return null;
    }
  };

  const runBomImport = (rows: InputRow[], sourceName: string) => {
    if (!rows.length) {
      toast.warning("No article numbers found", "Each line needs a Siemens MLFB.");
      return;
    }
    setBomSourceName(sourceName);
    setBomPreview(importBomRows(rows));
  };

  const handleBomFiles = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    try {
      let rows: InputRow[] = [];
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
        for (const sn of wb.SheetNames) {
          const mx = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: "" });
          for (const c of rowsFromSheetMatrix(mx, f.name)) rows = rows.concat(c.rows);
        }
      } else {
        for (const c of rowsFromSheetMatrix(textToMatrix(await f.text()), f.name)) rows = rows.concat(c.rows);
      }
      runBomImport(rows, f.name);
    } catch (e) {
      toast.error(`Could not read ${f.name}`, e instanceof Error ? e.message : String(e));
    }
  };

  const handleBomLoad = () => {
    if (!bomPreview) return;
    loadSavedSnapshot({
      machineDescription: `Imported bill of materials${bomSourceName ? ` (${bomSourceName})` : ""}`,
      selectedTemplate: null,
      machineSpecs: { ...EMPTY_MACHINE_SPECS },
      configuration: bomPreview.configuration,
    });
    pushHistory({ kind: "load", title: "Imported bill of materials", snapshot: bomPreview.configuration });
    toast.success(
      "Bill of materials imported",
      `${bomPreview.matched} line(s) matched${bomPreview.unmatched.length ? `, ${bomPreview.unmatched.length} unmatched` : ""}.`,
    );
    setBomPreview(null);
    setBomText("");
    onClose();
  };

  const handleLoadOnly = () => {
    const payload = parsePastedPayload();
    if (!payload) return;
    loadSavedSnapshot(payload);
    pushHistory({
      kind: "load",
      title: "Loaded from shared text",
      snapshot: payload.configuration,
    });
    toast.success("Configuration loaded", "Ready to review or modify.");
    onClose();
  };

  const handleLoadAndModify = async () => {
    const payload = parsePastedPayload();
    if (!payload) return;

    if (!changeRequest.trim()) {
      handleLoadOnly();
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1 — load the pasted config
      loadSavedSnapshot(payload);
      pushHistory({
        kind: "load",
        title: "Loaded from shared text",
        snapshot: payload.configuration,
      });

      // Step 2 — apply the modification
      const baselineSpecs = specsToSizingInput(payload.machineSpecs);

      const result = await modifyConfiguration(
        payload.configuration,
        changeRequest.trim(),
        baselineSpecs
      );

      if (result.updatedConfiguration) {
        setConfiguration(result.updatedConfiguration);
        pushHistory({
          kind: "ai_modify",
          title: changeRequest.trim(),
          details: result.summary,
          snapshot: result.updatedConfiguration,
        });
        toast.success("Loaded and modified", result.summary);
        if (result.warnings?.length) {
          toast.warning("Heads-up", result.warnings.join("\n"));
        }
      } else {
        // Load succeeded but modify didn't produce a change
        toast.warning(
          "Loaded — modification not applied",
          result.warnings?.join("\n") || result.summary
        );
      }
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast.error("Modify failed after load", msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0! gap-0! max-w-[min(48rem,calc(100vw-2rem))]! sm:max-w-[min(48rem,calc(100vw-2rem))]! max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">Share configuration as text</DialogTitle>
          <DialogDescription className="text-xs">
            Copy this config as a single message you can paste into chat or email — and load/modify
            configurations others have shared.
          </DialogDescription>
        </DialogHeader>

        {/* Segmented tab switcher — plain state, avoids Tabs-primitive layout quirks */}
        <div className="px-5 pt-3 shrink-0">
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab("share")}
              disabled={!configuration}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                tab === "share"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => setTab("import")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors",
                tab === "import"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Import & modify
            </button>
            <button
              type="button"
              onClick={() => setTab("bom")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors",
                tab === "bom"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Import BOM
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "share" ? (
            !configuration ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No configuration to share yet — build one first.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-muted-foreground">
                  The markdown summary is human-readable; the trailing comment carries a
                  base64-encoded payload that lets the app reload the exact configuration.
                </div>
                <Textarea
                  ref={shareRef}
                  value={shareText}
                  readOnly
                  aria-label="Shareable configuration text"
                  className="min-h-[280px] text-[11px] font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {shareText.length.toLocaleString()} chars
                  </div>
                  <Button size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy to clipboard
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          ) : tab === "bom" ? (
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground">
                Bring in an existing parts list: paste rows from Excel (article number, quantity and
                description in any column order) or upload an .xlsx / .csv. Every article is matched
                against the local Siemens catalog; anything unknown is listed, never guessed.
              </div>
              <Textarea
                value={bomText}
                onChange={(e) => setBomText(e.target.value)}
                spellCheck={false}
                placeholder={"6FC5317-5AA00-0AA1\t1\tNCU 1750\n6SL3120-1TE21-0AD0\t3\tMotor Module 9 A\n1FT7064-5AF71-1DA1\t3\t1FT7 servo motor"}
                className="min-h-[140px] whitespace-pre text-[11px] font-mono"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[12px] text-primary underline-offset-2 hover:underline cursor-pointer">
                  Upload .xlsx / .csv instead
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.tsv"
                    className="sr-only"
                    onChange={(e) => {
                      void handleBomFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runBomImport(parseText(bomText).rows, "pasted rows")}
                  disabled={!bomText.trim()}
                >
                  Match against catalog
                </Button>
              </div>

              {bomPreview && (
                <div className="rounded-md border bg-muted/20 p-3 text-[12px] space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong className="tabular-nums">{bomPreview.matched}</strong> matched
                    </span>
                    <span className={bomPreview.unmatched.length ? "text-amber-600 dark:text-amber-300" : ""}>
                      <strong className="tabular-nums">{bomPreview.unmatched.length}</strong> unmatched
                    </span>
                    <span>
                      {bomPreview.configuration.controlUnit.name} · {bomPreview.configuration.totalAxes} axes
                    </span>
                  </div>
                  {bomPreview.notes.length > 0 && (
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      {bomPreview.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {bomPreview.unmatched.length > 0 && (
                    <pre className="max-h-28 overflow-auto rounded bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
                      {bomPreview.unmatched.map((u) => `${u.mlfb}\t${u.qty}\t${u.desc}`).join("\n")}
                    </pre>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleBomLoad}>
                      Load into configurator
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Paste the shared configuration text
                </label>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the full shared message here (markdown BOM plus the trailing comment), or a .json export."
                  className="min-h-[180px] text-[11px] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Optional — what should the AI change?
                </label>
                <Textarea
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="e.g. 'Make the spindle 40 kW and switch to an Active Line Module' — leave empty to just load the config."
                  className="min-h-[72px] text-[13px]"
                  disabled={isProcessing}
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] text-muted-foreground max-w-[320px]">
                  The loaded config replaces your current wizard state. Modify requests go through the
                  existing AI modify pipeline.
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadOnly}
                    disabled={!pastedText.trim() || isProcessing}
                  >
                    Load only
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLoadAndModify}
                    disabled={!pastedText.trim() || isProcessing}
                    className="gap-1.5"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {changeRequest.trim() ? "Load & modify" : "Load"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
