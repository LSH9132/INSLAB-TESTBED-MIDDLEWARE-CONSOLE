'use client';
import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(path: string, onMessage: (data: any) => void) {
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
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const centralServerUrl = process.env.NEXT_PUBLIC_CENTRAL_SERVER_URL || 'http://localhost:3001';
      try {
        const url = new URL(centralServerUrl);
        const ws = new WebSocket(`${protocol}//${url.host}${path}`);
        ws.onmessage = (e) => {
          try { onMessageRef.current(JSON.parse(e.data)); } catch { onMessageRef.current(e.data); }
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
