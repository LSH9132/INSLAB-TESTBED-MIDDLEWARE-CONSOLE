'use client';
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WS_PATH_TERMINAL } from '@inslab/shared';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>, piId: string) {
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({ cursorBlink: true, theme: { background: '#0a0a0a' } });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}${WS_PATH_TERMINAL}/${piId}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (e) => term.write(new Uint8Array(e.data as ArrayBuffer));

    term.onData((data) => ws.send(data));
    term.onResize(({ cols, rows }) => {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    });

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [piId, containerRef]);

  return termRef;
}
