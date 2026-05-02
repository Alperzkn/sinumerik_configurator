import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Cog,
  MessageSquare,
  MousePointerClick,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { getSessionTimeline } from "@sinumerik/telemetry";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const timeline = await getSessionTimeline(id);
  if (timeline.length === 0) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Sessions
        </Link>
        <h1 className="text-base font-semibold font-mono">{id}</h1>
        <p className="text-[12px] text-muted-foreground">
          {timeline.length} events &middot; {formatDateTime(timeline[0].created_at)}
          {timeline.length > 1 &&
            ` → ${formatDateTime(timeline[timeline.length - 1].created_at)}`}
        </p>
      </div>

      <ol className="space-y-2">
        {timeline.map((entry) => (
          <li key={`${entry.source}-${entry.id}`}>
            <TimelineEntry entry={entry} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineEntry({
  entry,
}: {
  entry: {
    source: "ai_trace" | "configuration" | "user_action";
    id: string;
    created_at: string;
    payload: Record<string, unknown>;
  };
}) {
  if (entry.source === "ai_trace") return <AiTraceCard entry={entry} />;
  if (entry.source === "configuration") return <ConfigurationCard entry={entry} />;
  return <UserActionCard entry={entry} />;
}

function AiTraceCard({
  entry,
}: {
  entry: { id: string; created_at: string; payload: Record<string, unknown> };
}) {
  const p = entry.payload;
  const kind = (p.kind as string) || "?";
  const userMessage = p.user_message as string | null;
  const error = p.error as string | null;
  const latencyMs = p.latency_ms as number | null;
  const inputTokens = p.input_tokens as number | null;
  const outputTokens = p.output_tokens as number | null;
  const rating = p.feedback_rating as number | null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b text-[11px]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 font-medium">
            <MessageSquare className="h-3 w-3" />
            AI / {kind}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(entry.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground tabular-nums">
          {latencyMs != null && <span>{formatDuration(latencyMs)}</span>}
          {(inputTokens != null || outputTokens != null) && (
            <span>
              {inputTokens ?? 0} in / {outputTokens ?? 0} out
            </span>
          )}
          {rating === 1 && <ThumbsUp className="h-3 w-3 text-emerald-500" />}
          {rating === -1 && <ThumbsDown className="h-3 w-3 text-rose-500" />}
        </div>
      </div>
      {userMessage && (
        <div className="px-3 py-2 border-b">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            User said
          </div>
          <div className="text-[13px] whitespace-pre-wrap">{userMessage}</div>
        </div>
      )}
      {error && (
        <div className="px-3 py-2 border-b bg-rose-500/5">
          <div className="text-[10px] uppercase tracking-wider text-rose-500/80 mb-0.5">
            Error
          </div>
          <div className="text-[12px] text-rose-500 whitespace-pre-wrap">{error}</div>
        </div>
      )}
      <div className="px-3 py-2 flex justify-end">
        <Link
          href={`/traces/${entry.id}`}
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Open trace
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function ConfigurationCard({
  entry,
}: {
  entry: { id: string; created_at: string; payload: Record<string, unknown> };
}) {
  const p = entry.payload;
  const description = p.description as string | null;
  const totalAxes = p.total_axes as number | null;
  const ncu = p.control_unit as string | null;
  const cnc = p.cnc_software as string | null;
  const items = (p.bom_items as Array<{ mlfb: string; qty: number }>) || [];
  const rating = p.feedback_rating as number | null;
  const feedbackComment = p.feedback_comment as string | null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b text-[11px]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-500 px-2 py-0.5 font-medium">
            <Cog className="h-3 w-3" />
            Configuration
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(entry.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {rating === 1 && <ThumbsUp className="h-3 w-3 text-emerald-500" />}
          {rating === -1 && <ThumbsDown className="h-3 w-3 text-rose-500" />}
        </div>
      </div>
      {description && (
        <div className="px-3 py-2 border-b text-[13px]">{description}</div>
      )}
      <div className="px-3 py-2 grid grid-cols-3 gap-3 text-[12px]">
        <Field label="NCU" value={ncu} />
        <Field label="CNC software" value={cnc} />
        <Field label="Axes" value={totalAxes != null ? String(totalAxes) : null} />
      </div>
      {items.length > 0 && (
        <div className="px-3 py-2 border-t text-[11px] text-muted-foreground">
          {items.length} BOM items &middot; {items.slice(0, 6).map((i) => i.mlfb).join(" · ")}
          {items.length > 6 && ` …`}
        </div>
      )}
      {feedbackComment && (
        <div className="px-3 py-2 border-t bg-muted/40 text-[12px]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Comment
          </div>
          {feedbackComment}
        </div>
      )}
    </div>
  );
}

function UserActionCard({
  entry,
}: {
  entry: { id: string; created_at: string; payload: Record<string, unknown> };
}) {
  const p = entry.payload;
  const kind = (p.kind as string) || "action";
  const details = p.details as Record<string, unknown> | null;
  const summary = details ? Object.entries(details)
    .slice(0, 3)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ") : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2 text-[12px]">
      <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="font-medium">{kind}</span>
      {summary && (
        <span className="text-muted-foreground truncate">{summary}</span>
      )}
      <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
        {formatDateTime(entry.created_at)}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-[12px]">{value ?? "—"}</div>
    </div>
  );
}
