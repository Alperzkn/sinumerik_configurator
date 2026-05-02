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
 * Walk the string and return the first {…} substring whose braces
 * balance, accounting for braces inside JSON string literals (which
 * must NOT count). Returns null if no balanced block is found.
 */
function findBalancedBlock(text: string): string | null {
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "{") {
      i++;
      continue;
    }
    const start = i;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < text.length; j++) {
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
          return text.slice(start, j + 1);
        }
      }
    }
    // Unbalanced from this `{` — try the next one
    i++;
  }
  return null;
}
