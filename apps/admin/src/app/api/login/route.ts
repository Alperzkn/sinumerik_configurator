import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminTokenConfigured, isValidAdminToken } from "@/lib/auth";

/**
 * Best-effort brute-force throttle: per-client-IP attempt counter held in
 * process memory (resets on cold start; fine for a single-owner tool).
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

/**
 * POST /api/login   { token: string }
 * Sets an httpOnly cookie if the token matches ADMIN_TOKEN.
 *
 * The cookie value IS the token (kept simple — no JWT, no rotation).
 * That is acceptable here because the token is server-only secret with
 * httpOnly + secure flags.
 */
export async function POST(request: Request) {
  if (!adminTokenConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_TOKEN env var is not set on the server." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  if (throttled(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const submitted = typeof body.token === "string" ? body.token : "";
  if (!isValidAdminToken(submitted)) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }
  attempts.delete(ip);

  const store = await cookies();
  store.set(ADMIN_COOKIE, submitted, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 30 days — admin sessions are convenient, not high-security
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/login — log out by clearing the cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
