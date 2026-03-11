'use client';

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { NetworkInterfaceStat, NetworkStatSnapshot, PiNode } from '@inslab/shared';
import { apiFetch } from '@/lib/api';

type FilterMode = 'all' | 'collecting' | 'unavailable' | 'offline';
type SortMode = 'traffic' | 'rx' | 'tx' | 'updated' | 'name';
type ChartMetricMode = 'total' | 'rx' | 'tx';
type ChartWindow = '60' | '120' | '240';
type InterfaceMetricMode = 'total' | 'rx' | 'tx';

interface AggregatedPoint {
  timestamp: number;
  rxBps: number;
  txBps: number;
}

interface NodeTelemetry {
  pi: PiNode;
  latest: NetworkStatSnapshot | null;
  history: AggregatedPoint[];
  rawHistory: NetworkInterfaceStat[];
  totalRxBps: number;
  totalTxBps: number;
  interfaceCount: number;
  updatedAt: number | null;
  error: string | null;
}

interface ChartSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
  lastValue: number;
}

const SERIES_COLORS = ['#3182F6', '#0BC27C', '#F5A623', '#F04452', '#8B5CF6', '#14B8A6', '#EC4899', '#64748B'];

function formatRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let amount = value;
  let idx = 0;
  while (amount >= 1024 && idx < units.length - 1) {
    amount /= 1024;
    idx += 1;
  }
  return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)} ${units[idx]}`;
}

function formatCompactDate(timestampSec: number) {
  const date = new Date(timestampSec * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatRelativeTime(timestampSec: number | null) {
  if (!timestampSec) return '수집 없음';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestampSec);
  if (diff < 5) return '방금 전';
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

function aggregateHistory(points: NetworkInterfaceStat[]): AggregatedPoint[] {
  const bucket = new Map<number, AggregatedPoint>();
  for (const point of points) {
    const existing = bucket.get(point.timestamp) ?? { timestamp: point.timestamp, rxBps: 0, txBps: 0 };
    existing.rxBps += point.rxBps;
    existing.txBps += point.txBps;
    bucket.set(point.timestamp, existing);
  }
  return [...bucket.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function aggregateInterfaceHistory(points: NetworkInterfaceStat[], iface: string): AggregatedPoint[] {
  const bucket = new Map<number, AggregatedPoint>();
  for (const point of points) {
    if (point.iface !== iface) continue;
    const existing = bucket.get(point.timestamp) ?? { timestamp: point.timestamp, rxBps: 0, txBps: 0 };
    existing.rxBps += point.rxBps;
    existing.txBps += point.txBps;
    bucket.set(point.timestamp, existing);
  }
  return [...bucket.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function getStatus(row: NodeTelemetry): FilterMode {
  if (row.pi.status !== 'online') return 'offline';
  if (row.latest) return 'collecting';
  return 'unavailable';
}

function buildLinePath(values: number[], width: number, height: number, maxValue: number) {
  if (values.length === 0) return '';
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (value / maxValue) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function MultiNodeTrendChart({
  timestamps,
  series,
  aggregateSeries,
  threshold,
}: {
  timestamps: number[];
  series: ChartSeries[];
  aggregateSeries: ChartSeries | null;
  threshold?: number;
}) {
  const width = 920;
  const height = 240;
  const allSeries = aggregateSeries ? [aggregateSeries, ...series] : series;
  const maxValue = Math.max(1, ...allSeries.flatMap(item => item.values));
  const thresholdY = threshold && threshold > 0
    ? height - (Math.min(threshold, maxValue) / maxValue) * height
    : null;

  if (timestamps.length === 0 || series.length === 0) {
    return <div className="h-[240px] flex items-center justify-center text-[14px] text-[#8B95A1] dark:text-gray-500">그래프를 표시할 수집 데이터가 없습니다.</div>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px]">
        {allSeries.map(item => (
          <span key={item.id} className="inline-flex items-center gap-2 text-[#191F28] dark:text-gray-100">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, opacity: item.id === 'aggregate' ? 0.8 : 1 }} />
            {item.label} {formatRate(item.lastValue)}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible rounded-2xl bg-[#F9FAFB] dark:bg-gray-900">
        {thresholdY !== null && (
          <>
            <rect x="0" y="0" width={width} height={thresholdY} fill="#F04452" fillOpacity="0.05" />
            <line x1="0" y1={thresholdY} x2={width} y2={thresholdY} stroke="#F04452" strokeWidth="2" strokeDasharray="8 6" />
          </>
        )}
        {[0.25, 0.5, 0.75].map(ratio => (
          <line key={ratio} x1="0" y1={height * ratio} x2={width} y2={height * ratio} stroke="currentColor" className="text-[#E5E8EB] dark:text-gray-800" strokeDasharray="4 6" />
        ))}
        {allSeries.map(item => (
          <path
            key={item.id}
            d={buildLinePath(item.values, width, height, maxValue)}
            fill="none"
            stroke={item.color}
            strokeWidth={item.id === 'aggregate' ? 4.5 : 2.5}
            strokeOpacity={item.id === 'aggregate' ? 0.95 : 0.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={item.id === 'aggregate' ? '0' : '0'}
          />
        ))}
      </svg>
      <div className="mt-3 flex justify-between text-[12px] text-[#8B95A1] dark:text-gray-500">
        <span>{formatCompactDate(timestamps[0])}</span>
        <span>{formatCompactDate(timestamps[timestamps.length - 1])}</span>
      </div>
    </div>
  );
}

function TopNodesChart({ rows }: { rows: NodeTelemetry[] }) {
  const top = rows
    .filter(row => row.latest)
    .sort((a, b) => (b.totalRxBps + b.totalTxBps) - (a.totalRxBps + a.totalTxBps))
    .slice(0, 8);
  const max = Math.max(...top.map(row => row.totalRxBps + row.totalTxBps), 1);

  if (top.length === 0) {
    return <div className="h-[280px] flex items-center justify-center text-[14px] text-[#8B95A1] dark:text-gray-500">표시할 노드가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      {top.map(row => {
        const total = row.totalRxBps + row.totalTxBps;
        const rxWidth = `${(row.totalRxBps / max) * 100}%`;
        const txWidth = `${(row.totalTxBps / max) * 100}%`;
        return (
          <div key={row.pi.id}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#191F28] dark:text-gray-100">{row.pi.name}</span>
              <span className="font-mono text-[#6B7684] dark:text-gray-400">{formatRate(total)}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-[#E5E8EB] dark:bg-gray-800">
              <div className="bg-[#3182F6]" style={{ width: rxWidth }} />
              <div className="bg-[#0BC27C]" style={{ width: txWidth }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NetworkAnalyticsView({ pis }: { pis: PiNode[] }) {
  const [telemetry, setTelemetry] = useState<NodeTelemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ifaceFilter, setIfaceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('traffic');
  const [minRxKbps, setMinRxKbps] = useState('');
  const [minTxKbps, setMinTxKbps] = useState('');
  const [updatedWithinSec, setUpdatedWithinSec] = useState('120');
  const [chartMetricMode, setChartMetricMode] = useState<ChartMetricMode>('total');
  const [chartWindow, setChartWindow] = useState<ChartWindow>('120');
  const [selectedPiIds, setSelectedPiIds] = useState<string[]>([]);
  const [showAggregateOverlay, setShowAggregateOverlay] = useState(true);
  const [thresholdKbps, setThresholdKbps] = useState('0');
  const [zoomPoints, setZoomPoints] = useState('120');
  const [panOffset, setPanOffset] = useState('0');
  const [focusPiId, setFocusPiId] = useState('');
  const [selectedInterfaces, setSelectedInterfaces] = useState<string[]>([]);
  const [interfaceMetricMode, setInterfaceMetricMode] = useState<InterfaceMetricMode>('total');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const deferredIface = useDeferredValue(ifaceFilter.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const rows = await Promise.all(
        pis.map(async pi => {
          if (pi.status !== 'online') {
            return {
              pi,
              latest: null,
              history: [],
              rawHistory: [],
              totalRxBps: 0,
              totalTxBps: 0,
              interfaceCount: 0,
              updatedAt: null,
              error: null,
            } satisfies NodeTelemetry;
          }

          try {
            const [latest, history] = await Promise.all([
              apiFetch<NetworkStatSnapshot>(`/api/net-stats/${pi.id}`),
              apiFetch<NetworkInterfaceStat[]>(`/api/net-stats/${pi.id}/history?limit=240`),
            ]);

            const aggregatedHistory = aggregateHistory(history);
            return {
              pi,
              latest,
              history: aggregatedHistory,
              rawHistory: history,
              totalRxBps: latest.interfaces.reduce((sum, iface) => sum + iface.rxBps, 0),
              totalTxBps: latest.interfaces.reduce((sum, iface) => sum + iface.txBps, 0),
              interfaceCount: latest.interfaces.length,
              updatedAt: latest.receivedAt ?? latest.timestamp,
              error: null,
            } satisfies NodeTelemetry;
          } catch (error) {
            return {
              pi,
              latest: null,
              history: [],
              rawHistory: [],
              totalRxBps: 0,
              totalTxBps: 0,
              interfaceCount: 0,
              updatedAt: null,
              error: String(error),
            } satisfies NodeTelemetry;
          }
        }),
      );

      if (!cancelled) {
        startTransition(() => {
          setTelemetry(rows);
          setLoading(false);
        });
      }
    };

    load();
    const timer = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pis]);

  const filteredRows = useMemo(() => {
    const minRxBps = Number(minRxKbps || '0') * 1024;
    const minTxBps = Number(minTxKbps || '0') * 1024;
    const nowSec = Math.floor(Date.now() / 1000);

    const rows = telemetry.filter(row => {
      const status = getStatus(row);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (deferredSearch) {
        const haystack = `${row.pi.name} ${row.pi.ip}`.toLowerCase();
        if (!haystack.includes(deferredSearch)) return false;
      }

      if (deferredIface) {
        const interfaces = row.latest?.interfaces ?? [];
        if (!interfaces.some(iface => iface.iface.toLowerCase().includes(deferredIface))) return false;
      }

      if (row.totalRxBps < minRxBps || row.totalTxBps < minTxBps) return false;

      if (updatedWithinSec !== 'all' && row.updatedAt) {
        if (nowSec - row.updatedAt > Number(updatedWithinSec)) return false;
      } else if (updatedWithinSec !== 'all' && !row.updatedAt) {
        return false;
      }

      return true;
    });

    rows.sort((left, right) => {
      if (sortMode === 'name') return left.pi.name.localeCompare(right.pi.name);
      if (sortMode === 'rx') return right.totalRxBps - left.totalRxBps;
      if (sortMode === 'tx') return right.totalTxBps - left.totalTxBps;
      if (sortMode === 'updated') return (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
      return (right.totalRxBps + right.totalTxBps) - (left.totalRxBps + left.totalTxBps);
    });

    return rows;
  }, [deferredIface, deferredSearch, minRxKbps, minTxKbps, sortMode, statusFilter, telemetry, updatedWithinSec]);

  const aggregateTrend = useMemo(() => {
    const bucket = new Map<number, AggregatedPoint>();
    for (const row of filteredRows) {
      for (const point of row.history) {
        const existing = bucket.get(point.timestamp) ?? { timestamp: point.timestamp, rxBps: 0, txBps: 0 };
        existing.rxBps += point.rxBps;
        existing.txBps += point.txBps;
        bucket.set(point.timestamp, existing);
      }
    }
    return [...bucket.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-120);
  }, [filteredRows]);

  useEffect(() => {
    const candidates = filteredRows.filter(row => row.latest).map(row => row.pi.id);
    setSelectedPiIds(prev => {
      const kept = prev.filter(id => candidates.includes(id));
      if (kept.length > 0) return kept;
      return candidates.slice(0, 6);
    });
  }, [filteredRows]);

  const chartRows = useMemo(
    () => filteredRows.filter(row => row.latest && selectedPiIds.includes(row.pi.id)),
    [filteredRows, selectedPiIds],
  );

  const chartTimestamps = useMemo(() => {
    const bucket = new Set<number>();
    for (const row of chartRows) {
      for (const point of row.history.slice(-Number(chartWindow))) {
        bucket.add(point.timestamp);
      }
    }
    return [...bucket].sort((a, b) => a - b);
  }, [chartRows, chartWindow]);

  const visibleChartTimestamps = useMemo(() => {
    if (chartTimestamps.length === 0) return [];
    const zoom = clamp(Number(zoomPoints || chartWindow), 20, Number(chartWindow));
    const maxOffset = Math.max(0, chartTimestamps.length - zoom);
    const offset = clamp(Number(panOffset || '0'), 0, maxOffset);
    const start = Math.max(0, chartTimestamps.length - zoom - offset);
    return chartTimestamps.slice(start, start + zoom);
  }, [chartTimestamps, chartWindow, panOffset, zoomPoints]);

  const chartSeries = useMemo<ChartSeries[]>(() => {
    return chartRows.map((row, index) => {
      const historySlice = row.history.slice(-Number(chartWindow));
      const byTs = new Map(historySlice.map(point => [point.timestamp, point]));
      const values = visibleChartTimestamps.map(timestamp => {
        const point = byTs.get(timestamp);
        if (!point) return 0;
        if (chartMetricMode === 'rx') return point.rxBps;
        if (chartMetricMode === 'tx') return point.txBps;
        return point.rxBps + point.txBps;
      });
      return {
        id: row.pi.id,
        label: row.pi.name,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        values,
        lastValue: values[values.length - 1] ?? 0,
      };
    });
  }, [chartMetricMode, chartRows, chartWindow, visibleChartTimestamps]);

  const aggregateOverlaySeries = useMemo<ChartSeries | null>(() => {
    if (!showAggregateOverlay || visibleChartTimestamps.length === 0) return null;
    const values = visibleChartTimestamps.map(timestamp => {
      const point = aggregateTrend.find(item => item.timestamp === timestamp);
      if (!point) return 0;
      if (chartMetricMode === 'rx') return point.rxBps;
      if (chartMetricMode === 'tx') return point.txBps;
      return point.rxBps + point.txBps;
    });
    return {
      id: 'aggregate',
      label: '전체 합계',
      color: '#111827',
      values,
      lastValue: values[values.length - 1] ?? 0,
    };
  }, [aggregateTrend, chartMetricMode, showAggregateOverlay, visibleChartTimestamps]);

  const collectingRows = filteredRows.filter(row => row.latest);
  const totalRx = collectingRows.reduce((sum, row) => sum + row.totalRxBps, 0);
  const totalTx = collectingRows.reduce((sum, row) => sum + row.totalTxBps, 0);
  const collectingCount = collectingRows.length;
  const unavailableCount = filteredRows.filter(row => getStatus(row) === 'unavailable').length;
  const chartThreshold = Number(thresholdKbps || '0') * 1024;
  const chartZoomMax = Math.max(20, Number(chartWindow));
  const chartPanMax = Math.max(0, chartTimestamps.length - clamp(Number(zoomPoints || chartWindow), 20, Number(chartWindow)));

  useEffect(() => {
    if (focusPiId && collectingRows.some(row => row.pi.id === focusPiId)) return;
    setFocusPiId(collectingRows[0]?.pi.id ?? '');
  }, [collectingRows, focusPiId]);

  const focusedRow = useMemo(
    () => collectingRows.find(row => row.pi.id === focusPiId) ?? null,
    [collectingRows, focusPiId],
  );

  const availableInterfaces = useMemo(() => {
    if (!focusedRow?.latest) return [];
    return focusedRow.latest.interfaces.map(iface => iface.iface).sort((a, b) => a.localeCompare(b));
  }, [focusedRow]);

  useEffect(() => {
    setSelectedInterfaces(prev => {
      const kept = prev.filter(iface => availableInterfaces.includes(iface));
      if (kept.length > 0) return kept;
      return availableInterfaces.slice(0, 4);
    });
  }, [availableInterfaces]);

  const interfaceTimestamps = useMemo(() => {
    if (!focusedRow || selectedInterfaces.length === 0) return [];
    const bucket = new Set<number>();
    for (const iface of selectedInterfaces) {
      for (const point of aggregateInterfaceHistory(focusedRow.rawHistory, iface).slice(-Number(chartWindow))) {
        bucket.add(point.timestamp);
      }
    }
    const sorted = [...bucket].sort((a, b) => a - b);
    const zoom = clamp(Number(zoomPoints || chartWindow), 20, Number(chartWindow));
    const maxOffset = Math.max(0, sorted.length - zoom);
    const offset = clamp(Number(panOffset || '0'), 0, maxOffset);
    const start = Math.max(0, sorted.length - zoom - offset);
    return sorted.slice(start, start + zoom);
  }, [chartWindow, focusedRow, panOffset, selectedInterfaces, zoomPoints]);

  const interfaceSeries = useMemo<ChartSeries[]>(() => {
    if (!focusedRow) return [];
    return selectedInterfaces.map((iface, index) => {
      const aggregated = aggregateInterfaceHistory(focusedRow.rawHistory, iface).slice(-Number(chartWindow));
      const byTs = new Map(aggregated.map(point => [point.timestamp, point]));
      const values = interfaceTimestamps.map(timestamp => {
        const point = byTs.get(timestamp);
        if (!point) return 0;
        if (interfaceMetricMode === 'rx') return point.rxBps;
        if (interfaceMetricMode === 'tx') return point.txBps;
        return point.rxBps + point.txBps;
      });
      return {
        id: iface,
        label: iface,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        values,
        lastValue: values[values.length - 1] ?? 0,
      };
    });
  }, [chartWindow, focusedRow, interfaceMetricMode, interfaceTimestamps, selectedInterfaces]);
  const interfacePanMax = Math.max(0, interfaceTimestamps.length - clamp(Number(zoomPoints || chartWindow), 20, Number(chartWindow)));

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">네트워크 뷰</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">전체 트래픽 추세, 상위 노드, 정밀 필터를 한 화면에서 확인합니다.</p>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">수집 중 노드</div>
          <div className="mt-1 text-[30px] font-bold text-[#191F28] dark:text-gray-50">{collectingCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">총 RX</div>
          <div className="mt-1 text-[30px] font-bold text-[#191F28] dark:text-gray-50 tabular-nums">{formatRate(totalRx)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">총 TX</div>
          <div className="mt-1 text-[30px] font-bold text-[#191F28] dark:text-gray-50 tabular-nums">{formatRate(totalTx)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">수집 없음</div>
          <div className="mt-1 text-[30px] font-bold text-[#F04452]">{unavailableCount}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow mb-6">
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6 mb-6">
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="노드 이름/IP 검색" className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none" />
          <input value={ifaceFilter} onChange={event => setIfaceFilter(event.target.value)} placeholder="인터페이스 필터" className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none" />
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as FilterMode)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none">
            <option value="all">전체 상태</option>
            <option value="collecting">수집 중</option>
            <option value="unavailable">수집 없음</option>
            <option value="offline">오프라인</option>
          </select>
          <input value={minRxKbps} onChange={event => setMinRxKbps(event.target.value)} placeholder="최소 RX KB/s" className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none" />
          <input value={minTxKbps} onChange={event => setMinTxKbps(event.target.value)} placeholder="최소 TX KB/s" className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none" />
          <select value={updatedWithinSec} onChange={event => setUpdatedWithinSec(event.target.value)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none">
            <option value="all">전체 수신 시각</option>
            <option value="30">30초 이내</option>
            <option value="60">1분 이내</option>
            <option value="120">2분 이내</option>
            <option value="300">5분 이내</option>
          </select>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-[#191F28] dark:text-gray-100">PI별 선 그래프</h2>
                <p className="text-[13px] text-[#6B7684] dark:text-gray-400">선택한 PI별로 개별 선을 그리고, 필요하면 전체 합계선을 겹쳐 봅니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={chartMetricMode} onChange={event => setChartMetricMode(event.target.value as ChartMetricMode)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-3 py-2 text-[13px] outline-none">
                  <option value="total">RX+TX</option>
                  <option value="rx">RX만</option>
                  <option value="tx">TX만</option>
                </select>
                <select value={chartWindow} onChange={event => setChartWindow(event.target.value as ChartWindow)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-3 py-2 text-[13px] outline-none">
                  <option value="60">최근 60포인트</option>
                  <option value="120">최근 120포인트</option>
                  <option value="240">최근 240포인트</option>
                </select>
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-3 py-2 text-[13px] text-[#191F28] dark:text-gray-100">
                  <input type="checkbox" checked={showAggregateOverlay} onChange={event => setShowAggregateOverlay(event.target.checked)} />
                  합계선 표시
                </label>
              </div>
            </div>
            <div className="mb-4 grid gap-3 lg:grid-cols-3">
              <label className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-3 text-[13px] text-[#4E5968] dark:text-gray-300">
                임계치 KB/s
                <input
                  value={thresholdKbps}
                  onChange={event => setThresholdKbps(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-3 py-2 text-[14px] outline-none"
                  placeholder="0"
                />
              </label>
              <label className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-3 text-[13px] text-[#4E5968] dark:text-gray-300">
                줌 범위 {clamp(Number(zoomPoints || chartWindow), 20, Number(chartWindow))} 포인트
                <input
                  type="range"
                  min="20"
                  max={chartZoomMax}
                  step="10"
                  value={clamp(Number(zoomPoints || chartWindow), 20, Number(chartWindow))}
                  onChange={event => setZoomPoints(event.target.value)}
                  className="mt-3 w-full"
                />
              </label>
              <label className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-3 text-[13px] text-[#4E5968] dark:text-gray-300">
                패닝 오프셋 {clamp(Number(panOffset || '0'), 0, chartPanMax)} 포인트
                <input
                  type="range"
                  min="0"
                  max={chartPanMax}
                  step="1"
                  value={clamp(Number(panOffset || '0'), 0, chartPanMax)}
                  onChange={event => setPanOffset(event.target.value)}
                  className="mt-3 w-full"
                />
              </label>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedPiIds(filteredRows.filter(row => row.latest).slice(0, 6).map(row => row.pi.id))}
                className="rounded-full bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                상위 6개
              </button>
              <button
                onClick={() => setSelectedPiIds(filteredRows.filter(row => row.latest).map(row => row.pi.id))}
                className="rounded-full bg-[#E5E8EB] px-3 py-1.5 text-[12px] font-semibold text-[#191F28] dark:bg-gray-700 dark:text-gray-100"
              >
                전체 선택
              </button>
              <button
                onClick={() => setSelectedPiIds([])}
                className="rounded-full bg-[#F2F4F6] px-3 py-1.5 text-[12px] font-semibold text-[#6B7684] dark:bg-gray-800 dark:text-gray-300"
              >
                전체 해제
              </button>
            </div>
            <div className="mb-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {filteredRows.filter(row => row.latest).map((row, index) => {
                const checked = selectedPiIds.includes(row.pi.id);
                return (
                  <label
                    key={row.pi.id}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                      checked
                        ? 'border-transparent bg-[#111827] text-white'
                        : 'border-[#E5E8EB] bg-white text-[#4E5968] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedPiIds(prev => checked ? prev.filter(id => id !== row.pi.id) : [...prev, row.pi.id])}
                      className="hidden"
                    />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />
                    {row.pi.name}
                  </label>
                );
              })}
            </div>
            <MultiNodeTrendChart timestamps={visibleChartTimestamps} series={chartSeries} aggregateSeries={aggregateOverlaySeries} threshold={chartThreshold} />
          </div>

          <div className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-5">
            <div className="mb-3">
              <h2 className="text-[16px] font-bold text-[#191F28] dark:text-gray-100">상위 노드</h2>
              <p className="text-[13px] text-[#6B7684] dark:text-gray-400">현재 총 트래픽 기준 상위 8개 노드입니다.</p>
            </div>
            <TopNodesChart rows={filteredRows} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow mb-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#191F28] dark:text-gray-100">인터페이스 Drill-down</h2>
            <p className="text-[13px] text-[#6B7684] dark:text-gray-400">선택한 PI 내부에서 인터페이스별 트래픽을 분리해서 봅니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={focusPiId} onChange={event => setFocusPiId(event.target.value)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-3 py-2 text-[13px] outline-none">
              {collectingRows.map(row => (
                <option key={row.pi.id} value={row.pi.id}>{row.pi.name}</option>
              ))}
            </select>
            <select value={interfaceMetricMode} onChange={event => setInterfaceMetricMode(event.target.value as InterfaceMetricMode)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-3 py-2 text-[13px] outline-none">
              <option value="total">RX+TX</option>
              <option value="rx">RX만</option>
              <option value="tx">TX만</option>
            </select>
          </div>
        </div>
        <div className="mb-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
          {availableInterfaces.map((iface, index) => {
            const checked = selectedInterfaces.includes(iface);
            return (
              <label
                key={iface}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                  checked
                    ? 'border-transparent bg-[#111827] text-white'
                    : 'border-[#E5E8EB] bg-white text-[#4E5968] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSelectedInterfaces(prev => checked ? prev.filter(item => item !== iface) : [...prev, iface])}
                  className="hidden"
                />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />
                {iface}
              </label>
            );
          })}
        </div>
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <label className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-3 text-[13px] text-[#4E5968] dark:text-gray-300">
            인터페이스 패닝 {clamp(Number(panOffset || '0'), 0, interfacePanMax)} 포인트
            <input
              type="range"
              min="0"
              max={interfacePanMax}
              step="1"
              value={clamp(Number(panOffset || '0'), 0, interfacePanMax)}
              onChange={event => setPanOffset(event.target.value)}
              className="mt-3 w-full"
            />
          </label>
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-gray-700 p-3 text-[13px] text-[#4E5968] dark:text-gray-300">
            현재 대상
            <div className="mt-2 text-[14px] font-semibold text-[#191F28] dark:text-gray-100">
              {focusedRow ? `${focusedRow.pi.name} (${focusedRow.pi.ip})` : '선택 가능한 PI 없음'}
            </div>
          </div>
        </div>
        <MultiNodeTrendChart timestamps={interfaceTimestamps} series={interfaceSeries} aggregateSeries={null} threshold={chartThreshold} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#191F28] dark:text-gray-100">노드별 상세</h2>
            <p className="text-[13px] text-[#6B7684] dark:text-gray-400">정렬 기준을 바꿔 병목 노드를 바로 찾을 수 있습니다.</p>
          </div>
          <select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] outline-none">
            <option value="traffic">총 트래픽 순</option>
            <option value="rx">RX 순</option>
            <option value="tx">TX 순</option>
            <option value="updated">최근 수신 순</option>
            <option value="name">이름 순</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E8EB] dark:border-gray-700 text-[12px] uppercase tracking-[0.08em] text-[#8B95A1] dark:text-gray-500">
                <th className="py-3 pr-4">노드</th>
                <th className="py-3 pr-4">상태</th>
                <th className="py-3 pr-4">인터페이스 수</th>
                <th className="py-3 pr-4">RX</th>
                <th className="py-3 pr-4">TX</th>
                <th className="py-3 pr-4">최근 수신</th>
                <th className="py-3 pr-4">바로가기</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const status = getStatus(row);
                return (
                  <tr key={row.pi.id} className="border-b border-[#F2F4F6] dark:border-gray-800 last:border-b-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-[#191F28] dark:text-gray-100">{row.pi.name}</div>
                      <div className="font-mono text-[13px] text-[#8B95A1] dark:text-gray-500">{row.pi.ip}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                        status === 'collecting'
                          ? 'bg-[#E7F4EF] text-[#0BC27C]'
                          : status === 'unavailable'
                            ? 'bg-[#FEF1F2] text-[#F04452]'
                            : 'bg-[#F2F4F6] text-[#6B7684]'
                      }`}>
                        {status === 'collecting' ? '수집 중' : status === 'unavailable' ? '수집 없음' : '오프라인'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-mono text-[#4E5968] dark:text-gray-300">{row.interfaceCount}</td>
                    <td className="py-4 pr-4 font-mono tabular-nums text-[#191F28] dark:text-gray-100">{formatRate(row.totalRxBps)}</td>
                    <td className="py-4 pr-4 font-mono tabular-nums text-[#191F28] dark:text-gray-100">{formatRate(row.totalTxBps)}</td>
                    <td className="py-4 pr-4 text-[13px] text-[#6B7684] dark:text-gray-400">{formatRelativeTime(row.updatedAt)}</td>
                    <td className="py-4 pr-4">
                      <Link href={`/pis/${row.pi.id}`} className="text-[13px] font-semibold text-[#3182F6] hover:text-[#1B64DA]">
                        상세 보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="py-10 text-center text-[14px] text-[#8B95A1] dark:text-gray-500">조건에 맞는 노드가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
