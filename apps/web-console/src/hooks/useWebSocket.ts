'use client';
import { useEffect, useRef } from 'react';
import { resolveWebSocketUrl } from '@/lib/urls';

export function useWebSocket<T>(path: string, onMessage: (data: T | string) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const connectRef = useRef<(() => void) | null>(null);

  // onMessage 변경 시 ref 업데이트
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // connect 함수를 useRef로 저장하여 무한 루프 방지
  if (!connectRef.current) {
    connectRef.current = () => {
      try {
        const ws = new WebSocket(resolveWebSocketUrl(path));
        ws.onmessage = (e) => {
          try {
            onMessageRef.current(JSON.parse(e.data) as T);
          } catch {
            onMessageRef.current(e.data);
          }
        };
        ws.onclose = () => {
          setTimeout(connectRef.current!, 3000);
        };
        wsRef.current = ws;
      } catch (err) {
        console.error('WebSocket URL error:', err);
        setTimeout(connectRef.current!, 3000);
      }
    };
  }

  useEffect(() => {
    const connect = connectRef.current;
    if (connect) {
      connect();
    }
    return () => wsRef.current?.close();
  }, [path]);

  return wsRef;
}
