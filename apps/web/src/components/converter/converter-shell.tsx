"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toast";
import { useConverterStore } from "@/store/converter-store";
import { downloadInputTemplate, exportConversionsXlsx } from "@/lib/convert-808d/export";
import { trackAction } from "@/lib/telemetry/client";
import { InputRail } from "./input-rail";
import { ConversionSummary } from "./conversion-summary";
import { ConversionList } from "./conversion-list";
import { ConversionCard } from "./conversion-card";
import { CatalogPanel } from "./catalog-panel";

export function ConverterShell() {
  const hydrate = useConverterStore((s) => s.hydrate);
  const hydrated = useConverterStore((s) => s.hydrated);
  const conversions = useConverterStore((s) => s.conversions);
  const selectedId = useConverterStore((s) => s.selectedId);
  const [showCatalog, setShowCatalog] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (showCatalog) catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showCatalog]);

  const idx = conversions.findIndex((c) => c.id === selectedId);
  const current = idx >= 0 ? conversions[idx] : null;

  const handleExportAll = async () => {
    if (!conversions.length) {
      toast.warning("Nothing to export yet");
      return;
    }
    try {
      await exportConversionsXlsx(conversions, "828D_Smart_configurations.xlsx");
      void trackAction("export", { format: "xlsx", feature: "convert_808d", configurations: conversions.length });
    } catch (err) {
      toast.error("Export failed", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex h-14 items-center gap-3 sm:gap-6">
            <Link href="/" className="group flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/70 shadow-sm shadow-primary/20 transition-shadow group-hover:shadow-primary/40">
                <span className="text-xs font-bold tracking-tight text-primary-foreground">S</span>
              </div>
              <div className="text-sm font-semibold tracking-tight">
                <span className="text-foreground">SINUMERIK</span>
                <span className="ml-1 text-muted-foreground">Configurator</span>
              </div>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">808D → 828D Smart converter</div>
              <div className="hidden truncate text-[11px] text-muted-foreground sm:block">
                SINUMERIK 808D ADVANCED configurations re-selected from the 828D Smart product catalogue
              </div>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void downloadInputTemplate()}>
            <FileSpreadsheet data-icon="inline-start" />
            Download Excel template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCatalog((v) => !v)} aria-expanded={showCatalog}>
            <BookOpen data-icon="inline-start" />
            {showCatalog ? "Hide 828D Smart catalogue" : "Show 828D Smart catalogue"}
          </Button>
          <Button size="sm" className="ml-auto" onClick={handleExportAll}>
            <Download data-icon="inline-start" />
            Export all as Excel
          </Button>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
          <InputRail />
          <div className="flex min-w-0 flex-col gap-4">
            <ConversionSummary current={current} index={idx} total={conversions.length} />
            <ConversionList />
            {!hydrated ? null : current ? (
              <ConversionCard conversion={current} />
            ) : (
              <div className="rounded-lg border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                No configurations yet. Paste rows from Excel on the left, or upload one or more files.
              </div>
            )}
            {showCatalog && (
              <div ref={catalogRef}>
                <CatalogPanel />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
