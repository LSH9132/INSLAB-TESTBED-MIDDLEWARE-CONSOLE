'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { RingGraph } from '@/components/topology/RingGraph';
import { SystemStatusGrid } from '@/components/system/SystemStatusGrid';
import type { RingTopology } from '@inslab/shared';

export default function TopologyPage() {
  const [topology, setTopology] = useState<RingTopology | null>(null);

  useEffect(() => {
    apiFetch<RingTopology>('/api/topology').then(setTopology).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">링 토폴로지</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">Raspberry Pi 링 네트워크 구조를 확인하세요</p>

      {/* 시스템 서비스 상태 */}
      <div className="mb-8">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">시스템 서비스 상태</h2>
        <SystemStatusGrid />
      </div>

      {/* 토폴로지 그래프 */}
      <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">링 구조</h2>
      {topology ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow transition-colors duration-200">
          <RingGraph topology={topology} />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-16 text-center toss-shadow transition-colors duration-200">
          <p className="text-[#4E5968] dark:text-gray-400 text-[15px]">토폴로지를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
