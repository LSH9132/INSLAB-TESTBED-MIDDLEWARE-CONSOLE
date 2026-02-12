'use client';
import type { PiNode } from '@inslab/shared';
import { PiStatusCard } from './PiStatusCard';

export function StatusGrid({ pis }: { pis: PiNode[] }) {
  if (pis.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center toss-shadow">
        <div className="w-16 h-16 bg-[#F2F4F6] rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#B0B8C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <p className="text-[#4E5968] text-[15px] font-medium">등록된 Pi 노드가 없습니다</p>
        <p className="text-[#8B95A1] text-[14px] mt-1">Pi 관리 페이지에서 노드를 등록해보세요</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {pis.map((pi) => (
        <PiStatusCard key={pi.id} pi={pi} />
      ))}
    </div>
  );
}
