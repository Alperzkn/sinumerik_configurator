import { create } from "zustand";
import type {
  AiMessage,
  CompatibilityWarning,
  GeneratedConfiguration,
  MachineType,
  WizardStep,
} from "@/types/catalog";

export interface MachineSpecsState {
  axisTravel: string;
  movingMass: string;
  rapidTraverse: string;
  spindlePower: string;
  spindleSpeed: string;
  material: string;
  machineSize: string;
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
  },
  aiMessages: [],
  isAiProcessing: false,
  isConfigurationReady: false,
  configuration: null,

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
    set({
      configuration: config,
      isConfigurationReady: true,
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
      },
      aiMessages: [],
      isAiProcessing: false,
      isConfigurationReady: false,
      configuration: null,
    }),
}));
