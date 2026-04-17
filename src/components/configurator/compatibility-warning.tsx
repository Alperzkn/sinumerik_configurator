"use client";

import { motion } from "framer-motion";
import type { CompatibilityWarning as Warning } from "@/types/catalog";
import { cn } from "@/lib/utils";

interface CompatibilityWarningProps {
  warnings: Warning[];
}

const severityConfig = {
  error: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-500",
    text: "text-red-800 dark:text-red-200",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-500",
    text: "text-amber-800 dark:text-amber-200",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-500",
    text: "text-blue-800 dark:text-blue-200",
  },
};

export function CompatibilityWarnings({ warnings }: CompatibilityWarningProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => {
        const config = severityConfig[warning.severity];
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex gap-3 rounded-lg border p-3",
              config.bg,
              config.border
            )}
          >
            <div className={cn("mt-0.5 shrink-0", config.icon)}>
              {warning.severity === "error" ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              ) : warning.severity === "warning" ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={cn("text-sm", config.text)}>{warning.message}</p>
              {warning.suggestion && (
                <p className={cn("text-xs mt-1 opacity-80", config.text)}>
                  {warning.suggestion}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
