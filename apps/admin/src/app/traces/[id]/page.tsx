import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { getAiTrace } from "@sinumerik/telemetry";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatDuration } from "@/lib/format";

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
    <div className="space-y-4">
      <div>
        {sessionId && (
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Session timeline
          </Link>
        )}
        <h1 className="text-base font-semibold">
          AI trace
          <span className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground font-normal">
            {kind}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground mt-1">
          <span className="font-mono">{id}</span>
          <span>{formatDateTime(trace.created_at as string)}</span>
          {model && <span>{model}</span>}
          {latencyMs != null && <span>{formatDuration(latencyMs)}</span>}
          {(inputTokens != null || outputTokens != null) && (
            <span>
              {inputTokens ?? 0} in / {outputTokens ?? 0} out
            </span>
          )}
          {rating === 1 && (
            <span className="inline-flex items-center gap-1 text-emerald-500">
              <ThumbsUp className="h-3 w-3" />
              Helpful
            </span>
          )}
          {rating === -1 && (
            <span className="inline-flex items-center gap-1 text-rose-500">
              <ThumbsDown className="h-3 w-3" />
              Wrong
            </span>
          )}
          {redacted && (
            <span className="inline-flex items-center rounded bg-amber-500/15 text-amber-500 px-1.5 py-0.5 text-[10px]">
              redacted
            </span>
          )}
        </div>
      </div>

      {error && (
        <Section title="Error">
          <pre className="whitespace-pre-wrap text-[12px] text-rose-500">
            {error}
          </pre>
        </Section>
      )}

      {feedbackComment && (
        <Section title="User feedback">
          <p className="text-[13px]">{feedbackComment}</p>
        </Section>
      )}

      {userMessage && (
        <Section title="User prompt">
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed">
            {userMessage}
          </pre>
        </Section>
      )}

      {systemPrompt && (
        <Section title="System prompt" collapsed>
          <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground leading-relaxed">
            {systemPrompt}
          </pre>
        </Section>
      )}

      {conversation !== null && conversation !== undefined && (
        <Section title="Conversation" collapsed>
          <JsonBlock value={conversation} />
        </Section>
      )}

      {parsedResponse !== null && parsedResponse !== undefined && (
        <Section title="Parsed response">
          <JsonBlock value={parsedResponse} />
        </Section>
      )}

      {rawResponse !== null && rawResponse !== undefined && (
        <Section title="Raw response" collapsed>
          <JsonBlock value={rawResponse} />
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
      <summary className="px-3 py-2 border-b cursor-pointer text-[11px] uppercase tracking-wider text-muted-foreground select-none hover:bg-muted/30">
        {title}
      </summary>
      <div className="px-3 py-3">{children}</div>
    </details>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}
