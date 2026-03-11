'use client';

import { useEffect, useRef, useState } from 'react';
import { WS_PATH_NET_STATS, type NetStatsWsMessage, type NetworkInterfaceStat, type NetworkStatSnapshot } from '@inslab/shared';
import { apiFetch } from '@/lib/api';
import { resolveWebSocketUrl } from '@/lib/urls';

interface UseNetStatsOptions {
  piId: string;
  historyLimit?: number;
}

function appendHistoryPoint(
  existing: NetworkInterfaceStat[],
  stat: NetworkInterfaceStat,
  historyLimit: number,
) {
  const lastPoint = existing[existing.length - 1];

  if (lastPoint && lastPoint.timestamp === stat.timestamp) {
    const next = [...existing];
    next[next.length - 1] = stat;
    return next;
  }

  const next = [...existing, stat];
  return next.length > historyLimit ? next.slice(-historyLimit) : next;
}

export function useNetStats({ piId, historyLimit = 60 }: UseNetStatsOptions) {
  const [latest, setLatest] = useState<NetworkStatSnapshot | null>(null);
  const [history, setHistory] = useState<Record<string, NetworkInterfaceStat[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const historyRef = useRef<Record<string, NetworkInterfaceStat[]>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasLoadedRef.current = false;
    historyRef.current = {};
    setLatest(null);
    setHistory({});
    setLoading(true);
    setError(null);

    const load = async () => {
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      const isInitialLoad = !hasLoadedRef.current;

      if (isInitialLoad) {
        setLoading(true);
        setError(null);
      }

      try {
        const snap = await apiFetch<NetworkStatSnapshot>(`/api/net-stats/${piId}`);
        if (cancelled) return;

        setLatest(snap);

        if (isInitialLoad) {
          const historyEntries = await Promise.all(
            snap.interfaces.map(async iface => {
              const points = await apiFetch<NetworkInterfaceStat[]>(
                `/api/net-stats/${piId}/history?iface=${encodeURIComponent(iface.iface)}&limit=${historyLimit}`,
              );
              return [iface.iface, [...points].reverse()] as const;
            }),
          );

          if (cancelled) return;
          const nextHistory = Object.fromEntries(historyEntries);
          historyRef.current = nextHistory;
          setHistory(nextHistory);
        } else {
          setHistory(prev => {
            const next = { ...prev };

            for (const stat of snap.interfaces) {
              next[stat.iface] = appendHistoryPoint(next[stat.iface] ?? [], stat, historyLimit);
            }

            historyRef.current = next;
            return next;
          });

          const missingIfaces = snap.interfaces
            .map(stat => stat.iface)
            .filter(iface => !(iface in historyRef.current));

          if (missingIfaces.length > 0) {
            const missingEntries = await Promise.all(
              missingIfaces.map(async iface => {
                const points = await apiFetch<NetworkInterfaceStat[]>(
                  `/api/net-stats/${piId}/history?iface=${encodeURIComponent(iface)}&limit=${historyLimit}`,
                );
                return [iface, [...points].reverse()] as const;
              }),
            );

            if (cancelled) return;
            setHistory(prev => {
              const next = {
                ...prev,
                ...Object.fromEntries(missingEntries),
              };
              historyRef.current = next;
              return next;
            });
          }
        }

        hasLoadedRef.current = true;
        setError(null);
      } catch (err) {
        if (!cancelled && isInitialLoad) setError(String(err));
      } finally {
        inFlightRef.current = false;
        if (!cancelled && isInitialLoad) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
  }, [historyLimit, piId]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;

    const connect = () => {
      try {
        const ws = new WebSocket(resolveWebSocketUrl(WS_PATH_NET_STATS));
        wsRef.current = ws;

        ws.onmessage = async event => {
          try {
            const message = JSON.parse(event.data) as NetStatsWsMessage;
            if (message.type !== 'net-stats') return;
            if (message.data.piId !== piId) return;

            const snapshot = message.data;
            setLatest(snapshot);
            setError(null);

            setHistory(prev => {
              const next = { ...prev };
              for (const stat of snapshot.interfaces) {
                next[stat.iface] = appendHistoryPoint(next[stat.iface] ?? [], stat, historyLimit);
              }
              historyRef.current = next;
              return next;
            });

            const missingIfaces = snapshot.interfaces
              .map(stat => stat.iface)
              .filter(iface => !(iface in historyRef.current));

            if (missingIfaces.length > 0) {
              const missingEntries = await Promise.all(
                missingIfaces.map(async iface => {
                  const points = await apiFetch<NetworkInterfaceStat[]>(
                    `/api/net-stats/${piId}/history?iface=${encodeURIComponent(iface)}&limit=${historyLimit}`,
                  );
                  return [iface, [...points].reverse()] as const;
                }),
              );

              if (cancelled) return;
              setHistory(prev => {
                const next = {
                  ...prev,
                  ...Object.fromEntries(missingEntries),
                };
                historyRef.current = next;
                return next;
              });
            }
          } catch {
            // Ignore malformed messages and preserve the last good snapshot.
          }
        };

        ws.onclose = () => {
          if (cancelled) return;
          retryTimer = window.setTimeout(connect, 3_000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        retryTimer = window.setTimeout(connect, 3_000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [historyLimit, piId]);

  return { latest, history, loading, error };
}
