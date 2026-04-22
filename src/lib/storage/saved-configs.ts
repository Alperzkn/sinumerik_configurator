import type { GeneratedConfiguration, MachineType } from "@/types/catalog";
import type { MachineSpecsState } from "@/store/configurator-store";

const STORAGE_KEY = "sinumerik-saved-configs:v1";

/**
 * Snapshot persisted to localStorage. Carries the user's wizard input
 * (description, template, specs) plus the generated configuration so the
 * exact configuration can be restored without re-running the AI / sizing
 * pipeline.
 */
export interface SavedConfig {
  /** Stable identifier (slug-style) used as the localStorage key fragment */
  id: string;
  /** Display name set by the user */
  name: string;
  /** ISO timestamp of last save */
  savedAt: string;
  /** Snapshot data */
  data: {
    machineDescription: string;
    selectedTemplate: MachineType | null;
    machineSpecs: MachineSpecsState;
    configuration: GeneratedConfiguration;
  };
}

interface SavedConfigsIndex {
  version: 1;
  configs: SavedConfig[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readIndex(): SavedConfigsIndex {
  if (!isBrowser()) return { version: 1, configs: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, configs: [] };
    const parsed = JSON.parse(raw) as SavedConfigsIndex;
    if (parsed.version !== 1 || !Array.isArray(parsed.configs)) {
      return { version: 1, configs: [] };
    }
    return parsed;
  } catch {
    return { version: 1, configs: [] };
  }
}

function writeIndex(index: SavedConfigsIndex): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function listSavedConfigs(): SavedConfig[] {
  return readIndex()
    .configs.slice()
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/**
 * Save (or overwrite) a configuration under the given name. If a saved
 * config with the same slug already exists, it is updated in place.
 */
export function saveConfig(
  name: string,
  data: SavedConfig["data"]
): SavedConfig {
  const cleanName = name.trim() || "Untitled configuration";
  let id = slugify(cleanName);
  if (!id) id = `config-${Date.now()}`;

  const index = readIndex();
  const existingIdx = index.configs.findIndex((c) => c.id === id);

  // If slug collides with a different name, suffix with a counter
  if (existingIdx >= 0 && index.configs[existingIdx].name !== cleanName) {
    let counter = 2;
    let candidate = `${id}-${counter}`;
    while (index.configs.some((c) => c.id === candidate)) {
      counter += 1;
      candidate = `${id}-${counter}`;
    }
    id = candidate;
  }

  const saved: SavedConfig = {
    id,
    name: cleanName,
    savedAt: new Date().toISOString(),
    data,
  };

  const finalIdx = index.configs.findIndex((c) => c.id === id);
  if (finalIdx >= 0) {
    index.configs[finalIdx] = saved;
  } else {
    index.configs.push(saved);
  }
  writeIndex(index);
  return saved;
}

export function loadConfig(id: string): SavedConfig | null {
  return readIndex().configs.find((c) => c.id === id) ?? null;
}

export function deleteConfig(id: string): void {
  const index = readIndex();
  index.configs = index.configs.filter((c) => c.id !== id);
  writeIndex(index);
}

export function renameConfig(id: string, newName: string): SavedConfig | null {
  const index = readIndex();
  const target = index.configs.find((c) => c.id === id);
  if (!target) return null;
  target.name = newName.trim() || target.name;
  target.savedAt = new Date().toISOString();
  writeIndex(index);
  return target;
}

/** Export a config as a downloadable JSON file. */
export function exportConfigAsJson(saved: SavedConfig): void {
  if (!isBrowser()) return;
  const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${saved.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a SavedConfig JSON file produced by exportConfigAsJson and store
 * it under a (potentially new) name. Throws if the file is malformed.
 */
export async function importConfigFromFile(file: File): Promise<SavedConfig> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<SavedConfig>;
  if (!parsed?.data?.configuration) {
    throw new Error("File is not a valid SINUMERIK saved configuration.");
  }
  return saveConfig(parsed.name || "Imported configuration", parsed.data);
}
