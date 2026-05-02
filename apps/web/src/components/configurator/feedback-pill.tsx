"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  isTelemetryDisabled,
  submitAiFeedback,
  submitConfigurationFeedback,
} from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";

interface FeedbackPillProps {
  /**
   * Either an AI trace row id (for thumbs on a specific AI response) or
   * a configuration row id (for thumbs on the overall BOM).
   */
  target:
    | { kind: "ai_trace"; traceRowId: string }
    | { kind: "configuration"; configRowId: string };
  /** Short headline shown next to the buttons. */
  prompt?: string;
  /** Tighter visual variant for inline use inside a chat bubble. */
  variant?: "inline" | "block";
}

/**
 * Thumbs-up / thumbs-down + optional comment. The comment box only
 * appears after the user picks a rating, and they can submit with the
 * comment empty.
 *
 * Becomes a no-op (renders nothing) when the user has opted out of
 * telemetry — no point showing a button that won't do anything.
 */
export function FeedbackPill({
  target,
  prompt = "Was this useful?",
  variant = "block",
}: FeedbackPillProps) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isTelemetryDisabled()) return null;

  const submit = async (r: 1 | -1) => {
    setRating(r);
    setSubmitting(true);
    const ok =
      target.kind === "ai_trace"
        ? await submitAiFeedback({ trace_row_id: target.traceRowId, rating: r })
        : await submitConfigurationFeedback({ config_row_id: target.configRowId, rating: r });
    setSubmitting(false);
    if (ok) {
      // Show the comment box; the rating itself is already saved.
    } else {
      // Quietly mark as "submitted" so we don't pester the user.
      setSubmitted(true);
    }
  };

  const submitComment = async () => {
    if (!rating || !comment.trim()) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    const ok =
      target.kind === "ai_trace"
        ? await submitAiFeedback({
            trace_row_id: target.traceRowId,
            rating,
            comment: comment.trim(),
          })
        : await submitConfigurationFeedback({
            config_row_id: target.configRowId,
            rating,
            comment: comment.trim(),
          });
    setSubmitting(false);
    if (ok) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground",
          variant === "inline" && "ml-1"
        )}
      >
        <Check className="h-3 w-3 text-emerald-500" />
        Thanks for the feedback.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        variant === "inline" ? "items-start" : "items-stretch"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{prompt}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(1)}
            aria-label="Looks good"
            className={cn(
              "h-6 w-6 rounded-md border bg-background hover:bg-emerald-500/10 hover:border-emerald-500/40 flex items-center justify-center transition-colors disabled:opacity-50",
              rating === 1 && "border-emerald-500/60 bg-emerald-500/15 text-emerald-500"
            )}
          >
            <ThumbsUp className="h-3 w-3" strokeWidth={2} />
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(-1)}
            aria-label="This is wrong"
            className={cn(
              "h-6 w-6 rounded-md border bg-background hover:bg-rose-500/10 hover:border-rose-500/40 flex items-center justify-center transition-colors disabled:opacity-50",
              rating === -1 && "border-rose-500/60 bg-rose-500/15 text-rose-500"
            )}
          >
            <ThumbsDown className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      </div>

      {rating !== null && (
        <div className="flex flex-col gap-1.5 max-w-md">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              rating === -1
                ? "Optional — what was wrong? (catalog drift, wrong motor, ignored my spec, …)"
                : "Optional — anything noteworthy?"
            }
            className="min-h-12 text-[12px] resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={submitting}
              onClick={submitComment}
            >
              {comment.trim() ? "Send" : "Skip"}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Submitted anonymously to improve the tool.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
