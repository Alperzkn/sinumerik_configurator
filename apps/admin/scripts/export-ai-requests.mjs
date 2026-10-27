// Export what users asked the AI (ai_traces) to an Excel workbook.
// Usage (repo root): node apps/admin/scripts/export-ai-requests.mjs <env file with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY>
// Output: exports/ai-requests-<date>.xlsx (the exports/ folder is gitignored)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

// Credentials: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the process
// environment, or from an env file given as the first argument.
const envFile = process.argv[2];
const fromFile = envFile
  ? Object.fromEntries(
      readFileSync(envFile, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
    )
  : {};
const env = { SUPABASE_URL: process.env.SUPABASE_URL || fromFile.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || fromFile.SUPABASE_SERVICE_ROLE_KEY };
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) { console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing"); process.exit(1); }
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("ai_traces")
    .select("id,session_id,trace_id,created_at,kind,model,user_message,parsed_response,latency_ms,input_tokens,output_tokens,error,redacted,feedback_rating,feedback_comment")
    .order("created_at", { ascending: true }).range(from, from + 999);
  if (error) { console.error("query failed:", error.message); process.exit(1); }
  rows.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}
const { count: configs } = await sb.from("configurations").select("*", { count: "exact", head: true });
const { count: actions } = await sb.from("user_actions").select("*", { count: "exact", head: true });

const pick = (o, path) => path.split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), o);
const out = rows.map((r) => ({
  "Date (UTC)": r.created_at?.replace("T", " ").slice(0, 19),
  Kind: r.kind,
  Session: r.session_id,
  Trace: r.trace_id,
  "What the user asked": r.user_message ?? "",
  "Control system (AI)": pick(r.parsed_response, "controlSystem.family") ?? pick(r.parsed_response, "family") ?? "",
  "Control unit (AI)": pick(r.parsed_response, "controlUnit.id") ?? pick(r.parsed_response, "controlUnit.name") ?? "",
  "Axes (AI)": pick(r.parsed_response, "totalAxes") ?? "",
  Model: r.model ?? "",
  "Latency ms": r.latency_ms ?? "",
  "Tokens in": r.input_tokens ?? "",
  "Tokens out": r.output_tokens ?? "",
  Error: r.error ?? "",
  Redacted: r.redacted ? "yes" : "",
  Feedback: r.feedback_rating === 1 ? "👍" : r.feedback_rating === -1 ? "👎" : "",
  "Feedback comment": r.feedback_comment ?? "",
}));

const wb = XLSX.utils.book_new();
const sh = XLSX.utils.json_to_sheet(out);
sh["!cols"] = [{ wch: 19 }, { wch: 10 }, { wch: 38 }, { wch: 38 }, { wch: 100 }, { wch: 16 }, { wch: 14 }, { wch: 9 }, { wch: 20 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, sh, "AI requests");
const recommend = out.filter((r) => r.Kind === "recommend");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recommend.map(({ "Date (UTC)": d, Session, "What the user asked": q, "Control system (AI)": f, "Control unit (AI)": cu, Feedback }) => ({ "Date (UTC)": d, Session, "What the user asked": q, "Control system (AI)": f, "Control unit (AI)": cu, Feedback }))), "Prompts only");
const summary = [
  ["Exported", new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC"],
  ["AI calls total", rows.length],
  ["  recommend", recommend.length],
  ["  modify", rows.length - recommend.length],
  ["Distinct sessions with AI calls", new Set(rows.map((r) => r.session_id)).size],
  ["First call", rows[0]?.created_at ?? "-"],
  ["Last call", rows.at(-1)?.created_at ?? "-"],
  ["Rows in configurations table", configs ?? "-"],
  ["Rows in user_actions table", actions ?? "-"],
  ["Note", "user_message is the full message sent to the AI: description + template + specs + clarifications. PII was redacted at write time where detected."],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
const file = `exports/ai-requests-${new Date().toISOString().slice(0, 10)}.xlsx`;
XLSX.writeFile(wb, file);
console.log(file);
for (const [k, v] of summary.slice(1, 9)) console.log(`${k}: ${v}`);
