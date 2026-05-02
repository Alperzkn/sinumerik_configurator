"use client";

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface SectionPanelProps {
  value: string;
  title: string;
  icon: React.ReactNode;
  itemCount: number;
  children: React.ReactNode;
}

export function SectionPanel({
  value,
  title,
  icon,
  itemCount,
  children,
}: SectionPanelProps) {
  return (
    <AccordionItem value={value} className="border rounded-lg mb-2 overflow-hidden">
      <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="text-[10px] h-5 min-w-5 justify-center">
            {itemCount}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4 pb-3 space-y-1.5">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
