import { create } from "zustand";
import type {
  AiMessage,
  CompatibilityWarning,
  GeneratedConfiguration,
  MachineType,
  WizardStep,
} from "@/types/catalog";

export type HistoryKind =
  | "init"
  | "load"
  | "swap"
  | "add_option"
  | "remove_option"
  | "add_package"
  | "remove_package"
  | "add_safety"
  | "remove_safety"
  | "ai_modify"
  | "revert";

export interface HistoryEntry {
  id: string;
  /** Unix ms */
  timestamp: number;
  kind: HistoryKind;
  /** Short headline shown in the list (1 short sentence) */
  title: string;
  /** Optional secondary detail line */
  details?: string;
  /** Snapshot of the configuration AFTER this change — enables revert */
  snapshot: GeneratedConfiguration;
}

export interface MachineSpecsState {
  axisTravel: string;
  movingMass: string;
  rapidTraverse: string;
  spindlePower: string;
  spindleSpeed: string;
  material: string;
  machineSize: string;
  safetyLevel: string;
  /** "" | "none" | "ht2" | "ht10" */
  handheldUnit: string;
  /** "" = default (pp_72_48), "pp_72_48" | "et200sp" | "none" */
  ioModule: string;
  /** Desired motor/encoder cable length in meters (default 10) */
  cableLengthMeters: string;
}

interface ConfiguratorState {
  // Wizard navigation
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;

  // Step 1: Machine description
  machineDescription: string;
  selectedTemplate: MachineType | null;
  machineSpecs: MachineSpecsState;

  // Step 2: AI analysis
  aiMessages: AiMessage[];
  isAiProcessing: boolean;
  isConfigurationReady: boolean;

  // Step 3-4: Configuration
  configuration: GeneratedConfiguration | null;

  // Change-history log
  history: HistoryEntry[];

  // Actions
  setStep: (step: WizardStep) => void;
  completeStep: (step: WizardStep) => void;
  setMachineDescription: (desc: string) => void;
  selectTemplate: (type: MachineType | null) => void;
  setMachineSpecs: (specs: MachineSpecsState) => void;
  addAiMessage: (msg: AiMessage) => void;
  setAiProcessing: (processing: boolean) => void;
  setConfigurationReady: (ready: boolean) => void;
  setConfiguration: (config: GeneratedConfiguration) => void;
  updateConfiguration: (updates: Partial<GeneratedConfiguration>) => void;
  addWarning: (warning: CompatibilityWarning) => void;
  clearWarnings: () => void;
  resetConfiguration: () => void;
  resetAll: () => void;
  /**
   * Restore a snapshot from `saved-configs.ts`. Replaces the wizard state
   * with the saved description / template / specs / configuration and
   * marks the relevant steps as completed so the user lands on
   * Configuration ready to review or modify.
   */
  loadSavedSnapshot: (snapshot: {
    machineDescription: string;
    selectedTemplate: MachineType | null;
    machineSpecs: MachineSpecsState;
    configuration: GeneratedConfiguration;
  }) => void;

  /**
   * Append a single history entry. Caller must provide the post-change
   * configuration snapshot (used to revert later). If `snapshot` is omitted
   * the current `configuration` is used.
   */
  pushHistory: (entry: {
    kind: HistoryKind;
    title: string;
    details?: string;
    snapshot?: GeneratedConfiguration;
  }) => void;

  /** Restore the configuration captured by a given history entry. */
  revertToHistoryEntry: (id: string) => void;

