import Link from "next/link";
import { Activity } from "lucide-react";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { isAdminAuthed } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata = {
  title: "Telemetry admin",
  description: "Internal dashboard — not for public access.",
  robots: { index: false, follow: false },
};

/**
 * Root layout for the admin app. When the visitor isn't signed in we
 * render children flush (so the /login card stays centred); each
 * protected page calls `requireAdmin()` itself to redirect.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthed();

  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${jetBrainsMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {authed ? (
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold text-sm"
                  >
                    <Activity
                      className="h-4 w-4 text-primary"
                      strokeWidth={2}
                    />
                    Telemetry
                  </Link>
                  <nav className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <Link
                      href="/"
                      className="hover:text-foreground transition-colors"
                    >
                      Sessions
                    </Link>
                  </nav>
                </div>
                <SignOutButton />
              </div>
            </header>
            <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-6">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
