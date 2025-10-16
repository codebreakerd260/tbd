import "dotenv/config";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import type { WebSocket, RawData } from "ws";
import type {
  CommandMessage,
  TelemetryMessage,
  ServerMessage,
} from "@robot-control/types";

const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});
await fastify.register(websocket);

// Connection state
let esp32Socket: WebSocket | null = null;
const webClients = new Set<WebSocket>();

// In-memory telemetry buffer
const telemetryBuffer: TelemetryMessage[] = [];
const MAX_BUFFER_SIZE = 1000;

function logTelemetry(data: TelemetryMessage) {
  telemetryBuffer.push(data);
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }
}

function broadcastToWeb(message: ServerMessage) {
  const payload = JSON.stringify(message);
  webClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// WebSocket routes
fastify.register(async (fastify) => {
  // ESP32 connects here
  fastify.get("/ws/robot", { websocket: true }, (socket, _req) => {
    fastify.log.info("🤖 ESP32 connected");
    esp32Socket = socket;

    broadcastToWeb({
      type: "status",
      connected: true,
      message: "Robot connected",
    });

    socket.on("message", (raw: RawData) => {
      try {
        const message = JSON.parse(raw.toString()) as TelemetryMessage;

        if (message.type === "telemetry") {
          logTelemetry(message);
        }

        broadcastToWeb(message);
      } catch (err) {
        fastify.log.error(err, "Failed to parse ESP32 message");
      }
    });

    socket.on("close", () => {
      fastify.log.warn("🔴 ESP32 disconnected");
      esp32Socket = null;

      broadcastToWeb({
        type: "status",
        connected: false,
        message: "Robot disconnected",
      });
    });

    socket.on("error", (err: Error) => {
      fastify.log.error(err, "ESP32 socket error");
    });
  });

  // Web UI clients connect here
  fastify.get("/ws/client", { websocket: true }, (socket, _req) => {
    fastify.log.info("💻 Web client connected");
    webClients.add(socket);

    socket.send(
      JSON.stringify({
        type: "status",
        connected: esp32Socket?.readyState === 1,
        message: esp32Socket ? "Robot online" : "Robot offline",
      })
    );

    socket.on("message", (raw: RawData) => {
      try {
        const command = JSON.parse(raw.toString()) as CommandMessage;

        if (!command.type) {
          throw new Error("Missing command type");
        }

        if (esp32Socket && esp32Socket.readyState === 1) {
          esp32Socket.send(JSON.stringify(command));
          fastify.log.debug(`Command sent: ${command.type}`);
        } else {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Robot offline - command not sent",
                command,
            })
          );
        }
      } catch (err) {
        fastify.log.error(err, "Failed to process command");
        socket.send(
          JSON.stringify({
            type: "error",
            message: err instanceof Error ? err.message : "Invalid command",
              command: JSON.parse(raw.toString()),
          })
        );
      }
    });

    socket.on("close", () => {
      webClients.delete(socket);
      fastify.log.info(
        `💻 Web client disconnected (${webClients.size} remaining)`
      );
    });
  });
});

// REST API endpoints
fastify.get("/api/status", async () => {
  return {
    esp32Connected: esp32Socket?.readyState === 1,
    webClientsCount: webClients.size,
    telemetryBufferSize: telemetryBuffer.length,
    uptime: process.uptime(),
  };
});

fastify.get("/api/telemetry/latest", async () => {
  if (telemetryBuffer.length === 0) {
    return { error: "No telemetry data available" };
  }
  return telemetryBuffer[telemetryBuffer.length - 1];
});

fastify.get("/health", async () => {
  return { status: "ok", timestamp: Date.now() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3001", 10);
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });

    fastify.log.info(`
🚀 Fastify server running
📡 WebSocket (ESP32):  ws://localhost:${port}/ws/robot
💻 WebSocket (Client): ws://localhost:${port}/ws/client
🔗 API:                http://localhost:${port}/api/status
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
