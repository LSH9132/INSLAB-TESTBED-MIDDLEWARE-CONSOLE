'use client';
import { useEffect, useRef, useState } from 'react';
import { resolveWebSocketUrl } from '@/lib/urls';

export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>, piId: string) {
  const termRef = useRef<any | null>(null);
  const [status, setStatus] = useState<TerminalStatus>('connecting');

  useEffect(() => {
    // 브라우저에서만 실행
    if (typeof window === 'undefined' || !containerRef.current) return;

    // XTerm.js는 브라우저에서만 동적 로드
    import('@xterm/xterm').then(({ Terminal }) => {
      import('@xterm/addon-fit').then(({ FitAddon }) => {
        const term = new Terminal({
          cursorBlink: true,
          theme: { background: '#0a0a0a' },
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current!);
        fit.fit();
        termRef.current = term;

        // WebSocket 연결 - 클라이언트에서만 실행
        try {
          const ws = new WebSocket(resolveWebSocketUrl(`/ws/terminal/${piId}`));
          ws.binaryType = 'arraybuffer';

          ws.onopen = () => {
            setStatus('connected');
            term.focus();
          };

          ws.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) {
              term.write(new Uint8Array(e.data));
            } else if (typeof e.data === 'string') {
              term.write(e.data);
            }
          };

          ws.onerror = () => {
            setStatus('error');
            term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
          };

          ws.onclose = () => {
            setStatus('disconnected');
            term.write('\r\n\x1b[33mConnection closed\x1b[0m\r\n');
          };

          term.onData((data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data);
            }
          });

          term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'resize', cols, rows }));
            }
          });

          const resizeObserver = new ResizeObserver(() => fit.fit());
          resizeObserver.observe(containerRef.current!);

          termRef.current = { term, ws, resizeObserver };
        } catch (err) {
          console.error('WebSocket URL error:', err);
          setStatus('error');
          term.write('\r\n\x1b[31mConfiguration error\x1b[0m\r\n');
        }
      });
    });

    return () => {
      if (termRef.current) {
        const { term, ws, resizeObserver } = termRef.current;
        resizeObserver.disconnect();
        ws.close();
        term.dispose();
      }
    };
  }, [piId, containerRef]);

  return { term: termRef.current?.term, status };
}
