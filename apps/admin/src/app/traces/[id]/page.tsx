import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { getAiTrace } from "@sinumerik/telemetry";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatDuration } from "@/lib/format";
import { JsonView } from "@/components/ui/json-view";

export const dynamic = "force-dynamic";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const trace = await getAiTrace(id);
  if (!trace) notFound();

  const sessionId = trace.session_id as string | null;
  const kind = trace.kind as string;
  const model = trace.model as string | null;
  const userMessage = trace.user_message as string | null;
  const systemPrompt = trace.system_prompt as string | null;
  const conversation = trace.conversation;
  const rawResponse = trace.raw_response;
  const parsedResponse = trace.parsed_response;
  const error = trace.error as string | null;
  const latencyMs = trace.latency_ms as number | null;
  const inputTokens = trace.input_tokens as number | null;
  const outputTokens = trace.output_tokens as number | null;
  const rating = trace.feedback_rating as number | null;
  const feedbackComment = trace.feedback_comment as string | null;
  const redacted = trace.redacted as boolean | null;

  return (
    <div className="space-y-5">
      <div>
        {sessionId && (
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Session timeline
          </Link>
        )}
        <h1 className="text-[20px] font-semibold leading-tight">
          AI trace
          <span className="ml-2.5 text-[12px] tracking-wide text-muted-foreground font-medium align-middle">
            {kind}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground mt-2">
          <span className="font-mono break-all">{id}</span>
          <span>{formatDateTime(trace.created_at as string)}</span>
          {model && <span>{model}</span>}
          {latencyMs != null && <span>{formatDuration(latencyMs)}</span>}
          {(inputTokens != null || outputTokens != null) && (
            <span>
              {inputTokens ?? 0} in / {outputTokens ?? 0} out
            </span>
          )}
          {rating === 1 && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <ThumbsUp className="h-3.5 w-3.5" />
              Helpful
            </span>
          )}
          {rating === -1 && (
            <span className="inline-flex items-center gap-1 text-rose-400">
              <ThumbsDown className="h-3.5 w-3.5" />
              Wrong
            </span>
          )}
          {redacted && (
            <span className="inline-flex items-center rounded bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[11px] font-medium">
              redacted
            </span>
          )}
        </div>
      </div>

      {error && (
        <Section title="Error">
          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-rose-300">
            {error}
          </pre>
        </Section>
      )}

      {feedbackComment && (
        <Section title="User feedback">
          <p className="text-[14px] leading-relaxed">{feedbackComment}</p>
        </Section>
      )}

      {userMessage && (
        <Section title="User prompt">
          <pre className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
            {userMessage}
          </pre>
        </Section>
      )}

      {systemPrompt && (
        <Section title="System prompt" collapsed>
          <pre className="whitespace-pre-wrap text-[12.5px] text-muted-foreground leading-relaxed">
            {systemPrompt}
          </pre>
        </Section>
      )}

      {conversation !== null && conversation !== undefined && (
        <Section title="Conversation" collapsed>
          <JsonView value={conversation} collapsed={1} />
        </Section>
      )}

      {parsedResponse !== null && parsedResponse !== undefined && (
        <Section title="Parsed response">
          <JsonView value={parsedResponse} />
        </Section>
      )}

      {rawResponse !== null && rawResponse !== undefined && (
        <Section title="Raw response" collapsed>
          <JsonView value={rawResponse} collapsed={1} />
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  collapsed = false,
  children,
}: {
  title: string;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="rounded-lg border bg-card overflow-hidden"
      open={!collapsed}
    >
      <summary className="px-4 py-2.5 border-b cursor-pointer text-[12.5px] font-medium text-muted-foreground select-none hover:bg-muted/30 hover:text-foreground transition-colors">
        {title}
      </summary>
      <div className="px-4 py-3.5">{children}</div>
    </details>
  );
}

