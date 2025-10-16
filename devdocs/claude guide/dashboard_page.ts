"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useRobotStore } from "@/lib/robot-store";
import { RobotCanvas } from "@/components/robot-canvas";
import { Joystick } from "@/components/joystick";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Activity, Wifi, WifiOff, Zap } from "lucide-react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws/client";

export default function Dashboard() {
  const { isConnected, lastMessage, send } = useWebSocket(WS_URL);
  const { telemetry, isAutopilot, setTelemetry, setAutopilot } = useRobotStore();

  useEffect(() => {
    if (lastMessage?.type === "telemetry") {
      setTelemetry(lastMessage);
    }
  }, [lastMessage, setTelemetry]);

  const toggleAutopilot = () => {
    const newState = !isAutopilot;
    setAutopilot(newState);
    send({ type: "autopilot", enabled: newState });
  };

  const resetPose = () => {
    send({ type: "reset_pose" });
  };

  const triggerScan = () => {
    send({ type: "scan", startDeg: -90, endDeg: 90, stepDeg: 10 });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Robot Control Dashboard</h1>
            <p className="text-slate-400 mt-1">Single robot monitoring & control</p>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "destructive"} className="gap-2">
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>

            {telemetry && (
              <Badge variant={telemetry.status === "autopilot" ? "default" : "secondary"}>
                {telemetry.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">Live Map</h2>
              </div>
              <RobotCanvas width={800} height={600} />

              {telemetry && (
                <div className="mt-4 text-sm text-slate-400 font-mono">
                  <p>
                    Position: x={telemetry.pose.x.toFixed(2)}m, y={telemetry.pose.y.toFixed(2)}m, θ={telemetry.pose.theta.toFixed(2)}rad
                  </p>
                  <p>
                    Speed: L={telemetry.speed.leftRps.toFixed(2)} R={telemetry.speed.rightRps.toFixed(2)} rps
                  </p>
                  {telemetry.battery && (
                    <p className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Battery: {telemetry.battery.voltage.toFixed(1)}V ({telemetry.battery.percentage}%)
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Joystick onCommand={send} disabled={!isConnected || isAutopilot} />

            <Card className="p-6 space-y-3">
              <h3 className="font-semibold mb-3">Quick Actions</h3>

              <Button
                onClick={toggleAutopilot}
                disabled={!isConnected}
                variant={isAutopilot ? "destructive" : "default"}
                className="w-full"
              >
                {isAutopilot ? "Disable" : "Enable"} Autopilot
              </Button>

              <Button
                onClick={triggerScan}
                disabled={!isConnected}
                variant="outline"
                className="w-full"
              >
                Trigger Sweep Scan
              </Button>

              <Button
                onClick={resetPose}
                disabled={!isConnected}
                variant="outline"
                className="w-full"
              >
                Reset Position
              </Button>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Telemetry Stats</h3>
              {telemetry ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Obstacles:</span>
                    <span className="font-mono">
                      {telemetry.scan.filter((s) => s.distCm > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Update:</span>
                    <span className="font-mono">{telemetry.timestamp}ms</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Waiting for data...</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}