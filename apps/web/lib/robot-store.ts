import { create } from "zustand";
import type {
  TelemetryMessage,
  RobotConfig,
} from "@robot-control/types";
import { DEFAULT_CONFIG } from "@robot-control/types";

interface RobotState {
  telemetry: TelemetryMessage | null;
  config: RobotConfig;
  isAutopilot: boolean;

  setTelemetry: (data: TelemetryMessage) => void;
  setConfig: (config: Partial<RobotConfig>) => void;
  setAutopilot: (enabled: boolean) => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  telemetry: null,
  config: DEFAULT_CONFIG,
  isAutopilot: false,

  setTelemetry: (data) => set({ telemetry: data }),
  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),
  setAutopilot: (enabled) => set({ isAutopilot: enabled }),
}));
