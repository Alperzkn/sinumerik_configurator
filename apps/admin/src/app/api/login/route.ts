import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminTokenConfigured } from "@/lib/auth";

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

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const submitted = typeof body.token === "string" ? body.token : "";
  if (!submitted || submitted !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

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
