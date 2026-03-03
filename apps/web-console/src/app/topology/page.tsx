'use client';
import { useTopology } from '@/hooks/useTopology';
import { TopologyGraph } from '@/components/topology/RingGraph';
import { SystemStatusGrid } from '@/components/system/SystemStatusGrid';

export default function TopologyPage() {
  const { graph, loading, scanning, triggerScan } = useTopology();

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">토폴로지</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">
        14노드 · 27링크 메쉬 네트워크 — 노드를 클릭하거나 드래그해보세요
      </p>

      {/* 시스템 서비스 상태 */}
      <div className="mb-8">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">시스템 서비스 상태</h2>
        <SystemStatusGrid />
      </div>

      {/* 토폴로지 그래프 */}
      <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">네트워크 토폴로지</h2>
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-2xl">
          <div className="flex items-center gap-3 text-[#6B7684] dark:text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            토폴로지 로딩 중...
          </div>
        </div>
      ) : (
        <TopologyGraph graph={graph} scanning={scanning} onScan={triggerScan} />
      )}
    </div>
  );
}
