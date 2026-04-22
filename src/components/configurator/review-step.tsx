"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfiguratorStore } from "@/store/configurator-store";
import { CompatibilityWarnings } from "./compatibility-warning";
import { SaveLoadDialog } from "./save-load-dialog";

export function ReviewStep() {
  const { configuration, setStep, completeStep } = useConfiguratorStore();
  const [saveLoadMode, setSaveLoadMode] = useState<"save" | "load" | null>(null);

  if (!configuration) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No configuration to review.</p>
        <Button className="mt-4" onClick={() => setStep("description")}>
          Start Over
        </Button>
      </div>
    );
  }

  const handleProceed = () => {
    completeStep("review");
    setStep("summary");
  };

  // Build flat items list
  const allItems = [
    {
      category: "Control Unit",
      name: configuration.controlUnit.name,
      mlfb: configuration.controlUnit.articleNumber,
      qty: 1,
    },
    {
      category: "CNC Software",
      name: `${configuration.softwareVariant === "export" ? "Export" : "Full Scope"} — SW ${configuration.cncSoftware.swVersion}`,
      mlfb: configuration.cncSoftware.articleNumber,
      qty: 1,
    },
    ...configuration.technologyPackages.map((pkg) => ({
      category: "Package",
      name: `${pkg.name} (${pkg.orderCode})`,
      mlfb: pkg.articleNumber,
      qty: 1,
    })),
    ...configuration.softwareOptions.map((opt) => ({
      category: "Option",
      name: `${opt.name} (${opt.orderCode})`,
      mlfb: opt.articleNumber,
      qty: configuration.optionQuantities[opt.id] || 1,
    })),
    ...configuration.drives.map((d) => ({
      category: "Drive",
      name: d.name,
      mlfb: d.articleNumber,
      qty: configuration.driveQuantities[d.id] || 1,
    })),
    ...configuration.motors.map((m) => ({
      category: "Motor",
      name: m.name,
      mlfb: m.articleNumber || m.series,
      qty: configuration.motorQuantities[m.id] || 1,
    })),
    ...configuration.hmiComponents.map((h) => ({
      category: "HMI",
      name: h.name,
      mlfb: h.articleNumber,
      qty: 1,
    })),
    ...configuration.safetyFunctions
      .filter((sf) => !sf.isBasicScope && sf.articleNumber)
      .map((sf) => ({
        category: "Safety",
        name: sf.name,
        mlfb: sf.articleNumber || "",
        qty: 1,
      })),
    ...(configuration.cables || [])
      .filter((c) => c.quantity > 0)
      .map((c) => ({
        category: "Cable",
        name: c.name,
        mlfb: c.articleNumber,
        qty: c.quantity,
      })),
  ];

  const totalQty = allItems.reduce((s, i) => s + i.qty, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Review Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify all components before generating the bill of materials
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <Badge variant="outline" className="tabular-nums">{allItems.length} items</Badge>
          <Badge variant="outline" className="tabular-nums">{totalQty} total qty</Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 ml-1"
            onClick={() => setSaveLoadMode("save")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => setSaveLoadMode("load")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
            Open
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Control Unit", value: configuration.controlUnit.id.replace("_", " ") },
          { label: "Axes", value: String(configuration.totalAxes) },
          { label: "Channels", value: String(configuration.totalChannels) },
          { label: "Complexity", value: configuration.estimatedComplexity },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card px-3 py-2.5 text-center">
            <div className="text-sm font-bold text-primary">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {configuration.warnings.length > 0 && (
        <CompatibilityWarnings warnings={configuration.warnings} />
      )}

      {/* Review table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground w-8">#</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground">Component</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground">Article Number</th>
              <th className="text-center py-2.5 px-3 text-[11px] font-semibold text-muted-foreground w-12">Qty</th>
              <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-muted-foreground">Category</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, i) => (
              <motion.tr
                key={`${item.mlfb}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="py-2 px-3 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                <td className="py-2 px-3 font-medium text-[13px]">{item.name}</td>
                <td className="py-2 px-3">
                  <code className="text-[11px] font-mono text-primary/70">{item.mlfb}</code>
                </td>
                <td className="py-2 px-3 text-center tabular-nums font-medium">{item.qty}</td>
                <td className="py-2 px-3 text-right">
                  <Badge variant="secondary" className="text-[9px] font-normal">{item.category}</Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setStep("configuration")}>
          <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Button>
        <Button onClick={handleProceed} className="gap-2">
          Generate BOM
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Button>
      </div>

      {/* Save / Load dialog */}
      {saveLoadMode && (
        <SaveLoadDialog
          open={saveLoadMode !== null}
          mode={saveLoadMode}
          onClose={() => setSaveLoadMode(null)}
        />
      )}
    </motion.div>
  );
}
