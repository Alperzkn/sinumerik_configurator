"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useConfiguratorStore } from "@/store/configurator-store";
import { SystemVisualization } from "@/components/configurator/system-visualization";
import { SelectionSidebar } from "@/components/configurator/selection-sidebar";

export default function SystemPage() {
  const configuration = useConfiguratorStore((s) => s.configuration);

  if (!configuration) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">No Configuration Found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the configurator first to view the system diagram.
          </p>
        </div>
        <Link href="/configure">
          <Button>Go to Configurator</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SelectionSidebar />

      <div className="pr-12 transition-all duration-300">
        {/* Shared header matching wizard */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center h-14 gap-8">
              <Link href="/" className="shrink-0 flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">S1</span>
                </div>
                <div className="text-sm font-semibold tracking-tight">
                  <span className="text-foreground">SINUMERIK</span>
                  <span className="text-muted-foreground ml-1">Configurator</span>
                </div>
              </Link>

              <div className="h-5 w-px bg-border" />

              <div className="flex items-center gap-3 text-sm">
                <Link href="/configure" className="text-muted-foreground hover:text-foreground transition-colors">
                  Configuration
                </Link>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-foreground font-medium">System Diagram</span>
              </div>

              <div className="flex-1" />

              <Link href="/configure">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                  Back to BOM
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold">System Diagram</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visual overview of your SINUMERIK ONE drive system architecture
            </p>
          </div>
          <SystemVisualization configuration={configuration} />
        </main>
      </div>
    </div>
  );
}
