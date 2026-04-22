import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Chrome / body type — IBM Plex Sans has strong industrial identity,
// designed for IBM's hardware/enterprise heritage. Fits a Siemens-adjacent
// CNC catalog tool better than a neutral fallback face.
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Display / editorial — used sparingly for figures and numerical emphasis.
const plexSerif = IBM_Plex_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Monospace — JetBrains Mono has clear differentiation between 1/l/I/O/0
// (important for 20-char article numbers like 6SL3120-1TE22-4AD0).
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SINUMERIK ONE Configurator",
    template: "%s — SINUMERIK ONE Configurator",
  },
  description:
    "A catalog-driven configurator for SINUMERIK ONE CNC control systems. Describe your machine, get a verified bill of materials with real MLFB article numbers.",
  applicationName: "SINUMERIK ONE Configurator",
  authors: [{ name: "Alper Özkan" }],
  keywords: [
    "SINUMERIK ONE",
    "CNC configurator",
    "Siemens NC63",
    "machine tool",
    "bill of materials",
    "MLFB",
  ],
  openGraph: {
    title: "SINUMERIK ONE Configurator",
    description:
      "Describe your machine, get a verified SINUMERIK ONE bill of materials.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1619" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSerif.variable} ${jetBrainsMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
