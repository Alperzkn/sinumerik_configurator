import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  CircleDot,
  Coins,
  MessageSquareWarning,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Wrench,
} from "lucide-react";
import { listSessions, type SessionsOverviewRow } from "@sinumerik/telemetry";
import { requireAdmin } from "@/lib/auth";
import {
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatTokens,
  median,
  shortId,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
  thumbsDown?: string;
  modify?: string;
}

const PAGE_SIZE = 50;

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const sessions = await listSessions({
    limit: PAGE_SIZE,
    offset,
    hasThumbsDown: sp.thumbsDown === "1",
    hasModify: sp.modify === "1",
  });

  const filtersActive = sp.thumbsDown === "1" || sp.modify === "1";
  const stats = computeStats(sessions);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            Telemetry · Sessions
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight leading-none">
            {sessions.length === 0 && !filtersActive
              ? "No traffic yet"
              : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
            <span className="text-muted-foreground/70 text-[18px] font-normal ml-2">
              {filtersActive ? "(filtered)" : "on this page"}
            </span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Each row is one anonymous browser tab&apos;s journey from prompt
            → bill of materials. Click in to see every AI call, swap, and
            export in chronological order.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FilterToggle
            active={sp.modify === "1"}
            label="Used modify"
            icon={<Wrench className="h-3.5 w-3.5" />}
            href={buildHref(sp, { modify: sp.modify === "1" ? undefined : "1" })}
          />
          <FilterToggle
            active={sp.thumbsDown === "1"}
            label="Thumbs down"
            icon={<MessageSquareWarning className="h-3.5 w-3.5" />}
            href={buildHref(sp, {
              thumbsDown: sp.thumbsDown === "1" ? undefined : "1",
            })}
          />
        </div>
      </header>

      {sessions.length > 0 && <StatsStrip stats={stats} />}

      {sessions.length === 0 ? (
        <EmptyState filtersActive={filtersActive} />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-[14px]">
            <thead className="bg-muted/30">
              <tr className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground border-b">
                <th className="text-left px-4 py-2.5 font-medium">Session</th>
                <th className="text-left px-4 py-2.5 font-medium">When</th>
                <th className="text-right px-4 py-2.5 font-medium">AI calls</th>
                <th className="text-right px-4 py-2.5 font-medium">Latency</th>
                <th className="text-right px-4 py-2.5 font-medium">Tokens out</th>
                <th className="text-right px-4 py-2.5 font-medium">Feedback</th>
                <th className="text-right px-4 py-2.5 font-medium">Status</th>
                <th className="w-10">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <SessionRow key={s.session_id} s={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pageNum={pageNum}
        sp={sp}
        hasMore={sessions.length === PAGE_SIZE}
      />
    </div>
  );
}

// ── Top-line stats ────────────────────────────────────────────────────

interface PageStats {
  totalSessions: number;
  totalAiCalls: number;
  recommendCalls: number;
  modifyCalls: number;
  medianLatencyMs: number;
  tokensIn: number;
  tokensOut: number;
  thumbsUp: number;
  thumbsDown: number;
  errors: number;
  errorRate: number;
}

function computeStats(rows: SessionsOverviewRow[]): PageStats {
  const totalAiCalls = rows.reduce(
    (acc, r) => acc + (r.recommend_calls ?? 0) + (r.modify_calls ?? 0),
    0,
  );
  const recommendCalls = rows.reduce((acc, r) => acc + (r.recommend_calls ?? 0), 0);
  const modifyCalls = rows.reduce((acc, r) => acc + (r.modify_calls ?? 0), 0);
  const tokensIn = rows.reduce((acc, r) => acc + (r.total_input_tokens ?? 0), 0);
  const tokensOut = rows.reduce((acc, r) => acc + (r.total_output_tokens ?? 0), 0);
  const thumbsUp = rows.reduce((acc, r) => acc + (r.thumbs_up ?? 0), 0);
  const thumbsDown = rows.reduce((acc, r) => acc + (r.thumbs_down ?? 0), 0);
  const errors = rows.reduce((acc, r) => acc + (r.errors ?? 0), 0);

  // Median per-call latency across the cohort. We only have per-session
  // totals; divide by call count to approximate per-call latency.
  const perSessionAvg = rows
    .filter((r) => (r.recommend_calls ?? 0) + (r.modify_calls ?? 0) > 0)
    .map(
      (r) =>
        (r.total_latency_ms ?? 0) /
        Math.max(1, (r.recommend_calls ?? 0) + (r.modify_calls ?? 0)),
    );
  const medianLatencyMs = median(perSessionAvg);

  return {
    totalSessions: rows.length,
    totalAiCalls,
    recommendCalls,
    modifyCalls,
    medianLatencyMs,
    tokensIn,
    tokensOut,
    thumbsUp,
    thumbsDown,
    errors,
    errorRate: totalAiCalls > 0 ? errors / totalAiCalls : 0,
  };
}

function StatsStrip({ stats }: { stats: PageStats }) {
  const feedbackTotal = stats.thumbsUp + stats.thumbsDown;
  const feedbackRatio =
    feedbackTotal > 0
      ? `${Math.round((stats.thumbsUp / feedbackTotal) * 100)}%`
      : "—";
  return (
    <section className="rounded-lg border bg-card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 lg:divide-y-0 divide-border">
        <StatCell
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="AI calls"
          value={stats.totalAiCalls.toString()}
          hint={
            stats.modifyCalls > 0
              ? `${stats.recommendCalls} build · ${stats.modifyCalls} modify`
              : `${stats.recommendCalls} build`
          }
        />
        <StatCell
          icon={<Timer className="h-3.5 w-3.5" />}
          label="Median latency"
          value={formatDuration(stats.medianLatencyMs)}
          hint="per AI call"
        />
        <StatCell
          icon={<Coins className="h-3.5 w-3.5" />}
          label="Tokens out"
          value={formatTokens(stats.tokensOut)}
          hint={`${formatTokens(stats.tokensIn)} in`}
        />
        <StatCell
          icon={<ThumbsUp className="h-3.5 w-3.5" />}
          label="Positive feedback"
          value={feedbackRatio}
          hint={
            feedbackTotal > 0
              ? `${stats.thumbsUp} / ${feedbackTotal} rated`
              : "no ratings"
          }
          tone={
            feedbackTotal === 0
              ? "neutral"
              : stats.thumbsUp >= stats.thumbsDown
              ? "good"
              : "bad"
          }
        />
        <StatCell
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Errors"
          value={stats.errors.toString()}
          hint={
            stats.totalAiCalls > 0
              ? `${(stats.errorRate * 100).toFixed(1)}% error rate`
              : "no AI calls"
          }
          tone={stats.errors === 0 ? "neutral" : "bad"}
        />
        <StatCell
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Sessions"
          value={stats.totalSessions.toString()}
          hint="this page"
        />
      </div>
    </section>
  );
}

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad" | "neutral";
}

function StatCell({ icon, label, value, hint, tone = "neutral" }: StatCellProps) {
  const valueColor =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-rose-300"
      : "text-foreground";
  return (
    <div className="px-4 py-3.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </div>
      <div
        className={`text-[22px] font-semibold tracking-tight tabular-nums leading-none ${valueColor}`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11.5px] text-muted-foreground tabular-nums leading-none">
          {hint}
        </div>
      )}
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────────────

function SessionRow({ s }: { s: SessionsOverviewRow }) {
  const aiCalls = s.recommend_calls + s.modify_calls;
  const relative = formatRelativeTime(s.last_event_at) ?? "—";
  const exact = formatDateTime(s.last_event_at);
  const sessionLink = `/sessions/${s.session_id}`;

  // A session is "interesting" when something happened beyond a single
  // bare AI call — modify, feedback, or errors. Tag it so reviewers can
  // scan the table for rows worth opening.
  const tags: { label: string; tone: "modify" | "down" | "error" }[] = [];
  if (s.modify_calls > 0) tags.push({ label: "modify", tone: "modify" });
  if (s.thumbs_down > 0) tags.push({ label: "👎", tone: "down" });
  if (s.errors > 0) tags.push({ label: "error", tone: "error" });

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 align-top">
        <Link
          href={sessionLink}
          className="font-mono text-[13px] hover:text-primary"
        >
          {shortId(s.session_id, 12)}
        </Link>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {tags.map((t) => (
              <RowTag key={t.label} label={t.label} tone={t.tone} />
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-[13px] text-foreground">{relative}</div>
        <div className="text-[11.5px] text-muted-foreground tabular-nums mt-0.5">
          {exact}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums align-top">
        <div className="text-[13.5px]">{aiCalls}</div>
        {s.modify_calls > 0 && (
          <div className="text-[11.5px] text-muted-foreground">
            {s.modify_calls} mod
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground align-top">
        {formatDuration(s.total_latency_ms)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground align-top">
        {formatTokens(s.total_output_tokens)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums align-top">
        <FeedbackPills up={s.thumbs_up} down={s.thumbs_down} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums align-top">
        {s.errors > 0 ? (
          <span className="inline-flex items-center gap-1 text-rose-300 text-[13px]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {s.errors}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-emerald-400/80 text-[13px]">
            <CircleDot className="h-3 w-3" strokeWidth={2.5} />
            ok
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground align-top">
        <Link
          href={sessionLink}
          className="hover:text-foreground inline-flex"
          aria-label="Open session"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

function FeedbackPills({ up, down }: { up: number; down: number }) {
  if (up === 0 && down === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      {up > 0 && (
        <span className="inline-flex items-center gap-0.5 text-emerald-400">
          <ThumbsUp className="h-3 w-3" strokeWidth={2.25} />
          {up}
        </span>
      )}
      {down > 0 && (
        <span className="inline-flex items-center gap-0.5 text-rose-400">
          <ThumbsDown className="h-3 w-3" strokeWidth={2.25} />
          {down}
        </span>
      )}
    </span>
  );
}

function RowTag({
  label,
  tone,
}: {
  label: string;
  tone: "modify" | "down" | "error";
}) {
  const className =
    tone === "modify"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : tone === "down"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : "bg-rose-500/20 text-rose-300 border-rose-500/40";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ── Filter chip & misc ────────────────────────────────────────────────

function EmptyState({ filtersActive }: { filtersActive: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <div className="mx-auto h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-[14px] font-medium">
        {filtersActive ? "No sessions match these filters." : "No sessions logged yet."}
      </p>
      {!filtersActive && (
        <p className="text-[12.5px] text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Make sure <code className="font-mono">SUPABASE_URL</code> and
          <code className="font-mono"> SUPABASE_SERVICE_ROLE_KEY</code> are
          set on the web app, the migration has run, and the configurator
          has been used at least once.
        </p>
      )}
    </div>
  );
}

function FilterToggle({
  active,
  label,
  icon,
  href,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border hover:bg-muted/50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Pagination({
  pageNum,
  sp,
  hasMore,
}: {
  pageNum: number;
  sp: SearchParams;
  hasMore: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[13px] text-muted-foreground">
      <div>
        Page {pageNum}
        {hasMore && " — more available"}
      </div>
      <div className="flex gap-2">
        {pageNum > 1 && (
          <Link
            href={buildHref(sp, { page: String(pageNum - 1) })}
            className="hover:text-foreground"
          >
            ← Newer
          </Link>
        )}
        {hasMore && (
          <Link
            href={buildHref(sp, { page: String(pageNum + 1) })}
            className="hover:text-foreground"
          >
            Older →
          </Link>
        )}
      </div>
    </div>
  );
}

function buildHref(
  current: SearchParams,
  patch: Partial<Record<keyof SearchParams, string | undefined>>,
): string {
  const params = new URLSearchParams();
  const merged: SearchParams = { ...current, ...patch };
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  if (merged.thumbsDown) params.set("thumbsDown", merged.thumbsDown);
  if (merged.modify) params.set("modify", merged.modify);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
