"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  FileText,
  Share2,
  Save,
  FolderOpen,
  ArrowLeft,
  LayoutPanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useConfiguratorStore } from "@/store/configurator-store";
import { buildBom } from "@/lib/export/bom";
import { BomBasisPill, BomBasisLegend, BOM_BASIS_LABEL } from "./bom-basis-pill";
import { SaveLoadDialog } from "./save-load-dialog";
import { ShareConfigDialog } from "./share-config-dialog";
import { trackAction } from "@/lib/telemetry/client";


export function SummaryStep() {
  const {
    configuration,
    resetAll,
    setStep,
    machineDescription,
    selectedTemplate,
    machineSpecs,
  } = useConfiguratorStore();
  const [copied, setCopied] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<"save" | "load" | null>(null);
  const [showShare, setShowShare] = useState(false);

  if (!configuration) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No configuration available.</p>
        <Button className="mt-4" onClick={() => setStep("description")}>
          Start Over
        </Button>
      </div>
    );
  }

  const bomLines = buildBom(configuration);
  const totalQty = bomLines.reduce((s, l) => s + l.quantity, 0);

  const handleCopyBom = () => {
    void trackAction("export_clipboard", { items: bomLines.length, totalQty });
    const header = "Pos\tMLFB (Article Number)\tQty\tDescription\tOrder Code\tCategory\tBasis\tSource";
    const text = bomLines
      .map(
        (line, i) =>
          `${i + 1}\t${line.articleNumber}\t${line.quantity}\t${line.name}\t${line.orderCode || ""}\t${line.category}\t${BOM_BASIS_LABEL[line.basis ?? "catalog"]}\t${line.source ?? ""}`
      )
      .join("\n");
    navigator.clipboard.writeText(`${header}\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportExcel = async () => {
    void trackAction("export_excel", { items: bomLines.length, totalQty });
    const XLSX = await import("xlsx");
    const data = bomLines.map((line, i) => ({
      "#": i + 1,
      "MLFB / Article Number": line.articleNumber,
      Qty: line.quantity,
      Description: line.name,
      "Order Code": line.orderCode || "",
      Category: line.category,
      Basis: BOM_BASIS_LABEL[line.basis ?? "catalog"],
      Source: line.source ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 4 },   // #
      { wch: 28 },  // MLFB
      { wch: 5 },   // Qty
      { wch: 50 },  // Description
      { wch: 10 },  // Order Code
      { wch: 18 },  // Category
      { wch: 14 },  // Basis
      { wch: 16 },  // Source
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BOM");

    // Add a summary sheet
    const summaryData = [
      { Field: "Control Unit", Value: configuration.controlUnit.id.replace("_", " ") },
      { Field: "CNC Software", Value: `${configuration.softwareVariant} — ${configuration.cncSoftware.swVersion}` },
      { Field: "Total Axes", Value: String(configuration.totalAxes) },
      { Field: "Total Channels", Value: String(configuration.totalChannels) },
      { Field: "Complexity", Value: configuration.estimatedComplexity },
      { Field: "BOM Line Items", Value: String(bomLines.length) },
      { Field: "Total Quantity", Value: String(totalQty) },
      { Field: "", Value: "" },
      { Field: "Generated", Value: new Date().toISOString().split("T")[0] },
      { Field: "Catalog sources", Value: "NC63 / D21 / D31 — Siemens 2026" },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    // Notes sheet
    if (configuration.notes.length > 0) {
      const notesData = configuration.notes.map((n, i) => ({
        "#": i + 1,
        Note: n,
      }));
      const ws3 = XLSX.utils.json_to_sheet(notesData);
      ws3["!cols"] = [{ wch: 4 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, ws3, "Notes");
    }

    // Configuration Rationale sheet — architecture decisions in one
    // place, so a Siemens partner can audit every choice without
    // going back to the conversation.
    const rationaleData: Array<{ Field: string; Value: string }> = [
      { Field: "ARCHITECTURE", Value: "" },
      { Field: "Control Unit", Value: `${configuration.controlUnit.name} (${configuration.controlUnit.articleNumber ?? "—"})` },
      {
        Field: "CNC Software",
        Value: `${configuration.softwareVariant === "export" ? "Export" : "Full Scope"} · SW ${configuration.cncSoftware.swVersion} (${configuration.cncSoftware.articleNumber ?? "—"})`,
      },
      { Field: "Total Axes", Value: String(configuration.totalAxes) },
      { Field: "Total Channels", Value: String(configuration.totalChannels) },
      { Field: "Complexity", Value: configuration.estimatedComplexity },
    ];
    if (configuration.technologyPackages.length > 0) {
      rationaleData.push({ Field: "Technology Packages", Value: configuration.technologyPackages.map((p) => p.id).join(", ") });
    }
    if (configuration.safetyFunctions.length > 0) {
      rationaleData.push({
        Field: "Safety",
        Value: configuration.safetyFunctions
          .filter((s) => !s.isBasicScope)
          .map((s) => s.orderCode)
          .join(", ") || "Basic only (STO/SS1/SBC)",
      });
    }
    rationaleData.push({ Field: "", Value: "" });
    rationaleData.push({ Field: "WARNINGS", Value: configuration.warnings.length > 0 ? `${configuration.warnings.length} warning(s) — see Warnings sheet` : "None" });
    rationaleData.push({ Field: "", Value: "" });
    rationaleData.push({ Field: "Generated", Value: new Date().toISOString() });
    rationaleData.push({ Field: "Catalog sources", Value: "NC63 / D21 / D31 / D32 — Siemens 2026 scope" });
    rationaleData.push({ Field: "Disclaimer", Value: "Verify every MLFB with your Siemens partner before procurement." });

    const wsR = XLSX.utils.json_to_sheet(rationaleData);
    wsR["!cols"] = [{ wch: 24 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsR, "Rationale");

    // Per-axis MLFB sheet — when AI captured axis names + brakes, list
    // every axis with its full orderable MLFB and a decoder for each
    // suffix character.
    const perAxisRows: Array<Record<string, string>> = [];
    for (const motor of configuration.motors) {
      if (!motor.perAxisMlfbs || motor.perAxisMlfbs.length === 0) continue;
      for (const a of motor.perAxisMlfbs) {
        perAxisRows.push({
          Motor: motor.name,
          Axis: a.axis,
          "Full MLFB": a.mlfb,
          Brake: a.brake ? "yes" : "no",
          "Suffix decoder": (a.decoded ?? [])
            .map((d) => `${d.label}: ${d.choiceLabel} (${d.code})`)
            .join(" · "),
        });
      }
    }
    if (perAxisRows.length > 0) {
      const wsA = XLSX.utils.json_to_sheet(perAxisRows);
      wsA["!cols"] = [{ wch: 32 }, { wch: 6 }, { wch: 24 }, { wch: 6 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsA, "Per-axis MLFB");
    }

    // Warnings sheet
    if (configuration.warnings.length > 0) {
      const warningsData = configuration.warnings.map((w, i) => ({
        "#": i + 1,
        Severity: w.severity,
        Message: w.message,
      }));
      const wsW = XLSX.utils.json_to_sheet(warningsData);
      wsW["!cols"] = [{ wch: 4 }, { wch: 10 }, { wch: 90 }];
      XLSX.utils.book_append_sheet(wb, wsW, "Warnings");
    }

    XLSX.writeFile(wb, `SINUMERIK_ONE_BOM_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleExportPdf = async () => {
    void trackAction("export_pdf", { items: bomLines.length, totalQty });
    const { generatePdf } = await import("@/lib/export/pdf-generator");
    generatePdf(configuration, bomLines, {
      template: selectedTemplate,
      description: machineDescription,
      specs: machineSpecs,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 sm:gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
          >
            <Check className="h-5 w-5" strokeWidth={1.75} />
          </motion.div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Step 04 · Bill of materials
            </div>
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight">
              Complete — ready to order
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Verified MLFBs with quantities, drawn from the Siemens NC63 / D21 / D31 catalogs. Export, copy, or share to anyone in one message.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap sm:shrink-0">
          <Badge variant="outline" className="tabular-nums">{bomLines.length} items</Badge>
          <Badge variant="outline" className="tabular-nums">{totalQty} qty</Badge>
          <Badge variant="outline">{configuration.controlUnit.id.replace("_", " ")}</Badge>
        </div>
      </div>

      {/* Export actions — wrap on mobile so 6 buttons don't overflow */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleCopyBom} className="gap-1.5">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          PDF
        </Button>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShare(true)}
            className="gap-1.5"
            title="Share as text — copy a message someone else can paste back"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaveLoadMode("save")} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaveLoadMode("load")} className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Open
          </Button>
        </div>
      </div>

      <Separator />

      {/* BOM Table — horizontally scrollable on small screens */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-160">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground w-8">#</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">MLFB / Article No.</th>
              <th className="text-center py-2.5 px-3 text-[11px] font-semibold text-muted-foreground w-12">Qty</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground">Description</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Basis · Source</th>
              <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-muted-foreground">Category</th>
            </tr>
          </thead>
          <tbody>
            {bomLines.map((line, i) => (
              <motion.tr
                key={`${line.articleNumber}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="py-2 px-3 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <code className="mlfb text-[12px] text-primary">
                    {line.articleNumber}
                  </code>
                </td>
                <td className="py-2 px-3 text-center font-medium tabular-nums">{line.quantity}</td>
                <td className="py-2 px-3">
                  <span className="text-[13px]">{line.name}</span>
                  {line.orderCode && (
                    <span className="ml-1.5 text-muted-foreground text-[10px] font-mono">({line.orderCode})</span>
                  )}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <BomBasisPill basis={line.basis ?? "catalog"} />
                  {line.source && (
                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{line.source}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  <Badge variant="secondary" className="text-[9px] font-normal">{line.category}</Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <BomBasisLegend />

      {/* Notes */}
      {configuration.notes.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
          <ul className="space-y-1">
            {configuration.notes.map((note, i) => (
              <li key={i} className="text-[12px] text-muted-foreground flex gap-2">
                <span className="text-primary shrink-0">-</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setStep("configuration")} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Configuration
        </Button>
        <div className="flex gap-2">
          <Link href="/configure/system">
            <Button variant="outline" size="sm" className="gap-1.5">
              <LayoutPanelTop className="h-3.5 w-3.5" />
              View System Diagram
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => resetAll()}>
            New Configuration
          </Button>
        </div>
      </div>

      {/* Save / Load dialog */}
      {saveLoadMode && (
        <SaveLoadDialog
          open={saveLoadMode !== null}
          mode={saveLoadMode}
          onClose={() => setSaveLoadMode(null)}
        />
      )}

      {/* Share / Import-and-modify dialog */}
      {showShare && (
        <ShareConfigDialog
          open={showShare}
          onClose={() => setShowShare(false)}
          defaultTab="share"
        />
      )}
    </motion.div>
  );
}
