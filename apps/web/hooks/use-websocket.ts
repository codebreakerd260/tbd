"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CommandMessage, ServerMessage } from "@robot-control/types";

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        setLastMessage(message);
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    ws.onclose = () => {
      console.log("🔴 WebSocket disconnected");
      setIsConnected(false);

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Reconnecting...");
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }, [url]);

  const send = useCallback((message: CommandMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected - cannot send message");
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected, lastMessage, send };
}
