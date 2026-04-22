"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  listSavedConfigs,
  saveConfig,
  loadConfig,
  deleteConfig,
  exportConfigAsJson,
  importConfigFromFile,
  type SavedConfig,
} from "@/lib/storage/saved-configs";
import { useConfiguratorStore } from "@/store/configurator-store";

type Mode = "save" | "load";

interface SaveLoadDialogProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function SaveLoadDialog({ open, mode, onClose }: SaveLoadDialogProps) {
  const {
    machineDescription,
    selectedTemplate,
    machineSpecs,
    configuration,
    loadSavedSnapshot,
  } = useConfiguratorStore();

  const [saved, setSaved] = useState<SavedConfig[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSaved(listSavedConfigs());
      setError(null);
      setInfo(null);
      if (mode === "save") {
        // Default name: template + timestamp
        const t = selectedTemplate ? selectedTemplate.replace(/_/g, " ") : "Custom";
        const stamp = new Date().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
        setName(`${t} — ${stamp}`);
      } else {
        setName("");
      }
    }
  }, [open, mode, selectedTemplate]);

  const handleSave = () => {
    if (!configuration) {
      setError("There is no configuration to save yet.");
      return;
    }
    try {
      const result = saveConfig(name, {
        machineDescription,
        selectedTemplate,
        machineSpecs,
        configuration,
      });
      setSaved(listSavedConfigs());
      setInfo(`Saved as "${result.name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    }
  };

  const handleLoad = (id: string) => {
    const cfg = loadConfig(id);
    if (!cfg) {
      setError("Saved configuration not found.");
      return;
    }
    loadSavedSnapshot(cfg.data);
    onClose();
  };

  const handleDelete = (id: string) => {
    deleteConfig(id);
    setSaved(listSavedConfigs());
    setInfo("Deleted.");
  };

  const handleExport = (cfg: SavedConfig) => {
    exportConfigAsJson(cfg);
  };

  const handleImport = async (file: File) => {
    try {
      const result = await importConfigFromFile(file);
      setSaved(listSavedConfigs());
      setInfo(`Imported "${result.name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">
            {mode === "save" ? "Save Configuration" : "Load Configuration"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "save"
              ? "Saved to this browser. Use Export to share or back up to a file."
              : "Restore a previously saved configuration. You can also import a JSON file."}
          </DialogDescription>
        </DialogHeader>

        {mode === "save" && (
          <div className="px-5 py-3 space-y-2 border-b bg-muted/20">
            <label className="text-xs font-medium text-muted-foreground block">
              Name
            </label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5-axis mold-making cell — rev 3"
                className="text-sm flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleSave} disabled={!configuration}>
                Save
              </Button>
            </div>
          </div>
        )}

        <div className="px-5 py-2 flex items-center justify-between border-b text-[11px] text-muted-foreground">
          <span>{saved.length === 0 ? "No saved configurations yet." : `${saved.length} saved`}</span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              Import JSON…
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="px-5 py-3 space-y-1.5">
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nothing saved yet. {mode === "save" ? "Type a name above and click Save." : "Save a configuration first or import a JSON file."}
              </p>
            ) : (
              saved.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border/60 bg-card p-2.5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{formatRelative(c.savedAt)}</span>
                        {c.data.selectedTemplate && (
                          <Badge variant="outline" className="text-[9px]">
                            {c.data.selectedTemplate.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {c.data.configuration?.totalAxes ? (
                          <Badge variant="outline" className="text-[9px]">
                            {c.data.configuration.totalAxes} axes
                          </Badge>
                        ) : null}
                        {c.data.configuration?.controlUnit?.id ? (
                          <Badge variant="outline" className="text-[9px]">
                            {c.data.configuration.controlUnit.id.replace("_", " ")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleExport(c)}
                        title="Download as JSON"
                      >
                        Export
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleLoad(c.id)}
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {(error || info) && (
          <div
            className={cn(
              "px-5 py-2 text-xs border-t",
              error
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-500/10 text-emerald-400"
            )}
          >
            {error ?? info}
          </div>
        )}

        <div className="flex justify-end px-5 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
