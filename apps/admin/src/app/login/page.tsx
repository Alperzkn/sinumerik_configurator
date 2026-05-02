import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { adminTokenConfigured, isAdminAuthed } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdminAuthed()) redirect("/");

  const configured = adminTokenConfigured();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <LockKeyhole className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold leading-tight">Telemetry admin</h1>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Restricted — owner only
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          {configured ? (
            <LoginForm />
          ) : (
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              <code className="text-foreground">ADMIN_TOKEN</code> is not set on the
              server. Add it to <code className="text-foreground">.env.local</code>{" "}
              and restart the dev server.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
