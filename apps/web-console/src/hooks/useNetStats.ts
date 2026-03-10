'use client';

import { useEffect, useState } from 'react';
import type { NetworkInterfaceStat, NetworkStatSnapshot } from '@inslab/shared';
import { apiFetch } from '@/lib/api';

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

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const snap = await apiFetch<NetworkStatSnapshot>(`/api/net-stats/${piId}`);
        if (cancelled) return;

        setLatest(snap);

        const historyEntries = await Promise.all(
          snap.interfaces.map(async iface => {
            const points = await apiFetch<NetworkInterfaceStat[]>(
              `/api/net-stats/${piId}/history?iface=${encodeURIComponent(iface.iface)}&limit=${historyLimit}`,
            );
            return [iface.iface, [...points].reverse()] as const;
          }),
        );

        if (cancelled) return;
        setHistory(Object.fromEntries(historyEntries));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [historyLimit, piId]);

  return { latest, history, loading, error };
}
