import Link from "next/link";
import { ArrowUpRight, Cpu, Boxes, ClipboardPaste } from "lucide-react";
import { LandingBomSample } from "@/components/landing/bom-sample";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* ── Masthead ──────────────────────────────────────────────── */}
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center h-14 gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              aria-label="SINUMERIK ONE Configurator home"
            >
              <div
                aria-hidden
                className="h-8 w-8 rounded-md bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm shadow-primary/20 group-hover:shadow-primary/40 transition-shadow"
              >
                <span className="text-primary-foreground text-xs font-semibold tracking-tight">
                  S
                </span>
              </div>
              <div className="text-sm font-medium tracking-tight flex items-center gap-2">
                <span>SINUMERIK</span>
                <span className="text-muted-foreground">Configurator</span>
              </div>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>NC63</span>
              <span className="text-muted-foreground/40">·</span>
              <span>Jan 2026</span>
              <span className="text-muted-foreground/40">·</span>
              <span>v0.1</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <a
                href="https://github.com/Alperzkn/sinumerik_configurator"
                target="_blank"
                rel="noopener"
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Source
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ── Masthead strap — dateline tick rule ───────────────────── */}
      <div className="mx-auto max-w-6xl px-6 w-full pt-6">
        <hr className="rule-tick" />
      </div>

      {/* ── Lede ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 w-full pt-8 pb-10">
        <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-10 items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
              <span className="inline-block h-1 w-6 bg-primary" />
              <span>Catalog-driven configuration</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight">
              <span className="block font-light">Describe your</span>
              <span className="block font-semibold italic text-primary">
                machine tool.
              </span>
              <span className="block font-light text-muted-foreground/90 mt-2">
                Receive the parts list.
              </span>
            </h1>
          </div>

          <div className="lg:pb-2">
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              A configurator for{" "}
              <span className="text-foreground">SINUMERIK ONE</span> CNC systems.
              It reads your machine spec, picks a control unit, sizes the drive
              train against the real Siemens NC63 catalog, and returns a bill
              of materials with actual MLFB article numbers — not a sales
              quote.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              <span className="px-2 py-1 border rounded">4 Control Units</span>
              <span className="px-2 py-1 border rounded">120+ Options</span>
              <span className="px-2 py-1 border rounded">16 Motors</span>
              <span className="px-2 py-1 border rounded">8 Templates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three entry routes ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 w-full pb-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RouteCard
            kind="01"
            href="/configure"
            Icon={Cpu}
            title="Describe your machine"
            subtitle="Natural language → architecture"
            description="Type a sentence like ‘5-axis mill, 22 kW spindle, 800 kg moving mass’. AI returns the control unit, technology packages, safety level. Sizing engine fills in the motors and drives."
          />
          <RouteCard
            kind="02"
            href="/configure"
            Icon={Boxes}
            title="Start from a template"
            subtitle="8 machine types"
            description="3-axis mill, 5-axis center, CNC lathe, mill-turn, grinding, laser, punching, robot cell. Pick one; the sizing engine builds the BOM directly — no AI round-trip."
          />
          <RouteCard
            kind="03"
            href="/configure"
            Icon={ClipboardPaste}
            title="Paste a shared config"
            subtitle="Round-trip markdown payload"
            description="Someone sent you a configuration as text? Paste it, optionally add a one-line change request (‘40 kW spindle and Active Line Module’), and the AI modifies it in one step."
          />
        </div>
      </section>

      {/* ── Live BOM sample (the product IS this table) ───────────── */}
      <section className="mx-auto max-w-6xl px-6 w-full pb-16">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Sample output
            </div>
            <h2 className="text-xl font-medium mt-1 tracking-tight">
              3-axis mill · 4 axes · NCU 1740
            </h2>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground hidden sm:block">
            Bill of materials — truncated
          </div>
        </div>
        <LandingBomSample />
      </section>

      {/* ── Method note ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 w-full pb-20">
        <hr className="rule-tick" />
        <div className="grid sm:grid-cols-3 gap-x-10 gap-y-6 pt-8">
          <MethodNote
            label="Catalog source"
            body="Siemens NC63 — January 2026 catalog scope. Article numbers verified against published MLFBs; invented codes flagged and removed during audits."
          />
          <MethodNote
            label="Sizing"
            body="Motors, motor modules, line modules and cables are sized deterministically from mechanical specs. The AI never invents a drive MLFB."
          />
          <MethodNote
            label="Unaffiliated"
            body="Independent engineering tool. Not affiliated with Siemens AG. Use alongside your Siemens partner — not instead of one."
          />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-[11px] text-muted-foreground">
          <p>
            <span className="font-mono uppercase tracking-[0.15em]">NC63</span>
            <span className="mx-2 text-muted-foreground/40">·</span>
            January 2026 catalog
          </p>
          <p>Independent tool · Unaffiliated with Siemens AG</p>
        </div>
      </footer>
    </main>
  );
}

interface RouteCardProps {
  kind: string;
  href: string;
  title: string;
  subtitle: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function RouteCard({ kind, href, title, subtitle, description, Icon }: RouteCardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
    >
      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {kind}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground/80 group-hover:text-primary transition-colors" />
        </div>
        <div>
          <h3 className="text-lg font-medium tracking-tight leading-tight">
            {title}
          </h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-primary/80 font-mono">
            {subtitle}
          </p>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
          {description}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-foreground/80 group-hover:text-primary transition-colors">
          <span>Open</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
      {/* Tick-corner bottom border — stronger on hover */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-border group-hover:bg-primary/40 transition-colors" />
    </Link>
  );
}

function MethodNote({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-mono mb-2">
        {label}
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
