"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useConfiguratorStore } from "@/store/configurator-store";
import type { GeneratedConfiguration, BomItem } from "@/types/catalog";

function buildBom(config: GeneratedConfiguration): BomItem[] {
  const lines: BomItem[] = [];

  lines.push({
    articleNumber: config.controlUnit.articleNumber,
    name: config.controlUnit.name,
    quantity: 1,
    category: "Control Unit",
  });

  lines.push({
    articleNumber: config.cncSoftware.articleNumber,
    name: config.cncSoftware.description,
    quantity: 1,
    category: "CNC Software",
  });

  for (const pkg of config.technologyPackages) {
    lines.push({
      articleNumber: pkg.articleNumber,
      name: pkg.name,
      quantity: 1,
      orderCode: pkg.orderCode,
      category: "Technology Package",
    });
  }

  for (const opt of config.softwareOptions) {
    const qty = config.optionQuantities[opt.id] || 1;
    lines.push({
      articleNumber: opt.articleNumber,
      name: opt.name,
      quantity: qty,
      orderCode: opt.orderCode,
      category: "Software Option",
    });
  }

  for (const drive of config.drives) {
    const qty = config.driveQuantities[drive.id] || 1;
    lines.push({
      articleNumber: drive.articleNumber,
      name: drive.name,
      quantity: qty,
      category: "Drive",
    });
  }

  for (const motor of config.motors) {
    const qty = config.motorQuantities[motor.id] || 1;
    lines.push({
      articleNumber: motor.articleNumber || motor.series,
      name: motor.name,
      quantity: qty,
      category: "Motor",
    });
  }

  for (const hmi of config.hmiComponents) {
    lines.push({
      articleNumber: hmi.articleNumber,
      name: hmi.name,
      quantity: 1,
      category: "HMI",
    });
  }

  for (const sf of config.safetyFunctions.filter((s) => !s.isBasicScope)) {
    if (sf.articleNumber) {
      lines.push({
        articleNumber: sf.articleNumber,
        name: sf.name,
        quantity: 1,
        orderCode: sf.orderCode,
        category: "Safety",
      });
    }
  }

  for (const cable of config.cables || []) {
    if (cable.quantity > 0) {
      lines.push({
        articleNumber: cable.articleNumber,
        name: cable.name,
        quantity: cable.quantity,
        category: "Cable/Accessory",
      });
    }
  }

  return lines;
}

export function SummaryStep() {
  const { configuration, resetAll, setStep } = useConfiguratorStore();
  const [copied, setCopied] = useState(false);

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
    const header = "Pos\tMLFB (Article Number)\tQty\tDescription\tOrder Code\tCategory";
    const text = bomLines
      .map(
        (line, i) =>
          `${i + 1}\t${line.articleNumber}\t${line.quantity}\t${line.name}\t${line.orderCode || ""}\t${line.category}`
      )
      .join("\n");
    navigator.clipboard.writeText(`${header}\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = bomLines.map((line, i) => ({
      "#": i + 1,
      "MLFB / Article Number": line.articleNumber,
      Qty: line.quantity,
      Description: line.name,
      "Order Code": line.orderCode || "",
      Category: line.category,
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
      { Field: "Catalog", Value: "NC63 — January 2026" },
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

    XLSX.writeFile(wb, `SINUMERIK_ONE_BOM_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleExportPdf = async () => {
    const { generatePdf } = await import("@/lib/export/pdf-generator");
    generatePdf(configuration, bomLines);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </motion.div>
          <div>
            <h2 className="text-xl font-bold">Bill of Materials</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your SINUMERIK ONE configuration is complete
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Badge variant="outline" className="tabular-nums">{bomLines.length} items</Badge>
          <Badge variant="outline" className="tabular-nums">{totalQty} qty</Badge>
          <Badge variant="outline">{configuration.controlUnit.id.replace("_", " ")}</Badge>
        </div>
      </div>

      {/* Export actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyBom} className="gap-1.5">
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              Copy
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          PDF
        </Button>
      </div>

      <Separator />

      {/* BOM Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground w-8">#</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">MLFB / Article No.</th>
              <th className="text-center py-2.5 px-3 text-[11px] font-semibold text-muted-foreground w-12">Qty</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground">Description</th>
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
                  <code className="text-[11px] font-mono text-primary/80">{line.articleNumber}</code>
                </td>
                <td className="py-2 px-3 text-center font-medium tabular-nums">{line.quantity}</td>
                <td className="py-2 px-3">
                  <span className="text-[13px]">{line.name}</span>
                  {line.orderCode && (
                    <span className="ml-1.5 text-muted-foreground text-[10px] font-mono">({line.orderCode})</span>
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
        <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
          <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Review
        </Button>
        <div className="flex gap-2">
          <Link href="/configure/system">
            <Button variant="outline" size="sm" className="gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              View System Diagram
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => resetAll()}>
            New Configuration
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
