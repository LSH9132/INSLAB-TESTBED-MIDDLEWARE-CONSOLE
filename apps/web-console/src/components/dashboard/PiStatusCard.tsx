'use client';
import Link from 'next/link';
import type { PiNode } from '@inslab/shared';

export function PiStatusCard({ pi }: { pi: PiNode }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-[#0BC27C]';
      case 'offline': return 'bg-[#F04452]';
      default: return 'bg-[#8B95A1]';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = status === 'online'
      ? 'bg-[#E7F4EF] text-[#0BC27C] border-[#0BC27C] dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
      : status === 'offline'
        ? 'bg-[#FEF1F2] text-[#F04452] border-[#F04452] dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
        : 'bg-[#F2F4F6] text-[#8B95A1] border-[#D1D6DB] dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium border ${styles}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`} />
        {status === 'online' ? '온라인' : status === 'offline' ? '오프라인' : '알 수 없음'}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow hover:toss-shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-[#191F28] dark:text-gray-50 text-[16px] mb-1">{pi.hostname}</h3>
          {getStatusBadge(pi.status)}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[13px] font-medium w-20">Management</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px]">{pi.ipManagement}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[13px] font-medium w-20">Ring</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px]">{pi.ipRing}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[13px] font-medium w-20">링 위치</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px]">#{pi.ringPosition ?? '-'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/terminal/${pi.id}`}
          className="flex-1 bg-[#3182F6] hover:bg-[#1B64DA] text-white text-center px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
        >
          터미널
        </Link>
        <Link
          href={`/pis/${pi.id}`}
          className="flex-1 bg-[#F2F4F6] hover:bg-[#E5E8EB] dark:bg-gray-700 dark:hover:bg-gray-600 text-[#4E5968] dark:text-gray-200 text-center px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
        >
          상세정보
        </Link>
      </div>
    </div>
  );
}
