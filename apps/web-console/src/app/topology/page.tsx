'use client';
import { SystemStatusGrid } from '@/components/system/SystemStatusGrid';

export default function TopologyPage() {
  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">토폴로지</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">
        네트워크 토폴로지 시각화는 ifconfig 기반 자동 수집 방식으로 재설계 중입니다
      </p>

      {/* 시스템 서비스 상태 */}
      <div className="mb-8">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-4">시스템 서비스 상태</h2>
        <SystemStatusGrid />
      </div>

      {/* 토폴로지 준비 중 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-16 text-center toss-shadow transition-colors duration-200">
        <div className="w-16 h-16 bg-[#F2F4F6] dark:bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#B0B8C1] dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="text-[#4E5968] dark:text-gray-400 text-[15px] font-medium">토폴로지 시각화 준비 중</p>
        <p className="text-[#8B95A1] dark:text-gray-500 text-[14px] mt-2">
          ifconfig 기반 자동 네트워크 수집 기능이 구현되면 여기에 표시됩니다
        </p>
      </div>
    </div>
  );
}
