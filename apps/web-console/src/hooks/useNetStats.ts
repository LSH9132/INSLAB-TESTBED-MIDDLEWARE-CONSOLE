'use client';

import { useEffect, useState } from 'react';
import { WS_PATH_NET_STATS, type NetworkInterfaceStat, type NetworkStatSnapshot } from '@inslab/shared';
import { apiFetch } from '@/lib/api';
import { resolveWebSocketUrl } from '@/lib/urls';

interface UseNetStatsOptions {
  piId: string;
  historyLimit?: number;
}

export function useNetStats({ piId, historyLimit = 60 }: UseNetStatsOptions) {
  const [latest, setLatest] = useState<NetworkStatSnapshot | null>(null);
  const [history, setHistory] = useState<Record<string, NetworkInterfaceStat[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      setLoading(true);
      setError(null);

      try {
        const snap = await apiFetch<NetworkStatSnapshot>(`/api/net-stats/${piId}`);
        if (cancelled) return;

        setLatest(snap);

        const historyEntries = await Promise.all(
          snap.interfaces.map(async (iface: NetworkInterfaceStat) => {
            const points = await apiFetch<NetworkInterfaceStat[]>(
              `/api/net-stats/${piId}/history?iface=${encodeURIComponent(iface.iface)}&limit=${historyLimit}`,
            );
            return [iface.iface, [...points].reverse()] as const;
          }),
        );

        if (cancelled) return;
        setHistory(Object.fromEntries(historyEntries));
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [piId, historyLimit]);

  useEffect(() => {
    let ws: WebSocket;

    try {
      ws = new WebSocket(resolveWebSocketUrl(WS_PATH_NET_STATS));
    } catch (e) {
      setError(String(e));
      return;
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type !== 'net-stats') return;
        const snap = msg.data as NetworkStatSnapshot;
        if (snap.piId !== piId) return;

        setLatest(snap);
        setHistory(prev => {
          const next = { ...prev };
          for (const stat of snap.interfaces) {
            const arr = next[stat.iface] ?? [];
            const trimmed = arr.length >= historyLimit ? arr.slice(-(historyLimit - 1)) : arr;
            next[stat.iface] = [...trimmed, stat];
          }
          return next;
        });
      } catch { /* ignore */ }
    };

    ws.onerror = () => setError('WebSocket error');
    return () => ws.close();
  }, [piId, historyLimit]);

  return { latest, history, loading, error };
}
