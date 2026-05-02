import Link from "next/link";
import { ChevronRight, MessageSquareWarning, Wrench } from "lucide-react";
import { listSessions } from "@sinumerik/telemetry";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatDuration, formatTokens, shortId } from "@/lib/format";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Sessions</h1>
          <p className="text-[12px] text-muted-foreground">
            Each row is one user&apos;s journey from prompt → BOM. Click in to
            see the full timeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterToggle
            active={sp.modify === "1"}
            label="Used modify"
            icon={<Wrench className="h-3 w-3" />}
            href={buildHref(sp, { modify: sp.modify === "1" ? undefined : "1" })}
          />
          <FilterToggle
            active={sp.thumbsDown === "1"}
            label="Thumbs down"
            icon={<MessageSquareWarning className="h-3 w-3" />}
            href={buildHref(sp, {
              thumbsDown: sp.thumbsDown === "1" ? undefined : "1",
            })}
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          {filtersActive
            ? "No sessions match these filters."
            : "No sessions logged yet. Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set on the web app and the migration has run."}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="text-left px-3 py-2 font-medium">Session</th>
                <th className="text-left px-3 py-2 font-medium">Started</th>
                <th className="text-right px-3 py-2 font-medium">AI calls</th>
                <th className="text-right px-3 py-2 font-medium">Latency</th>
                <th className="text-right px-3 py-2 font-medium">Tokens (out)</th>
                <th className="text-right px-3 py-2 font-medium">Feedback</th>
                <th className="text-right px-3 py-2 font-medium">Errors</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.session_id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-[12px]">
                    <Link
                      href={`/sessions/${s.session_id}`}
                      className="hover:text-primary"
                    >
                      {shortId(s.session_id, 12)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-muted-foreground">
                    {formatDateTime(s.started_at)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.recommend_calls + s.modify_calls}
                    {s.modify_calls > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({s.modify_calls} mod)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatDuration(s.total_latency_ms)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatTokens(s.total_output_tokens)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.thumbs_up > 0 && (
                      <span className="text-emerald-500 mr-1.5">
                        +{s.thumbs_up}
                      </span>
                    )}
                    {s.thumbs_down > 0 && (
                      <span className="text-rose-500">−{s.thumbs_down}</span>
                    )}
                    {s.thumbs_up + s.thumbs_down === 0 && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.errors > 0 ? (
                      <span className="text-rose-500">{s.errors}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <Link
                      href={`/sessions/${s.session_id}`}
                      className="hover:text-foreground"
                      aria-label="Open session"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <div>
          Page {pageNum}
          {sessions.length === PAGE_SIZE && " — more available"}
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
          {sessions.length === PAGE_SIZE && (
            <Link
              href={buildHref(sp, { page: String(pageNum + 1) })}
              className="hover:text-foreground"
            >
              Older →
            </Link>
          )}
        </div>
      </div>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
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
