"use client";
import { useEffect, useRef, useCallback } from "react";
import { ProgressData } from "@/lib/types";

const WS_BASE = "ws://127.0.0.1:8000";
const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

/**
 * Fix #1: WebSocket hook with exponential-backoff reconnect.
 * 1s → 2s → 4s → 8s → … → 30s max.
 * Resets to 1s after a successful connection.
 */
export function useWebSocket(
  clientId: string,
  onMessage: (data: ProgressData) => void
) {
  const wsRef        = useRef<WebSocket | null>(null);
  const retryMs      = useRef(INITIAL_RETRY_MS);
  const unmounted    = useRef(false);
  const onMessageRef = useRef(onMessage);

  // Keep the callback fresh without re-triggering the effect
  useEffect(() => { onMessageRef.current = onMessage; });

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const ws = new WebSocket(`${WS_BASE}/ws/${clientId}`);

    ws.onopen = () => {
      retryMs.current = INITIAL_RETRY_MS; // reset backoff on success
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: ProgressData = JSON.parse(event.data as string);
        onMessageRef.current(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (unmounted.current) return;
      const delay = retryMs.current;
      retryMs.current = Math.min(delay * 2, MAX_RETRY_MS);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close(); // triggers onclose → reconnect
    };

    wsRef.current = ws;
  }, [clientId]);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      wsRef.current?.close();
    };
  }, [connect]);
}
