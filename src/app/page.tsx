"use client";

import { HeroSection } from "@/components/landing/hero-section";
import { FeatureCards } from "@/components/landing/feature-cards";
import { MachineTypePreview } from "@/components/landing/machine-type-preview";

export default function HomePage() {
  return (
    <main className="flex-1">
      <HeroSection />
      <FeatureCards />
      <MachineTypePreview />

      {/* Footer */}
      <footer className="border-t py-6 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-[11px] text-muted-foreground">
          <p>SINUMERIK ONE Configurator — NC63 Catalog, Jan 2026</p>
          <p>Independent tool. Not affiliated with Siemens AG.</p>
        </div>
      </footer>
    </main>
  );
}
