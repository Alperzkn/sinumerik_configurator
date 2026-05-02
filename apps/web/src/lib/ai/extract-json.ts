/**
 * Robust JSON extractor for AI responses.
 *
 * The model isn't guaranteed to return clean JSON. It might wrap it in
 * markdown fences, prepend prose ("Sure! Here's…"), append explanation,
 * or emit multiple JSON-looking fragments. Naive `text.match(/\{.*\}/)`
 * fails on anything but the cleanest output.
 *
 * Strategy:
 *   1. Strip ```json … ``` fences when present.
 *   2. Walk char-by-char, counting braces, ignoring brackets inside
 *      string literals. Return the first balanced `{…}` block that
 *      parses successfully.
 *   3. Fall back to JSON.parse on the whole trimmed text.
 *
 * Returns the parsed value or `null` (parse failed). The caller decides
 * what to do with the failure — typically: log the raw text and 502.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null;

  // 1. Code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // Fall through and try bracket matching on the candidate
      const block = findBalancedBlock(candidate);
      if (block) {
        try {
          return JSON.parse(block);
        } catch { /* try whole text */ }
      }
    }
  }

  // 2. Bracket-balanced scan
  const block = findBalancedBlock(text);
  if (block) {
    try {
      return JSON.parse(block);
    } catch { /* fall through */ }
  }

  // 3. Whole text
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

/**
 * Walk the string and return the substring spanning the FIRST `{` to
 * its matching `}`, accounting for braces inside JSON string literals.
 *
 * If the first `{` never closes (typically: AI hit max_tokens and the
 * response was truncated mid-stream), return `null` — DO NOT fall
 * through to an inner balanced block. We saw this in production: the
 * AI's outer config object was truncated, and the extractor returned a
 * 382-byte `originalRequest` fragment as if it were the config. Better
 * to fail loud and have the route surface "ai_response_truncated".
 */
function findBalancedBlock(text: string): string | null {
  // Find the start of the first object literal.
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = firstBrace; j < text.length; j++) {
    const ch = text[j];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, j + 1);
      }
    }
  }
  // Outer `{` never closed — most likely truncation. Caller should treat
  // this as a parse failure rather than fall back to a fragment.
  return null;
}
