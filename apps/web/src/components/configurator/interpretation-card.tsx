"use client";

import { useState } from "react";
import { CONTROL_SYSTEM_FAMILIES } from "@/types/catalog";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiRawResponse } from "@/lib/ai/recommendation-engine";

interface InterpretationCardProps {
  response: AiRawResponse;
  onConfirm: () => void;
  /** Sends a correction back through the AI loop. */
  onRefine: (correction: string) => void | Promise<void>;
  busy?: boolean;
}

/**
 * Engineering-instrument interpretation panel — reads like the data
 * plate on a CNC: a tracked title rule, a spec grid with tick-mark
 * left edges, axis chips that mirror the per-axis schematic style.
 *
 * Two paths:
 *   1. Looks right → confirm and move on.
 *   2. Something's off → user types what to change, we re-run AI with
 *      the correction appended to the conversation.
 */
export function InterpretationCard({
  response,
  onConfirm,
  onRefine,
  busy,
}: InterpretationCardProps) {
  const [refining, setRefining] = useState(false);
  const [correction, setCorrection] = useState("");
  const prefs = response.userPreferences;

  // Highlighted "metrics" — rendered prominently in display font (Plex
  // Serif) at the top of the card, so the engineer's eye lands on the
  // counts first. The remaining facts are tabulated in the spec grid
  // below.
  const metrics: Array<{ label: string; value: string | null; unit?: string }> = [
    {
      label: "Axes",
      value: response.totalAxes != null ? String(response.totalAxes) : null,
    },
    {
      label: "Channels",
      value: response.totalChannels != null ? String(response.totalChannels) : null,
    },
    {
      label: "Complexity",
      value: response.estimatedComplexity ?? null,
    },
  ];

  const facts: Array<{ label: string; value: string | null }> = [
    {
      label: "Control system",
      value: response.controlSystem
        ? `${CONTROL_SYSTEM_FAMILIES[response.controlSystem.family]?.label ?? response.controlSystem.family}${response.controlSystem.reason ? ` — ${response.controlSystem.reason}` : ""}`
        : null,
    },
    { label: "Control unit", value: response.controlUnit?.id ?? null },
    {
      label: "CNC software",
      value: response.cncSoftware?.variant
        ? response.cncSoftware.variant.replace("_", " ")
        : null,
    },
    { label: "Drive family", value: response.driveArchitecture?.family ?? null },
    { label: "Feed motor family", value: prefs?.feedMotorFamily ?? null },
    { label: "Spindle family", value: prefs?.spindleMotorFamily ?? null },
    {
      label: "Feed power",
      value: prefs?.feedPowerKw ? `${prefs.feedPowerKw} kW per axis` : null,
    },
    {
      label: "Spindle",
      value:
        prefs?.spindlePowerKw || prefs?.spindleMaxRpm
          ? `${prefs?.spindlePowerKw ? `${prefs.spindlePowerKw} kW` : "—"} · ${prefs?.spindleMaxRpm ? `${prefs.spindleMaxRpm} rpm` : "—"}`
          : null,
    },
    {
      label: "Moving mass",
      value: prefs?.movingMassKg ? `${prefs.movingMassKg} kg per axis` : null,
    },
    {
      label: "Rapid traverse",
      value: prefs?.rapidTraverseMpm ? `${prefs.rapidTraverseMpm} m/min` : null,
    },
    {
      label: "Cable length",
      value: prefs?.cableLengthMeters ? `${prefs.cableLengthMeters} m` : null,
    },
    {
      label: "Safety",
      value:
        response.safety?.options && response.safety.options.length > 0
          ? response.safety.options.join(", ")
          : "Basic only",
    },
    {
      label: "HMI",
      value: response.hmi
        ? `${response.hmi.type.replace("_", " ")}${
            response.hmi.panelSizeInch ? ` · ${response.hmi.panelSizeInch}″` : ""
          }`
        : null,
    },
    {
      label: "Tech packages",
      value:
        response.technologyPackages && response.technologyPackages.length > 0
          ? response.technologyPackages.map((p) => p.id).join(" · ")
          : "None",
    },
  ];

  const axes = prefs?.axisNames ?? [];
  const brakes = prefs?.brakeAxes ?? [];

  const handleSendRefine = async () => {
    if (!correction.trim() || busy) return;
    await onRefine(correction.trim());
    setCorrection("");
    setRefining(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border bg-card overflow-hidden"
    >
      {/* Top accent rule — single petrol hairline above a tracked title. */}
      <div className="h-px bg-primary/60" />

      <div className="px-5 pt-4 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="label-spec">Interpretation · A1</span>
          <span className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            review before BOM
          </span>
        </div>
        <h3 className="mt-2.5 text-[17px] font-medium tracking-tight leading-tight">
          Here&apos;s what I understood
        </h3>
        {prefs?.summaryForUser && (
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed max-w-2xl">
            {prefs.summaryForUser}
          </p>
        )}
      </div>

      {/* Hero metrics — display font, large, restrained. */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-px bg-border/40 rounded-sm overflow-hidden mx-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card px-4 py-3">
            <div className="label-spec">{m.label}</div>
            <div className="font-display text-[24px] leading-none mt-1.5 tabular-nums">
              {m.value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Spec grid — each row gets a tick-mark left edge. */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 border-t border-border/40">
        {facts
          .filter((f) => f.value !== null)
          .map((f) => (
            <div key={f.label} className="spec-row">
              <div className="label-spec">{f.label}</div>
              <div className="text-[13px] mt-0.5">{f.value}</div>
            </div>
          ))}
      </div>

      {/* Axes — schematic chip strip echoing the per-axis MLFB rail. */}
      {axes.length > 0 && (
        <div className="px-5 py-3 border-t border-border/40">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="label-spec">Axes — your labels</span>
            <span className="flex-1 h-px bg-border/40" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {axes.map((ax) => {
              const hasBrake = brakes.includes(ax);
              return (
                <span
                  key={ax}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-display tabular-nums tracking-tight border",
                    hasBrake
                      ? "border-amber-500/45 text-amber-500 bg-amber-500/5"
                      : "border-border/70 text-foreground bg-muted/30",
                  )}
                  title={hasBrake ? "Holding brake" : undefined}
                >
                  {ax}
                  {hasBrake && (
                    <span className="text-[8.5px] uppercase tracking-[0.18em] opacity-80">
                      brk
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Action footer */}
      {!refining ? (
        <div className="px-5 py-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefining(true)}
            disabled={busy}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Something&apos;s off
          </Button>
          <Button onClick={onConfirm} disabled={busy} size="sm" className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Looks right — show BOM
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="px-5 py-4 border-t border-border/40 space-y-2.5 bg-muted/20">
          <div className="flex items-baseline gap-3">
            <span className="label-spec">Correction</span>
            <span className="flex-1 h-px bg-border/40" />
          </div>
          <Textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder='e.g. "I said Y1/Y2, not Z1/Z2 — please use my axis names" or "spindle should be 1PH3 not 1PH8"'
            className="min-h-16 text-[13px] resize-none"
            autoFocus
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendRefine();
              }
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRefining(false);
                setCorrection("");
              }}
              disabled={busy}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendRefine}
              disabled={!correction.trim() || busy}
              className="gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Resend with correction"
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
