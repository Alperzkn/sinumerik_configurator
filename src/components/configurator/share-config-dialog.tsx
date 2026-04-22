"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useConfiguratorStore } from "@/store/configurator-store";
import {
  parseSharedConfigText,
  serializeConfigAsShareableText,
  ShareParseError,
  type SharedConfigPayload,
} from "@/lib/share/config-sharing";
import { modifyConfiguration } from "@/lib/ai/modify-engine";
import type { UserSpecsInput } from "@/lib/sizing";

interface ShareConfigDialogProps {
  open: boolean;
  onClose: () => void;
  /** Which tab to show first. Defaults to "share" when a config exists, "import" otherwise. */
  defaultTab?: "share" | "import";
}

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
  const [tab, setTab] = useState<"share" | "import">(initialTab);
  const [copied, setCopied] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareRef = useRef<HTMLTextAreaElement>(null);

  // Keep internal tab state in sync with the prop when the dialog reopens.
  useEffect(() => {
    if (open) {
      setTab(defaultTab ?? (configuration ? "share" : "import"));
      setError(null);
      setCopied(false);
    }
  }, [open, defaultTab, configuration]);

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
      const parseNum = (s: string) => {
        const m = (s || "").match(/([\d.]+)/);
        return m ? parseFloat(m[1]) : undefined;
      };
      const baselineSpecs: UserSpecsInput = {
        spindlePowerKw: parseNum(payload.machineSpecs.spindlePower),
        spindleMaxRpm: parseNum(payload.machineSpecs.spindleSpeed),
        movingMassKg: parseNum(payload.machineSpecs.movingMass),
        rapidTraverseMpm: parseNum(payload.machineSpecs.rapidTraverse),
        machineSize: payload.machineSpecs.machineSize as UserSpecsInput["machineSize"],
        material: payload.machineSpecs.material,
      };

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
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Share configuration as text</DialogTitle>
          <DialogDescription className="text-xs">
            Copy this config as a single message you can paste into chat or email — and load/modify
            configurations others have shared.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab((v as "share" | "import") || "share")} className="px-5 pt-3 pb-5 gap-3">
          <TabsList>
            <TabsTrigger value="share" disabled={!configuration}>
              Share
            </TabsTrigger>
            <TabsTrigger value="import">Import & modify</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-3">
            {!configuration ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No configuration to share yet — build one first.
              </div>
            ) : (
              <>
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
                        <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                        </svg>
                        Copy to clipboard
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-3">
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

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                The loaded config replaces your current wizard state. Modify requests go through the
                existing AI modify pipeline.
              </div>
              <div className="flex gap-2">
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
                  {isProcessing ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="30 60" />
                    </svg>
                  ) : null}
                  {changeRequest.trim() ? "Load & modify" : "Load"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end px-5 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
