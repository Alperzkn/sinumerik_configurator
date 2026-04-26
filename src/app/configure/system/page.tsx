"use client";

import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
          <AlertCircle className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
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

      <div className="md:pr-12 transition-all duration-300">
        {/* Shared header matching wizard */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center h-14 gap-3 sm:gap-8">
              <Link href="/" className="shrink-0 flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">S</span>
                </div>
                <div className="text-sm font-semibold tracking-tight">
                  <span className="text-foreground">SINUMERIK</span>
                  <span className="text-muted-foreground ml-1">Configurator</span>
                </div>
              </Link>

              <div className="h-5 w-px bg-border" />

              <div className="hidden sm:flex items-center gap-3 text-sm min-w-0">
                <Link href="/configure" className="text-muted-foreground hover:text-foreground transition-colors">
                  Configuration
                </Link>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-foreground font-medium truncate">System Diagram</span>
              </div>

              <div className="flex-1" />

              <Link href="/configure" className="shrink-0">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">Back to BOM</span>
                  <span className="xs:hidden sm:hidden">Back</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
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
