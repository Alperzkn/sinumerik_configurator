"use client";

import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  /** ms before auto-dismiss; 0 = manual only */
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: ToastItem = {
      id,
      title: t.title,
      description: t.description,
      tone: t.tone,
      // Default: sticky (0 = manual-dismiss only). Caller can pass a positive
      // duration if they want a transient toast.
      duration: t.duration ?? 0,
    };
    set((s) => ({ toasts: [...s.toasts, item] }));
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Convenience helper — call from anywhere without needing the hook. */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "success" }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "info" }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "warning" }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "error" }),
};

const TONE_STYLES: Record<ToastTone, { box: string; icon: string; iconColor: string }> = {
  success: {
    box: "border-emerald-500/30 bg-emerald-500/10",
    iconColor: "text-emerald-400",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  info: {
    box: "border-sky-500/30 bg-sky-500/10",
    iconColor: "text-sky-400",
    icon: "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
  },
  warning: {
    box: "border-amber-500/30 bg-amber-500/10",
    iconColor: "text-amber-400",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  },
  error: {
    box: "border-destructive/30 bg-destructive/10",
    iconColor: "text-destructive",
    icon: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
  },
};

function ToastView({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const tone = TONE_STYLES[item.tone];

  useEffect(() => {
    if (item.duration <= 0) return;
    const t = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.duration, item.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className={cn(
        "pointer-events-auto rounded-lg border backdrop-blur-md px-3 py-2.5 shadow-lg w-[320px]",
        tone.box
      )}
    >
      <div className="flex items-start gap-2.5">
        <svg
          className={cn("h-5 w-5 mt-0.5 shrink-0", tone.iconColor)}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={tone.icon} />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-tight">{item.title}</div>
          {item.description && (
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
              {item.description}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors -mr-1 -mt-1"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Toast container — render once at the app root. Toasts stack from the
 * bottom-right corner.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-1000 flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
