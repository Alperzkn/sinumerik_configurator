"use client";

import { useMemo } from "react";
import { buildCatalogRows } from "@/lib/convert-808d/catalog-rows";

export function CatalogPanel() {
  const rows = useMemo(() => buildCatalogRows(), []);
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <h2 className="border-b px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        828D Smart catalogue used by the converter (from the PDF)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Article", "Description", "Source"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border-b border-border/60 px-2.5 py-2 align-top font-mono text-xs font-medium">
                  {r.article}
                </td>
                <td className="border-b border-border/60 px-2.5 py-2 align-top">{r.desc}</td>
                <td className="border-b border-border/60 px-2.5 py-2 align-top text-xs text-muted-foreground">
                  {r.src}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
