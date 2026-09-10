import { create } from "zustand";
import { convert } from "@/lib/convert-808d/engine";
import { parseText } from "@/lib/convert-808d/parser";
import { EXAMPLE_808D_NAME, EXAMPLE_808D_TEXT } from "@/lib/convert-808d/example";
import type { Conversion, InputRow, StoredConversion } from "@/lib/convert-808d/types";

const STORAGE_KEY = "sinumerik-808d-conversions";

export type ConversionView = "result" | "input";

interface ConverterState {
  conversions: Conversion[];
  selectedId: string | null;
  /** Which tab each conversion card shows. */
  views: Record<string, ConversionView>;
  /** True once localStorage has been read (avoids SSR/hydration mismatch). */
  hydrated: boolean;

  hydrate: () => void;
  addConversion: (name: string, rows: InputRow[], unparsed?: string[]) => Conversion;
  removeConversion: (id: string) => void;
  renameConversion: (id: string, name: string) => void;
  select: (id: string) => void;
  /** Move selection by ±1 in list order. */
  selectRelative: (delta: number) => void;
  setView: (id: string, view: ConversionView) => void;
  /** Add the built-in example 808D list. */
  loadExample: () => void;
  clearAll: () => void;
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function persist(conversions: Conversion[]) {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredConversion[] = conversions.map((c) => ({
      name: c.name,
      rows: c.rows,
      unparsed: c.unparsed,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* quota / private mode — ignore */
  }
}

function readStored(): StoredConversion[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (c): c is StoredConversion =>
        !!c && typeof c === "object" && typeof (c as StoredConversion).name === "string" && Array.isArray((c as StoredConversion).rows),
    );
  } catch {
    return null;
  }
}

function build(name: string, rows: InputRow[], unparsed: string[] = []): Conversion {
  return { id: newId(), name, rows, unparsed, result: convert(rows) };
}

export const useConverterStore = create<ConverterState>((set, get) => ({
  conversions: [],
  selectedId: null,
  views: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readStored();
    let conversions: Conversion[];
    if (stored === null) {
      // First visit: show the worked example so the page isn't empty.
      const { rows, unparsed } = parseText(EXAMPLE_808D_TEXT);
      conversions = [build(EXAMPLE_808D_NAME, rows, unparsed)];
    } else {
      conversions = stored.map((c) => build(c.name, c.rows, c.unparsed ?? []));
    }
    set({ conversions, selectedId: conversions[0]?.id ?? null, hydrated: true });
  },

  addConversion: (name, rows, unparsed = []) => {
    const { conversions } = get();
    const conv = build(name.trim() || `Configuration ${conversions.length + 1}`, rows, unparsed);
    const next = [conv, ...conversions];
    set({ conversions: next, selectedId: conv.id });
    persist(next);
    return conv;
  },

  removeConversion: (id) => {
    const { conversions, selectedId } = get();
    const idx = conversions.findIndex((c) => c.id === id);
    const next = conversions.filter((c) => c.id !== id);
    let nextSelected = selectedId;
    if (selectedId === id) {
      nextSelected = next[Math.min(idx, next.length - 1)]?.id ?? null;
    }
    set({ conversions: next, selectedId: nextSelected });
    persist(next);
  },

  renameConversion: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = get().conversions.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
    set({ conversions: next });
    persist(next);
  },

  select: (id) => set({ selectedId: id }),

  selectRelative: (delta) => {
    const { conversions, selectedId } = get();
    const i = conversions.findIndex((c) => c.id === selectedId) + delta;
    if (conversions[i]) set({ selectedId: conversions[i].id });
  },

  setView: (id, view) => set((s) => ({ views: { ...s.views, [id]: view } })),

  loadExample: () => {
    const { rows, unparsed } = parseText(EXAMPLE_808D_TEXT);
    get().addConversion(EXAMPLE_808D_NAME, rows, unparsed);
  },

  clearAll: () => {
    set({ conversions: [], selectedId: null, views: {} });
    persist([]);
  },
}));
