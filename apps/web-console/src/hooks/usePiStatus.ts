'use client';
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { apiFetch } from '@/lib/api';
import type { PiNode, PiStatusWsMessage } from '@inslab/shared';
import { WS_PATH_STATUS } from '@inslab/shared';

export function usePiStatus() {
  const [pis, setPis] = useState<PiNode[]>([]);

  useEffect(() => {
    apiFetch<PiNode[]>('/api/pis').then(setPis).catch(console.error);
  }, []);

  const onMessage = useCallback((msg: PiStatusWsMessage | string) => {
    if (typeof msg !== 'string' && msg.type === 'pi_status') {
      setPis((prev) =>
        prev.map((p) => (p.id === msg.piId ? { ...p, status: msg.status } : p))
      );
    }
  }, []);

  useWebSocket<PiStatusWsMessage>(WS_PATH_STATUS, onMessage);

  return pis;
}
