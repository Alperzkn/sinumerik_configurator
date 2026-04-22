"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type {
  GeneratedConfiguration,
  DriveComponent,
  Motor,
  HmiComponent,
  CableAccessory,
} from "@/types/catalog";

interface SystemVisualizationProps {
  configuration: GeneratedConfiguration;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function groupBy<T>(items: T[], qty: Record<string, number>, idOf: (t: T) => string) {
  const seen = new Map<string, { item: T; qty: number }>();
  for (const it of items) {
    const id = idOf(it);
    const n = qty[id] || 1;
    const ex = seen.get(id);
    if (ex) ex.qty += n;
    else seen.set(id, { item: it, qty: n });
  }
  return Array.from(seen.values());
}

function classifyDriveLabel(d: DriveComponent): string {
  if (d.componentType.includes("line_module")) return "Line Module";
  if (d.componentType.includes("motor_module")) return "Motor Module";
  if (d.componentType.includes("interface")) return "Interface Module";
  if (d.componentType.includes("sensor")) return "Sensor Module";
  if (d.componentType.includes("hub_module")) return "DRIVE-CLiQ Hub";
  if (d.componentType.includes("terminal")) return "Terminal Module";
  if (d.componentType.includes("voltage_protection")) return "Voltage Protection";
  if (d.componentType.includes("power_module")) return "Power Module";
  return d.componentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function motorTypeLabel(m: Motor): string {
  switch (m.motorType) {
    case "feed_servo_sync":
      return "Feed Motor";
    case "main_spindle_async":
    case "main_spindle_sync":
      return "Spindle Motor";
    case "linear_sync":
      return "Linear Motor";
    case "torque_sync":
      return "Torque Motor";
    default:
      return "Motor";
  }
}

function hmiCategoryLabel(cat: string): string {
  switch (cat) {
    case "ppu_panel": return "PPU Panel";
    case "thin_client": return "Thin Client";
    case "flat_panel": return "Flat Panel";
    case "panel_pc": return "Panel PC";
    case "cabinet_ipc": return "Cabinet IPC";
    case "mcp": return "MCP";
    case "handwheel": return "Handwheel";
    case "io_module": return "I/O Module";
    case "handheld_terminal": return "Handheld";
    case "handheld_accessory": return "HT Accessory";
    default: return cat;
  }
}

function cableCategoryLabel(c: CableAccessory): string {
  switch (c.category) {
    case "drive_cliq_cable": return "DRIVE-CLiQ";
    case "motor_cable": return "Motor Power";
    case "encoder_cable": return "Encoder Signal";
    case "network_cable": return "PROFINET";
    case "power_cable": return "24 V Supply";
    case "signal_cable": return "Signal";
    case "accessory": return "Accessory";
    default: return c.category;
  }
}

// ─── Reusable visual primitives ────────────────────────────────────────

interface LevelProps {
  tone: "violet" | "primary" | "blue" | "rose" | "amber" | "slate";
  title: string;
  desc?: string;
  rounded?: "top" | "bottom" | "both" | "none";
  children: React.ReactNode;
}

// Palette rationale: each level gets a distinct hue on the wheel so two
// adjacent levels never share a perceived colour at a glance.
//   violet  — Operator (HMI / MCP / handheld)
//   primary — Control (NCU/PPU + on-PROFINET I/O modules)
//   blue    — Drive (line modules, motor modules, DRIVE-CLiQ aux)
//   rose    — Motor (replaces the former emerald: emerald was too close
//             to the petrol primary and made Control ↔ Motor hard to
//             tell apart at a glance)
//   amber   — Cables & accessories
const TONE_BG: Record<LevelProps["tone"], string> = {
  violet: "bg-violet-500/5",
  primary: "bg-primary/5",
  blue: "bg-sky-500/5",
  rose: "bg-rose-500/6",
  amber: "bg-amber-500/5",
  slate: "bg-slate-500/5",
};
const TONE_DOT: Record<LevelProps["tone"], string> = {
  violet: "bg-violet-500",
  primary: "bg-primary",
  blue: "bg-sky-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
};
const TONE_TEXT: Record<LevelProps["tone"], string> = {
  violet: "text-violet-700 dark:text-violet-300",
  primary: "text-primary",
  blue: "text-sky-700 dark:text-sky-300",
  rose: "text-rose-700 dark:text-rose-300",
  amber: "text-amber-700 dark:text-amber-300",
  slate: "text-slate-700 dark:text-slate-300",
};
const TONE_BORDER: Record<LevelProps["tone"], string> = {
  violet: "border-violet-300/40 dark:border-violet-700/40",
  primary: "border-primary/30 dark:border-primary/40",
  blue: "border-sky-300/40 dark:border-sky-700/40",
  rose: "border-rose-300/40 dark:border-rose-700/40",
  amber: "border-amber-300/40 dark:border-amber-700/40",
  slate: "border-slate-300/40 dark:border-slate-700/40",
};

function Level({ tone, title, desc, rounded = "none", children }: LevelProps) {
  const cornerCls =
    rounded === "top"
      ? "rounded-t-xl"
      : rounded === "bottom"
        ? "rounded-b-xl border-t-0"
        : rounded === "both"
          ? "rounded-xl"
          : "border-t-0";
  return (
    <motion.div variants={fadeUp}>
      <div className={`${cornerCls} border ${TONE_BG[tone]} px-4 py-4`}>
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${TONE_TEXT[tone]}`}>
              {title}
            </span>
          </div>
          {desc && (
            <span className="text-[10.5px] text-muted-foreground">{desc}</span>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function ConnectionLine({ label, tone = "primary" }: { label: string; tone?: LevelProps["tone"] }) {
  return (
    <div className="flex flex-col items-center gap-0 py-1">
      <div className={`h-5 w-px border-l-2 border-dashed ${TONE_BORDER[tone].replace("border-", "border-l-")}`} />
      <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 ${TONE_TEXT[tone]} ${TONE_BORDER[tone]}`}>
        {label}
      </Badge>
      <div className={`h-5 w-px border-l-2 border-dashed ${TONE_BORDER[tone].replace("border-", "border-l-")}`} />
    </div>
  );
}

interface NodeCardProps {
  tone: LevelProps["tone"];
  label: string;
  qty?: number;
  name: string;
  mlfb?: string;
  meta?: string[];
  emphasized?: boolean;
}

function NodeCard({ tone, label, qty, name, mlfb, meta, emphasized }: NodeCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={`flex min-w-37.5 max-w-65 flex-col rounded-lg border bg-card p-3 shadow-sm ${TONE_BORDER[tone]} ${
        emphasized ? "ring-1 ring-primary/40" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${TONE_TEXT[tone]}`}>
          {label}
        </span>
        {qty && qty > 1 && (
          <Badge variant="outline" className={`text-[9px] tabular-nums px-1.5 py-0 h-4 ${TONE_TEXT[tone]} ${TONE_BORDER[tone]}`}>
            ×{qty}
          </Badge>
        )}
      </div>
      <span className="mt-1 text-[12.5px] font-medium leading-tight line-clamp-2">{name}</span>
      {mlfb && (
        <code className="mlfb mt-1 text-[10.5px] text-foreground/85 bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 self-start">
          {mlfb}
        </code>
      )}
      {meta && meta.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {meta.map((m, i) => (
            <span key={i} className="text-[10px] text-muted-foreground">
              {m}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────

export function SystemVisualization({ configuration }: SystemVisualizationProps) {
  const {
    controlUnit,
    cncSoftware,
    softwareVariant,
    drives,
    driveQuantities,
    motors,
    motorQuantities,
    hmiComponents,
    cables,
    totalAxes,
    totalChannels,
    technologyPackages,
  } = configuration;

  const groupedDrives = groupBy(drives, driveQuantities, (d) => d.id);
  const groupedMotors = groupBy(motors, motorQuantities, (m) => m.id);

  // Sort HMI components by visual hierarchy
  const operatorOrder: Record<string, number> = {
    ppu_panel: 0, thin_client: 1, flat_panel: 2, panel_pc: 3, cabinet_ipc: 4,
    mcp: 5, handwheel: 6, handheld_terminal: 7, handheld_accessory: 8, io_module: 9,
  };
  const operatorComps = [...hmiComponents]
    .filter((h) => h.category !== "io_module" && h.category !== "handheld_accessory")
    .sort((a, b) => (operatorOrder[a.category] ?? 99) - (operatorOrder[b.category] ?? 99));
  const ioModules = hmiComponents.filter((h) => h.category === "io_module");
  const handheldAccessories = hmiComponents.filter((h) => h.category === "handheld_accessory");

  const lineModules = groupedDrives.filter((g) => g.item.componentType.includes("line_module"));
  const motorModules = groupedDrives.filter((g) =>
    g.item.componentType.includes("motor_module") || g.item.componentType.includes("power_module")
  );
  const auxiliaryDrives = groupedDrives.filter((g) =>
    !g.item.componentType.includes("line_module") &&
    !g.item.componentType.includes("motor_module") &&
    !g.item.componentType.includes("power_module")
  );

  const controlUnitLabel = controlUnit.id.replace(/_/g, " ").toUpperCase();
  const swLabel = `${cncSoftware.swVersion}${cncSoftware.spLevel ? ` ${cncSoftware.spLevel}` : ""}`;
  const packageLabel = technologyPackages.length > 0
    ? technologyPackages.map((p) => p.orderCode || p.name).join(", ")
    : "None";

  // Group cables by category for the dedicated section
  const cablesByCategory = cables.reduce<Record<string, CableAccessory[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});
  const cableCategoryOrder = [
    "drive_cliq_cable", "motor_cable", "encoder_cable",
    "network_cable", "power_cable", "signal_cable", "accessory",
  ];

  return (
    <div className="space-y-6">
      {/* ── Legend strip ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10.5px] text-muted-foreground"
      >
        <LegendDot tone="violet" label="Operator" />
        <LegendDot tone="primary" label="Control" />
        <LegendDot tone="blue" label="Drive" />
        <LegendDot tone="rose" label="Motor" />
        <LegendDot tone="amber" label="Cables & Accessories" />
      </motion.div>

      {/* ── Topology stack ──────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-0 overflow-x-auto"
      >
        {/* OPERATOR LEVEL — operator panel + MCP + handwheel + handheld */}
        {operatorComps.length > 0 && (
          <>
            <Level
              tone="violet"
              title="Operator Level"
              desc={`${operatorComps.length} component${operatorComps.length === 1 ? "" : "s"}`}
              rounded="top"
            >
              <div className="flex flex-wrap gap-3 justify-center">
                {operatorComps.map((hmi, i) => (
                  <NodeCard
                    key={hmi.id + i}
                    tone="violet"
                    label={hmiCategoryLabel(hmi.category)}
                    name={hmi.name}
                    mlfb={hmi.articleNumber}
                    meta={hmi.screenSize ? [`${hmi.screenSize}"`] : undefined}
                  />
                ))}
              </div>
            </Level>
            <motion.div variants={fadeUp} className="flex justify-center">
              <ConnectionLine label="PROFINET" tone="violet" />
            </motion.div>
          </>
        )}

        {/* CONTROL LEVEL — NCU/PPU plus any on-PROFINET I/O modules.
            I/O is part of the control scope conceptually (it sits on the
            same PROFINET trunk as the PLC), so show them in the same
            panel rather than a separate sub-level that made the diagram
            feel like more hops than it really is. */}
        <Level
          tone="primary"
          title="Control Level"
          desc={
            ioModules.length > 0
              ? `${totalAxes} axes · ${totalChannels} channel${totalChannels !== 1 ? "s" : ""} · +${ioModules.length} I/O`
              : `${totalAxes} axes · ${totalChannels} channel${totalChannels !== 1 ? "s" : ""}`
          }
          rounded={operatorComps.length === 0 ? "top" : "none"}
        >
          <div className="flex flex-wrap gap-3 justify-center">
            <NodeCard
              tone="primary"
              label={controlUnitLabel}
              name={`SW ${swLabel} · ${softwareVariant === "full_scope" ? "Full Scope" : "Export"}`}
              mlfb={controlUnit.articleNumber}
              meta={[
                `Up to ${controlUnit.maxAxesSpindles} axes`,
                packageLabel === "None" ? "No tech package" : `Pkg: ${packageLabel}`,
              ]}
              emphasized
            />
            {ioModules.map((io, i) => (
              <NodeCard
                key={io.id + i}
                tone="primary"
                label={`${hmiCategoryLabel(io.category)} · PROFINET`}
                name={io.name}
                mlfb={io.articleNumber}
              />
            ))}
          </div>
          {ioModules.length > 0 && (
            <div className="mt-3 text-center text-[10px] uppercase tracking-wider text-primary/70">
              ↔ PROFINET trunk — NCU · machine I/O
            </div>
          )}
        </Level>

        {/* DRIVE LEVEL */}
        {(groupedDrives.length > 0) && (
          <>
            <motion.div variants={fadeUp} className="flex justify-center">
              <ConnectionLine label="DRIVE-CLiQ" tone="blue" />
            </motion.div>
            <Level
              tone="blue"
              title="Drive Level"
              desc={`${lineModules.length} line · ${motorModules.length} motor · ${auxiliaryDrives.length} aux`}
            >
              {lineModules.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center">
                  {lineModules.map(({ item, qty }, i) => (
                    <NodeCard
                      key={item.id + "-lm-" + i}
                      tone="blue"
                      label={classifyDriveLabel(item)}
                      qty={qty}
                      name={item.name}
                      mlfb={item.articleNumber}
                      meta={[item.ratedPower, item.ratedCurrent].filter(Boolean) as string[]}
                    />
                  ))}
                </div>
              )}

              {lineModules.length > 0 && motorModules.length > 0 && (
                <div className="my-3 flex items-center justify-center gap-2">
                  <div className="h-px flex-1 max-w-xs border-t-2 border-double border-sky-400/60" />
                  <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 text-sky-600 dark:text-sky-400 border-sky-300/50">
                    Shared DC Bus
                  </Badge>
                  <div className="h-px flex-1 max-w-xs border-t-2 border-double border-sky-400/60" />
                </div>
              )}

              {motorModules.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center">
                  {motorModules.map(({ item, qty }, i) => (
                    <NodeCard
                      key={item.id + "-mm-" + i}
                      tone="blue"
                      label={classifyDriveLabel(item)}
                      qty={qty}
                      name={item.name}
                      mlfb={item.articleNumber}
                      meta={[item.ratedCurrent, item.ratedPower].filter(Boolean) as string[]}
                    />
                  ))}
                </div>
              )}

              {auxiliaryDrives.length > 0 && (
                <>
                  <div className="my-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                    Auxiliary on DRIVE-CLiQ
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {auxiliaryDrives.map(({ item, qty }, i) => (
                      <NodeCard
                        key={item.id + "-aux-" + i}
                        tone="blue"
                        label={classifyDriveLabel(item)}
                        qty={qty}
                        name={item.name}
                        mlfb={item.articleNumber}
                      />
                    ))}
                  </div>
                </>
              )}
            </Level>
          </>
        )}

        {/* MOTOR LEVEL */}
        {groupedMotors.length > 0 && (
          <>
            <motion.div variants={fadeUp} className="flex justify-center">
              <ConnectionLine label="Motor Power + Encoder" tone="rose" />
            </motion.div>
            <Level
              tone="rose"
              title="Motor Level"
              desc={`${groupedMotors.reduce((s, g) => s + g.qty, 0)} motor${
                groupedMotors.reduce((s, g) => s + g.qty, 0) === 1 ? "" : "s"
              } total`}
              rounded={cables.length === 0 && handheldAccessories.length === 0 ? "bottom" : "none"}
            >
              <div className="flex flex-wrap gap-3 justify-center">
                {groupedMotors.map(({ item, qty }, i) => {
                  const meta: string[] = [];
                  if (item.ratedPower) meta.push(item.ratedPower);
                  if (item.ratedTorque) meta.push(item.ratedTorque);
                  if (item.maxSpeed) meta.push(`max ${item.maxSpeed}`);
                  return (
                    <NodeCard
                      key={item.id + "-m-" + i}
                      tone="rose"
                      label={motorTypeLabel(item)}
                      qty={qty}
                      name={`${item.series} · ${item.name.replace(item.series, "").trim()}`}
                      mlfb={item.articleNumber}
                      meta={meta}
                    />
                  );
                })}
              </div>
            </Level>
          </>
        )}

        {/* HANDHELD ACCESSORIES — only when handheld present */}
        {handheldAccessories.length > 0 && (
          <Level
            tone="violet"
            title="Handheld Accessories"
            desc={`${handheldAccessories.length} item${handheldAccessories.length === 1 ? "" : "s"}`}
            rounded={cables.length === 0 ? "bottom" : "none"}
          >
            <div className="flex flex-wrap gap-3 justify-center">
              {handheldAccessories.map((acc, i) => (
                <NodeCard
                  key={acc.id + i}
                  tone="violet"
                  label="HT Accessory"
                  name={acc.name}
                  mlfb={acc.articleNumber}
                />
              ))}
            </div>
          </Level>
        )}

        {/* CABLES & ACCESSORIES — always-visible MLFB list at the bottom */}
        {cables.length > 0 && (
          <Level
            tone="amber"
            title="Cables & Accessories"
            desc={`${cables.length} item${cables.length === 1 ? "" : "s"} · ${cables.reduce((s, c) => s + c.quantity, 0)} total qty`}
            rounded="bottom"
          >
            <div className="space-y-3">
              {cableCategoryOrder
                .filter((cat) => cablesByCategory[cat] && cablesByCategory[cat].length > 0)
                .map((cat) => {
                  const items = cablesByCategory[cat];
                  return (
                    <div key={cat} className="rounded-md bg-card/60 border border-amber-300/30 dark:border-amber-700/30 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-amber-300/30 dark:border-amber-700/30 bg-amber-500/5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          {cableCategoryLabel(items[0])}
                        </span>
                        <Badge variant="outline" className="text-[9px] tabular-nums px-1.5 py-0 h-4 text-amber-700 dark:text-amber-300 border-amber-300/50">
                          {items.length} type{items.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <ul className="divide-y divide-border/40">
                        {items.map((c, i) => (
                          <li key={c.id + i} className="flex items-baseline justify-between gap-3 px-3 py-1.5 hover:bg-amber-500/5 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="text-[12.5px] font-medium leading-tight truncate">
                                {c.name}
                              </div>
                              {c.description && (
                                <div className="text-[10.5px] text-muted-foreground line-clamp-1">
                                  {c.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <code className="mlfb text-[10.5px] text-foreground/85 bg-muted/60 border border-border/50 rounded px-1.5 py-0.5">
                                {c.articleNumber}
                              </code>
                              <Badge variant="outline" className="text-[9.5px] tabular-nums w-9 justify-center px-0 py-0 h-5">
                                ×{c.quantity}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
          </Level>
        )}

        {/* Bottom rounding when nothing renders below the control level */}
        {groupedDrives.length === 0 && groupedMotors.length === 0 && cables.length === 0 && handheldAccessories.length === 0 && (
          <div className="h-0 rounded-b-xl border border-t-0" />
        )}
      </motion.div>

      {/* ── Footer hint ─────────────────────────────────────────── */}
      <p className="text-[10.5px] text-center text-muted-foreground">
        Legend dots and connection labels show the bus / signal between adjacent levels.
        Cable quantities reflect the auto-selected MOTION-CONNECT / DRIVE-CLiQ topology.
      </p>
    </div>
  );
}

function LegendDot({ tone, label }: { tone: LevelProps["tone"]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />
      <span>{label}</span>
    </span>
  );
}

// Suppress unused-import lints for HmiComponent (used in JSX inference).
export type _u = HmiComponent;
