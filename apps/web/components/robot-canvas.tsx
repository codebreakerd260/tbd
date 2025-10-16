"use client";

import { Stage, Layer, Circle, Line, Rect, Arrow } from "react-konva";
import { useRobotStore } from "@/lib/robot-store";

interface RobotCanvasProps {
  width?: number;
  height?: number;
}

export function RobotCanvas({ width = 800, height = 600 }: RobotCanvasProps) {
  const telemetry = useRobotStore((state) => state.telemetry);

  const scale = 100;
  const centerX = width / 2;
  const centerY = height / 2;

  if (!telemetry) {
    return (
      <div
        className="flex items-center justify-center bg-slate-900 rounded-lg"
        style={{ width, height }}
      >
        <p className="text-slate-400">Waiting for telemetry...</p>
      </div>
    );
  }

  const { pose, scan } = telemetry;

  const robotX = centerX + pose.x * scale;
  const robotY = centerY - pose.y * scale;

  return (
    <Stage width={width} height={height} className="bg-slate-900 rounded-lg">
      <Layer>
        {/* Grid */}
        {Array.from({ length: 20 }).map((_, i) => {
          const x = ((i - 10) * scale) / 2 + centerX;
          return (
            <Line
              key={`grid-v-${i}`}
              points={[x, 0, x, height]}
              stroke="#1e293b"
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: 16 }).map((_, i) => {
          const y = ((i - 8) * scale) / 2 + centerY;
          return (
            <Line
              key={`grid-h-${i}`}
              points={[0, y, width, y]}
              stroke="#1e293b"
              strokeWidth={1}
            />
          );
        })}

        {/* Origin axes */}
        <Line
          points={[centerX, 0, centerX, height]}
          stroke="#334155"
          strokeWidth={2}
        />
        <Line
          points={[0, centerY, width, centerY]}
          stroke="#334155"
          strokeWidth={2}
        />

        {/* Scan points */}
        {scan.map((point, idx) => {
          if (point.distCm <= 0) return null;

          const angleRad = (point.angle * Math.PI) / 180 + pose.theta;
          const dist = point.distCm / 100;
          const obstacleX = robotX + Math.cos(angleRad) * dist * scale;
          const obstacleY = robotY - Math.sin(angleRad) * dist * scale;

          return (
            <Circle
              key={`scan-${idx}`}
              x={obstacleX}
              y={obstacleY}
              radius={5}
              fill="#ef4444"
              opacity={0.8}
            />
          );
        })}

        {/* Robot body */}
        <Rect
          x={robotX - 12}
          y={robotY - 12}
          width={24}
          height={24}
          fill="#3b82f6"
          cornerRadius={4}
          rotation={(-pose.theta * 180) / Math.PI}
        />

        {/* Heading indicator */}
        <Arrow
          points={[
            robotX,
            robotY,
            robotX + Math.cos(pose.theta) * 30,
            robotY - Math.sin(pose.theta) * 30,
          ]}
          stroke="#fbbf24"
          strokeWidth={3}
          fill="#fbbf24"
        />
      </Layer>
    </Stage>
  );
}
