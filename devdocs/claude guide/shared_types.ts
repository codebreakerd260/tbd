// Command messages (Client/Web → Backend → ESP32)
export type CommandMessage =
  | {
      type: "cmd_vel";
      linear: number; // m/s
      angular: number; // rad/s
    }
  | {
      type: "autopilot";
      enabled: boolean;
    }
  | {
      type: "scan";
      startDeg: number;
      endDeg: number;
      stepDeg: number;
    }
  | {
      type: "reset_pose";
    };

// Telemetry message (ESP32 → Backend → Client/Web)
export interface TelemetryMessage {
  type: "telemetry";
  pose: {
    x: number; // meters
    y: number; // meters
    theta: number; // radians
  };
  scan: Array<{
    angle: number; // degrees
    distCm: number; // centimeters (-1 if no reading)
  }>;
  speed: {
    leftRps: number; // rotations per second
    rightRps: number;
  };
  battery?: {
    voltage: number; // volts
    percentage: number; // 0-100
  };
  status: "manual" | "autopilot" | "error";
  timestamp: number; // millis() from ESP32
}

// Status message
export interface StatusMessage {
  type: "status";
  connected: boolean;
  message?: string;
}

// Error message
export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage = TelemetryMessage | StatusMessage | ErrorMessage;

// Robot configuration
export interface RobotConfig {
  wheelBase: number; // meters
  maxSpeed: number; // m/s
  maxAngular: number; // rad/s
  obstacleThreshold: number; // cm
}

export const DEFAULT_CONFIG: RobotConfig = {
  wheelBase: 0.12,
  maxSpeed: 0.3,
  maxAngular: 2.0,
  obstacleThreshold: 25,
};
