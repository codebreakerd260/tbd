"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CommandMessage } from "@robot-control/types";

interface JoystickProps {
  onCommand: (cmd: CommandMessage) => void;
  disabled?: boolean;
}

export function Joystick({ onCommand, disabled }: JoystickProps) {
  const [linear, setLinear] = useState(0);
  const [angular, setAngular] = useState(0);

  const sendCommand = () => {
    onCommand({
      type: "cmd_vel",
      linear,
      angular,
    });
  };

  const stop = () => {
    setLinear(0);
    setAngular(0);
    onCommand({
      type: "cmd_vel",
      linear: 0,
      angular: 0,
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Linear Speed: {linear.toFixed(2)} m/s
        </label>
        <Slider
          value={[linear]}
          onValueChange={([v]) => setLinear(v)}
          min={-0.3}
          max={0.3}
          step={0.01}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Angular Speed: {angular.toFixed(2)} rad/s
        </label>
        <Slider
          value={[angular]}
          onValueChange={([v]) => setAngular(v)}
          min={-2}
          max={2}
          step={0.05}
          disabled={disabled}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={sendCommand} disabled={disabled} className="flex-1">
          Send Command
        </Button>
        <Button onClick={stop} disabled={disabled} variant="destructive">
          Stop
        </Button>
      </div>
    </Card>
  );
}
