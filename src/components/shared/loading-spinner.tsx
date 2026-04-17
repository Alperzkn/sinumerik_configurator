"use client";

import { motion } from "framer-motion";

const STAGES = [
  "Connecting to AI...",
  "Analyzing machine requirements...",
  "Selecting control unit...",
  "Evaluating drive system options...",
  "Matching motors to mechanical requirements...",
  "Selecting optimal components...",
  "Validating configuration...",
];

export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-4 px-1">
      <div className="relative shrink-0">
        <motion.div
          className="h-5 w-5 rounded-full border-2 border-primary/20"
          style={{ borderTopColor: "var(--primary)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.p
        className="text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text || "Processing..."}
      </motion.p>
    </div>
  );
}

export function ProcessingSteps() {
  return (
    <div className="space-y-2 py-2">
      {STAGES.map((stage, i) => (
        <motion.div
          key={stage}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 2.5, duration: 0.3 }}
          className="flex items-center gap-2 text-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 2.5 + 0.2 }}
          >
            {i < STAGES.length - 1 ? (
              <motion.svg
                className="h-3.5 w-3.5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 2.5 + 1.5, duration: 0.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </motion.svg>
            ) : (
              <motion.div
                className="h-3.5 w-3.5 rounded-full border-2 border-primary/30"
                style={{ borderTopColor: "var(--primary)" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.div>
          <span className="text-muted-foreground">{stage}</span>
        </motion.div>
      ))}
    </div>
  );
}
