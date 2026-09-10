"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, Bookmark } from "lucide-react";
import { useConfiguratorStore } from "@/store/configurator-store";
import { listSavedConfigs, saveConfig, type SavedConfig } from "@/lib/storage/saved-configs";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const EMPTY: SavedConfig[] = [];
let cache: { rev: number; list: SavedConfig[] } | null = null;

function getSnapshot(): SavedConfig[] {
  const rev = useConfiguratorStore.getState().savedConfigsRevision;
  if (!cache || cache.rev !== rev) cache = { rev, list: listSavedConfigs() };
  return cache.list;
}

function warningCount(c: SavedConfig): number {
  return c.data.configuration.warnings.filter((w) => w.severity !== "info").length;
}

/**
 * One chip per saved configuration so several machines can be worked on
 * side by side. Switching auto-saves the current work first, so nothing
 * is lost: a configuration loaded from a chip is written back under the
 * same name; an unsaved one is stored as "Unsaved work — <time>".
 */
export function SavedConfigChips() {
  const saved = useSyncExternalStore(useConfiguratorStore.subscribe, getSnapshot, () => EMPTY);
  const activeSavedId = useConfiguratorStore((s) => s.activeSavedId);
  const configuration = useConfiguratorStore((s) => s.configuration);
  const machineDescription = useConfiguratorStore((s) => s.machineDescription);
  const selectedTemplate = useConfiguratorStore((s) => s.selectedTemplate);
  const machineSpecs = useConfiguratorStore((s) => s.machineSpecs);
  const loadSavedSnapshot = useConfiguratorStore((s) => s.loadSavedSnapshot);
  const setActiveSavedId = useConfiguratorStore((s) => s.setActiveSavedId);
  const bumpSavedConfigs = useConfiguratorStore((s) => s.bumpSavedConfigs);

  if (!saved.length) return null;

  const currentIsUnsaved = !!configuration && !activeSavedId;

  const switchTo = (target: SavedConfig) => {
    if (target.id === activeSavedId) return;
    if (configuration) {
      const active = activeSavedId ? saved.find((c) => c.id === activeSavedId) : null;
      const name =
        active?.name ??
        `Unsaved work — ${new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
      saveConfig(name, { machineDescription, selectedTemplate, machineSpecs, configuration });
      if (!active) toast.info("Current work saved", name);
    }
    loadSavedSnapshot(target.data, target.id);
    bumpSavedConfigs();
    toast.success("Switched configuration", target.name);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Saved configurations">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {currentIsUnsaved && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 py-0.5 px-2.5 text-[12px]"
          role="tab"
          aria-selected
          onClick={() => setActiveSavedId(null)}
        >
          Current (unsaved)
        </span>
      )}
      {saved.map((c) => {
        const active = c.id === activeSavedId;
        const warn = warningCount(c);
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => switchTo(c)}
            title={new Date(c.savedAt).toLocaleString()}
            className={cn(
              "inline-flex max-w-64 items-center gap-1.5 rounded-full border bg-card py-0.5 px-2.5 text-[12px] transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "border-primary bg-primary/10",
            )}
          >
            <span className="truncate">{c.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {c.data.configuration.controlUnit.id.replace("_", " ")}
            </span>
            {warn > 0 && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                title={`${warn} warning(s)`}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {warn}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