  /** Wipe the change log (keeps the configuration untouched). */
  clearHistory: () => void;
}

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  // Initial state
  currentStep: "description",
  completedSteps: new Set(),
  machineDescription: "",
  selectedTemplate: null,
  machineSpecs: {
    axisTravel: "",
    movingMass: "",
    rapidTraverse: "",
    spindlePower: "",
    spindleSpeed: "",
    material: "",
    machineSize: "",
    safetyLevel: "",
    handheldUnit: "",
    ioModule: "",
    cableLengthMeters: "",
  },
  aiMessages: [],
  isAiProcessing: false,
  isConfigurationReady: false,
  configuration: null,
  history: [],

  // Actions
  setStep: (step) => set({ currentStep: step }),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: new Set([...state.completedSteps, step]),
    })),

  setMachineDescription: (desc) => set({ machineDescription: desc }),

  selectTemplate: (type) => set({ selectedTemplate: type }),

  setMachineSpecs: (specs) => set({ machineSpecs: specs }),

  addAiMessage: (msg) =>
    set((state) => ({
      aiMessages: [...state.aiMessages, msg],
    })),

  setAiProcessing: (processing) => set({ isAiProcessing: processing }),

  setConfigurationReady: (ready) => set({ isConfigurationReady: ready }),

  setConfiguration: (config) =>
    set((state) => {
      // First-time set (no prior config) → seed an "init" history entry so
      // the user always has a baseline to revert to.
      const isFirst = state.configuration === null;
      const seededHistory: HistoryEntry[] = isFirst
        ? [
            {
              id: `hist-${Date.now()}`,
              timestamp: Date.now(),
              kind: "init",
              title: "Initial configuration generated",
              snapshot: config,
            },
          ]
        : state.history;
      return {
        configuration: config,
        isConfigurationReady: true,
        history: seededHistory,
      };
    }),

  updateConfiguration: (updates) =>
    set((state) => ({
      configuration: state.configuration
        ? { ...state.configuration, ...updates }
        : null,
    })),

  addWarning: (warning) =>
    set((state) => ({
      configuration: state.configuration
        ? {
            ...state.configuration,
            warnings: [...state.configuration.warnings, warning],
          }
        : null,
    })),

  clearWarnings: () =>
    set((state) => ({
      configuration: state.configuration
        ? { ...state.configuration, warnings: [] }
        : null,
    })),

  resetConfiguration: () =>
    set({
      configuration: null,
      isConfigurationReady: false,
      aiMessages: [],
      isAiProcessing: false,
      history: [],
    }),

  resetAll: () =>
    set({
      currentStep: "description",
      completedSteps: new Set(),
      machineDescription: "",
      selectedTemplate: null,
      machineSpecs: {
        axisTravel: "",
        movingMass: "",
        rapidTraverse: "",
        spindlePower: "",
        spindleSpeed: "",
        material: "",
        machineSize: "",
        safetyLevel: "",
        handheldUnit: "",
        ioModule: "",
        cableLengthMeters: "",
      },
      aiMessages: [],
      isAiProcessing: false,
      isConfigurationReady: false,
      configuration: null,
      history: [],
    }),

  loadSavedSnapshot: (snapshot) =>
    set({
      machineDescription: snapshot.machineDescription,
      selectedTemplate: snapshot.selectedTemplate,
      machineSpecs: snapshot.machineSpecs,
      configuration: snapshot.configuration,
      isConfigurationReady: true,
      aiMessages: [],
      isAiProcessing: false,
      currentStep: "configuration",
      completedSteps: new Set(["description", "analysis"]),
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: Date.now(),
          kind: "load",
          title: "Loaded saved configuration",
          snapshot: snapshot.configuration,
        },
      ],
    }),

  pushHistory: ({ kind, title, details, snapshot }) =>
    set((state) => {
      const cfg = snapshot ?? state.configuration;
      if (!cfg) return state;
      return {
        history: [
          ...state.history,
          {
            id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            kind,
            title,
            details,
            snapshot: cfg,
          },
        ],
      };
    }),

  revertToHistoryEntry: (id) =>
    set((state) => {
      const entry = state.history.find((h) => h.id === id);
      if (!entry) return state;
      return {
        configuration: entry.snapshot,
        history: [
          ...state.history,
          {
            id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            kind: "revert",
            title: `Reverted to "${entry.title}"`,
            details: new Date(entry.timestamp).toLocaleTimeString(),
            snapshot: entry.snapshot,
          },
        ],
      };
    }),

  clearHistory: () => set({ history: [] }),
}));
