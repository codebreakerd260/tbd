import { create } from "zustand";
import {
  type TelemetryMessage,
  type RobotConfig,
  DEFAULT_CONFIG,
} from "@robot-control/types";

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
  config:
    typeof DEFAULT_CONFIG !== "undefined"
      ? DEFAULT_CONFIG
      : {
          wheelBase: 0.12,
          maxSpeed: 0.3,
          maxAngular: 2.0,
          obstacleThreshold: 25,
        },
  isAutopilot: false,

  setTelemetry: (data) => set({ telemetry: data }),
  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),
  setAutopilot: (enabled) => set({ isAutopilot: enabled }),
}));
