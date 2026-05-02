import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Tiny admin auth: a single shared `ADMIN_TOKEN` env var is the password.
 * On a successful POST to /api/login the route handler sets an httpOnly
 * `admin_token` cookie with the same value; every page in this app calls
 * `requireAdmin()` to gate access.
 *
 * No multi-user / role separation — this dashboard is for the project
 * owner only. If we ever need more, swap to Supabase Auth.
 */

export const ADMIN_COOKIE = "admin_token";

export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export async function isAdminAuthed(): Promise<boolean> {
  if (!adminTokenConfigured()) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === process.env.ADMIN_TOKEN;
}

/** Server-side guard for protected pages. Redirects to /login on miss. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthed())) {
    redirect("/login");
  }
}
