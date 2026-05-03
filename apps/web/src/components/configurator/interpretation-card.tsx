"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiRawResponse } from "@/lib/ai/recommendation-engine";

interface InterpretationCardProps {
  response: AiRawResponse;
  onConfirm: () => void;
  /** Sends a correction back through the AI loop. */
  onRefine: (correction: string) => void | Promise<void>;
  busy?: boolean;
}

/**
 * "Here's what I understood" — a confirmation panel shown between the
 * AI analysis step and the BOM. Two paths:
 *  1. Looks right → confirm and move on.
 *  2. Something's off → user types what to change, we re-run AI with
 *     the correction appended to the conversation.
 *
 * Catches misinterpretations (renamed axes, wrong motor family, missed
 * preferences) BEFORE the BOM is built — much cheaper than fixing
 * after-the-fact via the modify pane.
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

  const facts: Array<{ label: string; value: string | null }> = [
    {
      label: "Control unit",
      value: response.controlUnit?.id ?? null,
    },
    {
      label: "CNC software",
      value: response.cncSoftware?.variant
        ? response.cncSoftware.variant.replace("_", " ")
        : null,
    },
    {
      label: "Total axes / channels",
      value:
        response.totalAxes != null
          ? `${response.totalAxes} axes, ${response.totalChannels ?? 1} channel${
              (response.totalChannels ?? 1) > 1 ? "s" : ""
            }`
          : null,
    },
    {
      label: "Drive family",
      value: response.driveArchitecture?.family ?? null,
    },
    {
      label: "Feed motor family",
      value: prefs?.feedMotorFamily ?? null,
    },
    {
      label: "Spindle motor family",
      value: prefs?.spindleMotorFamily ?? null,
    },
    {
      label: "Feed power",
      value: prefs?.feedPowerKw ? `${prefs.feedPowerKw} kW per axis` : null,
    },
    {
      label: "Spindle power / RPM",
      value:
        prefs?.spindlePowerKw || prefs?.spindleMaxRpm
          ? `${prefs?.spindlePowerKw ? `${prefs.spindlePowerKw} kW` : "—"} / ${prefs?.spindleMaxRpm ? `${prefs.spindleMaxRpm} rpm` : "—"}`
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
        ? `${response.hmi.type}${
            response.hmi.panelSizeInch ? `, ${response.hmi.panelSizeInch}"` : ""
          }`
        : null,
    },
    {
      label: "Tech packages",
      value:
        response.technologyPackages && response.technologyPackages.length > 0
          ? response.technologyPackages.map((p) => p.id).join(", ")
          : "None",
    },
  ];

  const axes = prefs?.axisNames;
  const brakes = prefs?.brakeAxes;

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
      className="rounded-xl border border-primary/30 bg-linear-to-br from-primary/5 via-card to-card overflow-hidden shadow-sm"
    >
      <div className="px-4 py-3 border-b border-primary/15 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        </div>
        <div>
          <div className="text-sm font-semibold">Here&apos;s what I understood</div>
          <div className="text-[11px] text-muted-foreground">
            Review before I build the bill of materials.
          </div>
        </div>
      </div>

      {prefs?.summaryForUser && (
        <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
          <p className="text-[13px] leading-relaxed">{prefs.summaryForUser}</p>
        </div>
      )}

      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
        {facts
          .filter((f) => f.value !== null)
          .map((f) => (
            <div key={f.label}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </div>
              <div className="text-[12.5px] font-medium">{f.value}</div>
            </div>
          ))}
      </div>

      {axes && axes.length > 0 && (
        <div className="px-4 py-3 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Axes (your labels)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {axes.map((ax) => {
              const hasBrake = brakes?.includes(ax);
              return (
                <span
                  key={ax}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono border ${
                    hasBrake
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  {ax}
                  {hasBrake && <span className="text-[9px]">brake</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!refining ? (
        <div className="px-4 py-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefining(true)}
            disabled={busy}
            className="gap-1.5"
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
        <div className="px-4 py-3 border-t border-border/40 space-y-2 bg-muted/20">
          <div className="text-[11px] text-muted-foreground">
            Tell me what to change. I&apos;ll rerun with this correction.
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
