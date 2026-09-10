/**
 * Guards shared by the AI-backed API routes.
 *
 * The routes are public (no login) and each call spends real money on
 * the Anthropic API, so we (a) refuse oversized bodies and (b) throttle
 * per client IP. The limiter is in-process memory: on serverless it is
 * per warm instance, which still blunts casual abuse and scripted loops.
 */

import { NextResponse } from "next/server";

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (!b.hits.length) buckets.delete(k);
  }
}

/**
 * Sliding-window limiter. Returns `null` when allowed, or a ready-made
 * 429 response when the caller has exceeded `limit` calls per `windowMs`.
 */
export function rateLimit(
  request: Request,
  scope: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
  const now = Date.now();
  sweep(now, windowMs);
  const key = `${scope}:${clientIp(request)}`;
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - b.hits[0])) / 1000);
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Too many requests. Please wait about ${Math.max(1, Math.ceil(retryAfter / 60))} minute(s) and try again.`,
      },
      { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } },
    );
  }
  b.hits.push(now);
  buckets.set(key, b);
  return null;
}

/** Trim a client-supplied string to a hard character cap ("" when not a string). */
export function boundedString(value: unknown, maxChars: number): string {
  return typeof value === "string" ? value.slice(0, maxChars) : "";
}

/** AI routes: 20 calls per 10 minutes per IP is generous for real use. */
export const AI_ROUTE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };
