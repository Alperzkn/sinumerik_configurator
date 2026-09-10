import type { Metadata } from "next";
import { ConverterShell } from "@/components/converter/converter-shell";

export const metadata: Metadata = {
  title: "808D → 828D Smart converter",
  description:
    "Re-select a SINUMERIK 808D ADVANCED bill of materials from the 828D Smart catalogue: PPU, SD card, S200 drives, 1FL2 / 1PH3 Pro motors and cables.",
};

export default function ConvertPage() {
  return <ConverterShell />;
}
