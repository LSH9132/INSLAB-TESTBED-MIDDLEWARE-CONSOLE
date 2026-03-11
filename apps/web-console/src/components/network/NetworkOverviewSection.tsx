'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { NetworkStatSnapshot, PiNode } from '@inslab/shared';
import { apiFetch } from '@/lib/api';

type FilterMode = 'all' | 'collecting' | 'unavailable' | 'offline';
type SortMode = 'traffic' | 'rx' | 'tx' | 'name';

interface NodeNetworkRow {
  pi: PiNode;
  snapshot: NetworkStatSnapshot | null;
  error: string | null;
  totalRxBps: number;
  totalTxBps: number;
  interfaceCount: number;
  lastReceivedAt: number | null;
}

function formatRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`;
}

function formatRelativeTime(timestampSec: number | null) {
  if (!timestampSec) return '수집 없음';
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - timestampSec);
  if (diffSec < 5) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  return `${Math.floor(diffSec / 3600)}시간 전`;
}

function getRowStatus(row: NodeNetworkRow): FilterMode {
  if (row.pi.status !== 'online') return 'offline';
  if (row.snapshot && !row.error) return 'collecting';
  return 'unavailable';
}

export function NetworkOverviewSection({ pis }: { pis: PiNode[] }) {
  const [rows, setRows] = useState<NodeNetworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ifaceFilter, setIfaceFilter] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('traffic');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const deferredIfaceFilter = useDeferredValue(ifaceFilter.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextRows = await Promise.all(
          pis.map(async pi => {
            if (pi.status !== 'online') {
              return {
                pi,
                snapshot: null,
                error: null,
                totalRxBps: 0,
                totalTxBps: 0,
                interfaceCount: 0,
                lastReceivedAt: null,
              } satisfies NodeNetworkRow;
            }

            try {
              const snapshot = await apiFetch<NetworkStatSnapshot>(`/api/net-stats/${pi.id}`);
              const totalRxBps = snapshot.interfaces.reduce((sum, iface) => sum + iface.rxBps, 0);
              const totalTxBps = snapshot.interfaces.reduce((sum, iface) => sum + iface.txBps, 0);
              return {
                pi,
                snapshot,
                error: null,
                totalRxBps,
                totalTxBps,
                interfaceCount: snapshot.interfaces.length,
                lastReceivedAt: snapshot.receivedAt ?? snapshot.timestamp,
              } satisfies NodeNetworkRow;
            } catch (error) {
              return {
                pi,
                snapshot: null,
                error: String(error),
                totalRxBps: 0,
                totalTxBps: 0,
                interfaceCount: 0,
                lastReceivedAt: null,
              } satisfies NodeNetworkRow;
            }
          }),
        );

        if (!cancelled) {
          setRows(nextRows);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
      }
    };

    load();
    const timer = window.setInterval(load, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pis]);

  const filteredRows = useMemo(() => {
    const next = rows.filter(row => {
      const status = getRowStatus(row);
      if (filterMode !== 'all' && status !== filterMode) return false;

      if (deferredSearch) {
        const haystack = `${row.pi.name} ${row.pi.ip}`.toLowerCase();
        if (!haystack.includes(deferredSearch)) return false;
      }

      if (deferredIfaceFilter) {
        const interfaces = row.snapshot?.interfaces ?? [];
        if (!interfaces.some(iface => iface.iface.toLowerCase().includes(deferredIfaceFilter))) {
          return false;
        }
      }

      return true;
    });

    next.sort((left, right) => {
      if (sortMode === 'name') {
        return left.pi.name.localeCompare(right.pi.name);
      }
      if (sortMode === 'rx') {
        return right.totalRxBps - left.totalRxBps;
      }
      if (sortMode === 'tx') {
        return right.totalTxBps - left.totalTxBps;
      }
      return (right.totalRxBps + right.totalTxBps) - (left.totalRxBps + left.totalTxBps);
    });

    return next;
  }, [deferredIfaceFilter, deferredSearch, filterMode, rows, sortMode]);

  const summary = useMemo(() => {
    const collecting = rows.filter(row => getRowStatus(row) === 'collecting');
    const totalRxBps = collecting.reduce((sum, row) => sum + row.totalRxBps, 0);
    const totalTxBps = collecting.reduce((sum, row) => sum + row.totalTxBps, 0);
    const topRx = [...collecting].sort((a, b) => b.totalRxBps - a.totalRxBps)[0] ?? null;
    const topTx = [...collecting].sort((a, b) => b.totalTxBps - a.totalTxBps)[0] ?? null;
    return {
      collectingCount: collecting.length,
      unavailableCount: rows.filter(row => getRowStatus(row) === 'unavailable').length,
      totalRxBps,
      totalTxBps,
      topRx,
      topTx,
    };
  }, [rows]);

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100">네트워크 부하 종합 뷰</h2>
        <p className="mt-1 text-[14px] text-[#6B7684] dark:text-gray-400">
          전체 PI의 실시간 RX/TX를 한 번에 비교하고, 상태와 인터페이스 기준으로 바로 걸러볼 수 있습니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">수집 중 노드</div>
          <div className="mt-1 text-[28px] font-bold text-[#191F28] dark:text-gray-50">{summary.collectingCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">총 RX</div>
          <div className="mt-1 text-[28px] font-bold text-[#191F28] dark:text-gray-50 tabular-nums">{formatRate(summary.totalRxBps)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">총 TX</div>
          <div className="mt-1 text-[28px] font-bold text-[#191F28] dark:text-gray-50 tabular-nums">{formatRate(summary.totalTxBps)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow">
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400">수집 없음</div>
          <div className="mt-1 text-[28px] font-bold text-[#F04452] tabular-nums">{summary.unavailableCount}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr] mb-4">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="노드 이름 또는 IP 검색"
            className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] text-[#191F28] dark:text-gray-100 outline-none"
          />
          <input
            value={ifaceFilter}
            onChange={event => setIfaceFilter(event.target.value)}
            placeholder="인터페이스 필터"
            className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] text-[#191F28] dark:text-gray-100 outline-none"
          />
          <select
            value={filterMode}
            onChange={event => setFilterMode(event.target.value as FilterMode)}
            className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] text-[#191F28] dark:text-gray-100 outline-none"
          >
            <option value="all">전체 상태</option>
            <option value="collecting">수집 중</option>
            <option value="unavailable">수집 없음</option>
            <option value="offline">오프라인</option>
          </select>
          <select
            value={sortMode}
            onChange={event => setSortMode(event.target.value as SortMode)}
            className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-900 px-4 py-3 text-[14px] text-[#191F28] dark:text-gray-100 outline-none"
          >
            <option value="traffic">총 트래픽 순</option>
            <option value="rx">RX 순</option>
            <option value="tx">TX 순</option>
            <option value="name">이름 순</option>
          </select>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-[13px] text-[#6B7684] dark:text-gray-400">
          <span>Top RX: <span className="font-semibold text-[#191F28] dark:text-gray-100">{summary.topRx ? `${summary.topRx.pi.name} (${formatRate(summary.topRx.totalRxBps)})` : '없음'}</span></span>
          <span>Top TX: <span className="font-semibold text-[#191F28] dark:text-gray-100">{summary.topTx ? `${summary.topTx.pi.name} (${formatRate(summary.topTx.totalTxBps)})` : '없음'}</span></span>
          <span>표시 노드: <span className="font-semibold text-[#191F28] dark:text-gray-100">{filteredRows.length}</span></span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E8EB] dark:border-gray-700 text-[12px] uppercase tracking-[0.08em] text-[#8B95A1] dark:text-gray-500">
                <th className="py-3 pr-4">노드</th>
                <th className="py-3 pr-4">상태</th>
                <th className="py-3 pr-4">인터페이스</th>
                <th className="py-3 pr-4">RX</th>
                <th className="py-3 pr-4">TX</th>
                <th className="py-3 pr-4">최근 수신</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const status = getRowStatus(row);
                return (
                  <tr key={row.pi.id} className="border-b border-[#F2F4F6] dark:border-gray-800 last:border-b-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-[#191F28] dark:text-gray-100">{row.pi.name}</div>
                      <div className="text-[13px] text-[#8B95A1] dark:text-gray-500 font-mono">{row.pi.ip}</div>
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
                    <td className="py-4 pr-4 text-[13px] text-[#4E5968] dark:text-gray-300">
                      {row.snapshot?.interfaces.map(iface => iface.iface).join(', ') || '-'}
                    </td>
                    <td className="py-4 pr-4 font-mono tabular-nums text-[#191F28] dark:text-gray-100">{formatRate(row.totalRxBps)}</td>
                    <td className="py-4 pr-4 font-mono tabular-nums text-[#191F28] dark:text-gray-100">{formatRate(row.totalTxBps)}</td>
                    <td className="py-4 pr-4 text-[13px] text-[#6B7684] dark:text-gray-400">{formatRelativeTime(row.lastReceivedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="py-8 text-center text-[14px] text-[#8B95A1] dark:text-gray-500">
            조건에 맞는 네트워크 부하 데이터가 없습니다.
          </div>
        )}

        {loading && (
          <div className="py-8 text-center text-[14px] text-[#8B95A1] dark:text-gray-500">
            네트워크 종합 데이터를 불러오는 중입니다.
          </div>
        )}
      </div>
    </section>
  );
}
