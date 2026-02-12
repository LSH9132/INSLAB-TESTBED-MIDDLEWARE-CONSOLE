'use client';
import type { ServiceStatus } from '@inslab/shared';

interface SystemStatusCardProps {
  name: string;
  service: ServiceStatus;
  icon: React.ReactNode;
}

export function SystemStatusCard({ name, service, icon }: SystemStatusCardProps) {
  const getStatusColor = () => {
    switch (service.status) {
      case 'online': return 'bg-[#E7F4EF] text-[#0BC27C] border-[#0BC27C] dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'offline': return 'bg-[#FEF1F2] text-[#F04452] border-[#F04452] dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'degraded': return 'bg-[#FFF4E5] text-[#FFB800] border-[#FFB800] dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      default: return 'bg-[#F2F4F6] text-[#8B95A1] border-[#D1D6DB] dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  // ... (getStatusDot and getStatusText are fine unchanged usually, but I need to include them to match context or just skip)
  // I will just replace `getStatusColor` first. Wait, I should do the whole block to be safe or valid chunks.

  // Actually, I'll targeting the return statement + getStatusColor to update styles.

  // Let's replace the whole component content from getStatusColor down to return.

  const getStatusDot = () => {
    switch (service.status) {
      case 'online': return 'bg-[#0BC27C]';
      case 'offline': return 'bg-[#F04452]';
      case 'degraded': return 'bg-[#FFB800]';
      default: return 'bg-[#8B95A1]';
    }
  };

  const getStatusText = () => {
    switch (service.status) {
      case 'online': return '정상';
      case 'offline': return '오프라인';
      case 'degraded': return '불안정';
      default: return '알 수 없음';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 toss-shadow transition-colors duration-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#F2F4F6] dark:bg-gray-700 rounded-xl flex items-center justify-center text-[#4E5968] dark:text-gray-300">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-[#191F28] dark:text-gray-50">{name}</h3>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusColor()} mt-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot()}`} />
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-[13px]">
        {service.uptime !== undefined && (
          <div className="flex justify-between">
            <span className="text-[#8B95A1] dark:text-gray-500">가동시간</span>
            <span className="text-[#4E5968] dark:text-gray-400 font-medium">{formatUptime(service.uptime)}</span>
          </div>
        )}
        {service.message && (
          <div className="flex justify-between">
            <span className="text-[#8B95A1] dark:text-gray-500">상태</span>
            <span className="text-[#4E5968] dark:text-gray-400 font-medium">{service.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
