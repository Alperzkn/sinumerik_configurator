"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { GeneratedConfiguration, DriveComponent, Motor } from "@/types/catalog";

interface SystemVisualizationProps {
  configuration: GeneratedConfiguration;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function ConnectionLine({ label, color = "border-muted-foreground/40" }: { label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0 py-1">
      <div className={`h-6 w-px border-l-2 border-dashed ${color}`} />
      <Badge variant="outline" className="text-[10px] font-normal px-2 py-0">
        {label}
      </Badge>
      <div className={`h-6 w-px border-l-2 border-dashed ${color}`} />
    </div>
  );
}

/** Group identical drives by id, summing quantities */
function groupDrives(
  drives: DriveComponent[],
  quantities: Record<string, number>
): { drive: DriveComponent; qty: number }[] {
  const seen = new Map<string, { drive: DriveComponent; qty: number }>();
  for (const d of drives) {
    const existing = seen.get(d.id);
    const qty = quantities[d.id] || 1;
    if (existing) {
      existing.qty += qty;
    } else {
      seen.set(d.id, { drive: d, qty });
    }
  }
  return Array.from(seen.values());
}

/** Group identical motors by id, summing quantities */
function groupMotors(
  motors: Motor[],
  quantities: Record<string, number>
): { motor: Motor; qty: number }[] {
  const seen = new Map<string, { motor: Motor; qty: number }>();
  for (const m of motors) {
    const existing = seen.get(m.id);
    const qty = quantities[m.id] || 1;
    if (existing) {
      existing.qty += qty;
    } else {
      seen.set(m.id, { motor: m, qty });
    }
  }
  return Array.from(seen.values());
}

function classifyDriveLabel(d: DriveComponent): string {
  if (d.componentType.includes("line_module")) return "Line Module";
  if (d.componentType.includes("motor_module")) return "Motor Module";
  if (d.componentType.includes("interface")) return "Interface Module";
  if (d.componentType.includes("sensor")) return "Sensor Module";
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
    case "ppu_panel":
      return "PPU Panel";
    case "thin_client":
      return "HMI Panel";
    case "flat_panel":
      return "Flat Panel";
    case "panel_pc":
      return "Panel PC";
    case "cabinet_ipc":
      return "Cabinet IPC";
    case "mcp":
      return "MCP";
    case "handwheel":
      return "Handwheel";
    default:
      return cat;
  }
}

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
    totalAxes,
    totalChannels,
    technologyPackages,
  } = configuration;

  const groupedDrives = groupDrives(drives, driveQuantities);
  const groupedMotors = groupMotors(motors, motorQuantities);

  // Separate line modules from motor/power modules
  const lineModules = groupedDrives.filter((d) => d.drive.componentType.includes("line_module"));
  const motorModules = groupedDrives.filter((d) => !d.drive.componentType.includes("line_module"));

  const controlUnitLabel = controlUnit.id.replace(/_/g, " ").toUpperCase();
  const swLabel = `${cncSoftware.swVersion}${cncSoftware.spLevel ? ` ${cncSoftware.spLevel}` : ""}`;
  const packageLabel =
    technologyPackages.length > 0
      ? technologyPackages.map((p) => p.orderCode || p.name).join(", ")
      : "No packages";

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-0 overflow-x-auto"
    >
      {/* ============ OPERATOR LEVEL ============ */}
      {hmiComponents.length > 0 && (
        <>
          <motion.div variants={fadeUp}>
            <div className="rounded-t-xl border border-b-0 bg-purple-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  Operator Level
                </span>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {hmiComponents.map((hmi, i) => (
                  <motion.div
                    key={hmi.id + i}
                    variants={fadeUp}
                    className="flex min-w-[140px] flex-col rounded-lg border border-purple-300/50 bg-white/80 p-3 shadow-sm dark:bg-purple-950/30 dark:border-purple-700/40"
                  >
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                      {hmiCategoryLabel(hmi.category)}
                    </span>
                    <span className="mt-0.5 text-xs text-muted-foreground truncate max-w-[180px]">
                      {hmi.name}
                    </span>
                    <code className="mt-1 text-[10px] font-mono text-purple-600/70 dark:text-purple-400/70">
                      {hmi.articleNumber}
                    </code>
                    {hmi.screenSize && (
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {hmi.screenSize}&quot;
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Connection: PROFINET */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <ConnectionLine label="PROFINET" color="border-purple-400/50" />
          </motion.div>
        </>
      )}

      {/* ============ CONTROL LEVEL ============ */}
      <motion.div variants={fadeUp}>
        <div
          className={`border bg-primary/5 p-4 ${
            hmiComponents.length > 0 ? "" : "rounded-t-xl"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Control Level
            </span>
          </div>
          <div className="flex justify-center">
            <motion.div
              variants={fadeUp}
              className="flex min-w-[280px] max-w-lg flex-col rounded-lg border border-primary/30 bg-white/80 p-4 shadow-sm dark:bg-primary/10 dark:border-primary/40"
            >
              <span className="text-sm font-bold text-primary">{controlUnitLabel}</span>
              <code className="mt-0.5 text-[11px] font-mono text-primary/60">
                {controlUnit.articleNumber}
              </code>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  CNC + PLC + PROFINET + DRIVE-CLiQ
                </Badge>
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <div>
                  SW: {swLabel} | Variant: {softwareVariant === "full_scope" ? "Full Scope" : "Export"}
                </div>
                <div>Package: {packageLabel}</div>
                <div>
                  {totalAxes} Axes | {totalChannels} Channel{totalChannels !== 1 ? "s" : ""} | up to{" "}
                  {controlUnit.maxAxesSpindles} axes/spindles
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Connection: DRIVE-CLiQ */}
      {(groupedDrives.length > 0 || groupedMotors.length > 0) && (
        <motion.div variants={fadeUp} className="flex justify-center">
          <ConnectionLine label="DRIVE-CLiQ" color="border-primary/50" />
        </motion.div>
      )}

      {/* ============ DRIVE LEVEL ============ */}
      {groupedDrives.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="border bg-blue-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Drive Level
              </span>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Line modules first */}
              {lineModules.map(({ drive, qty }, i) => (
                <motion.div
                  key={drive.id + "-lm-" + i}
                  variants={fadeUp}
                  className="flex min-w-[130px] flex-col rounded-lg border border-blue-300/50 bg-white/80 p-3 shadow-sm dark:bg-blue-950/30 dark:border-blue-700/40"
                >
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    {classifyDriveLabel(drive)}
                    {qty > 1 && (
                      <span className="ml-1 text-blue-500"> x{qty}</span>
                    )}
                  </span>
                  <code className="mt-0.5 text-[10px] font-mono text-blue-600/70 dark:text-blue-400/70">
                    {drive.articleNumber}
                  </code>
                  {drive.ratedPower && (
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {drive.ratedPower}
                    </span>
                  )}
                  {drive.ratedCurrent && (
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {drive.ratedCurrent}
                    </span>
                  )}
                </motion.div>
              ))}

              {/* Motor modules */}
              {motorModules.map(({ drive, qty }, i) => (
                <motion.div
                  key={drive.id + "-mm-" + i}
                  variants={fadeUp}
                  className="flex min-w-[130px] flex-col rounded-lg border border-blue-300/50 bg-white/80 p-3 shadow-sm dark:bg-blue-950/30 dark:border-blue-700/40"
                >
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    {classifyDriveLabel(drive)}
                    {qty > 1 && (
                      <span className="ml-1 text-blue-500"> x{qty}</span>
                    )}
                  </span>
                  <code className="mt-0.5 text-[10px] font-mono text-blue-600/70 dark:text-blue-400/70">
                    {drive.articleNumber}
                  </code>
                  {drive.ratedCurrent && (
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {drive.ratedCurrent}
                    </span>
                  )}
                  {drive.ratedPower && (
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {drive.ratedPower}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* DC Bus bar */}
            {lineModules.length > 0 && motorModules.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="h-px flex-1 max-w-xs border-t-2 border-double border-blue-400/60" />
                <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 text-blue-600 dark:text-blue-400 border-blue-300/50">
                  DC Bus
                </Badge>
                <div className="h-px flex-1 max-w-xs border-t-2 border-double border-blue-400/60" />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Connection: Power Cables */}
      {groupedMotors.length > 0 && groupedDrives.length > 0 && (
        <motion.div variants={fadeUp} className="flex justify-center">
          <ConnectionLine label="Power Cables" color="border-blue-400/50" />
        </motion.div>
      )}

      {/* ============ MOTOR LEVEL ============ */}
      {groupedMotors.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-b-xl border border-t-0 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Motor Level
              </span>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {groupedMotors.map(({ motor, qty }, i) => (
                <motion.div
                  key={motor.id + "-m-" + i}
                  variants={fadeUp}
                  className="flex min-w-[130px] flex-col rounded-lg border border-emerald-300/50 bg-white/80 p-3 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-700/40"
                >
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {motorTypeLabel(motor)}
                    {qty > 1 && (
                      <span className="ml-1 text-emerald-500"> x{qty}</span>
                    )}
                  </span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-[170px]">
                    {motor.series}
                  </span>
                  <code className="mt-0.5 text-[10px] font-mono text-emerald-600/70 dark:text-emerald-400/70">
                    {motor.articleNumber || motor.series}
                  </code>
                  <span className="mt-0.5 text-[10px] text-muted-foreground capitalize">
                    {motor.connectionType.replace(/_/g, " ")}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Fallback bottom rounding when no motors */}
      {groupedMotors.length === 0 && groupedDrives.length > 0 && (
        <div className="h-0 rounded-b-xl border border-t-0" />
      )}
      {groupedMotors.length === 0 && groupedDrives.length === 0 && (
        <div className="h-0 rounded-b-xl border border-t-0" />
      )}
    </motion.div>
  );
}
