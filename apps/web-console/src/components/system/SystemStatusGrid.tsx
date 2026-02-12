'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { SystemStatus } from '@inslab/shared';
import { SystemStatusCard } from './SystemStatusCard';

export function SystemStatusGrid() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    try {
      const data = await apiFetch<SystemStatus>('/api/system/status');
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load system status:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // 5초마다 자동 갱신
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center toss-shadow transition-colors duration-200">
        <p className="text-[#8B95A1] dark:text-gray-400 text-[14px]">시스템 상태를 확인하는 중...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center toss-shadow transition-colors duration-200">
        <p className="text-[#F04452] text-[14px]">시스템 상태를 가져올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SystemStatusCard
        name="Central Server"
        service={status.centralServer}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        }
      />
      <SystemStatusCard
        name="Log Server"
        service={status.logServer}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <SystemStatusCard
        name="Database"
        service={status.database}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        }
      />
    </div>
  );
}
