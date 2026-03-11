'use client';
import { StatusGrid } from '@/components/dashboard/StatusGrid';
import { NetworkOverviewSection } from '@/components/network/NetworkOverviewSection';
import { NetworkSettingsCard } from '@/components/system/NetworkSettingsCard';
import { SystemStatusGrid } from '@/components/system/SystemStatusGrid';
import { usePiStatus } from '@/hooks/usePiStatus';

export default function DashboardPage() {
  const pis = usePiStatus();

  const online = pis.filter((p) => p.status === 'online').length;
  const offline = pis.filter((p) => p.status === 'offline').length;
  const total = pis.length;

  return (
    <div>
      {/* 토스 스타일 헤더 */}
      {/* 토스 스타일 헤더 */}
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">대시보드</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">Raspberry Pi 테스트베드 현황을 확인하세요</p>

      {/* 시스템 서비스 상태 */}
      <div className="mb-10">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">시스템 서비스 상태</h2>
        <SystemStatusGrid />
      </div>

      <div className="mb-10">
        <NetworkSettingsCard />
      </div>

      {/* 토스 스타일 통계 카드 */}
      <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">Pi 노드 현황</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow transition-colors duration-200">
          <div className="text-[#6B7684] dark:text-gray-400 text-[14px] font-medium mb-1">전체 노드</div>
          <div className="text-[#191F28] dark:text-gray-50 text-[32px] font-bold">{total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow transition-colors duration-200">
          <div className="text-[#6B7684] dark:text-gray-400 text-[14px] font-medium mb-1">온라인</div>
          <div className="text-[#0BC27C] text-[32px] font-bold">{online}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow transition-colors duration-200">
          <div className="text-[#6B7684] dark:text-gray-400 text-[14px] font-medium mb-1">오프라인</div>
          <div className="text-[#F04452] text-[32px] font-bold">{offline}</div>
        </div>
      </div>

      {/* Pi 노드 그리드 */}
      <StatusGrid pis={pis} />

      <NetworkOverviewSection pis={pis} />
    </div>
  );
}
