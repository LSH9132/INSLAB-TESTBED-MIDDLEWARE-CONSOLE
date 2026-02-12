'use client';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WS_PATH_TERMINAL } from '@inslab/shared';

export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>, piId: string) {
  const termRef = useRef<Terminal | null>(null);
  const [status, setStatus] = useState<TerminalStatus>('connecting');

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#0a0a0a' },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}${WS_PATH_TERMINAL}/${piId}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setStatus('connected');
      term.focus();
    };

    ws.onmessage = (e) => term.write(new Uint8Array(e.data as ArrayBuffer));

    ws.onerror = () => {
      setStatus('error');
      term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      term.write('\r\n\x1b[33mConnection closed\x1b[0m\r\n');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [piId, containerRef]);

  return { term: termRef.current, status };
}
