'use client';
import { useEffect, useRef, useState } from 'react';

export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>, piId: string) {
  const termRef = useRef<any | null>(null);
  const [status, setStatus] = useState<TerminalStatus>('connecting');

  useEffect(() => {
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

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/terminal/${piId}`);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          setStatus('connected');
          term.focus();
        };

        ws.onmessage = (e) => {
          if (e.data instanceof ArrayBuffer) {
            term.write(new Uint8Array(e.data));
          } else if (typeof e.data === 'string') {
            // SSH에서 텍스트 메시지 (예: 연결 메시지) 수신
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
