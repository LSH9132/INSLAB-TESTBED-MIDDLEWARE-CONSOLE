'use client';

import type { NetAgentRemoteAction, NetAgentRemoteStatus } from '@inslab/shared';

interface NetAgentManageCardProps {
  sampleIntervalSec: number;
  actionLoading: NetAgentRemoteAction | null;
  isSavingSettings: boolean;
  status: NetAgentRemoteStatus | null;
  error: string;
  message: string;
  onSampleIntervalChange: (next: number) => void;
  onSaveSettings: () => void;
  onRefreshStatus: () => void;
  onRunAction: (action: NetAgentRemoteAction) => void;
}

export function NetAgentManageCard({
  sampleIntervalSec,
  actionLoading,
  isSavingSettings,
  status,
  error,
  message,
  onSampleIntervalChange,
  onSaveSettings,
  onRefreshStatus,
  onRunAction,
}: NetAgentManageCardProps) {
  return (
    <div className="mt-6 max-w-4xl bg-white dark:bg-gray-800 border border-[#E5E8EB] dark:border-gray-700 rounded-2xl p-6 toss-shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-[#191F28] dark:text-gray-50">net-agent 원격 관리</h3>
          <p className="mt-1 text-[13px] text-[#6B7684] dark:text-gray-400">
            `central-server`가 SSH로 바이너리 업로드, 환경 파일 적용, 서비스 재시작과 제거를 수행합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[12px] text-[#6B7684] dark:text-gray-400">
            <span>수집 주기 (초)</span>
            <input
              type="number"
              min={1}
              max={3600}
              value={sampleIntervalSec}
              onChange={(e) => onSampleIntervalChange(Number(e.target.value))}
              className="w-28 rounded-lg border border-[#E5E8EB] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-[14px] text-[#191F28] dark:text-gray-100 font-mono outline-none"
            />
          </label>
          <button
            onClick={onSaveSettings}
            disabled={isSavingSettings || actionLoading !== null}
            className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] disabled:bg-gray-400 text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {isSavingSettings ? '저장 중...' : '주기 저장'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefreshStatus}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#4E5968] dark:text-gray-200 rounded-lg text-[14px] font-medium transition-colors"
          >
            상태 새로고침
          </button>
          <button
            onClick={() => onRunAction('install')}
            disabled={actionLoading !== null}
            className="px-4 py-2 bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-[#AFCBFA] text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {actionLoading === 'install' ? '설치 중...' : '설치'}
          </button>
          <button
            onClick={() => onRunAction('configure')}
            disabled={actionLoading !== null}
            className="px-4 py-2 bg-[#0BC27C] hover:bg-[#09a86b] disabled:bg-[#86ddbc] text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {actionLoading === 'configure' ? '적용 중...' : '구성 적용'}
          </button>
          <button
            onClick={() => onRunAction('restart')}
            disabled={actionLoading !== null}
            className="px-4 py-2 bg-[#F5A623] hover:bg-[#d48c17] disabled:bg-[#f7c976] text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {actionLoading === 'restart' ? '재시작 중...' : '재시작'}
          </button>
          <button
            onClick={() => onRunAction('sync-time')}
            disabled={actionLoading !== null}
            className="px-4 py-2 bg-[#6B7280] hover:bg-[#4B5563] disabled:bg-[#C4C9D1] text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {actionLoading === 'sync-time' ? '동기화 중...' : '시간 동기화'}
          </button>
          <button
            onClick={() => onRunAction('uninstall')}
            disabled={actionLoading !== null}
            className="px-4 py-2 bg-[#F04452] hover:bg-[#d73745] disabled:bg-[#f4a5ac] text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {actionLoading === 'uninstall' ? '제거 중...' : '제거'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-[13px] text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {message}
        </div>
      )}

      {status && (
        <div className="mt-4 grid gap-2 text-[13px] text-[#4E5968] dark:text-gray-300 sm:grid-cols-2">
          <div>설치됨: <span className="font-semibold">{status.installed ? 'yes' : 'no'}</span></div>
          <div>서비스 상태: <span className="font-mono">{status.serviceState}</span></div>
          <div>환경 파일: <span className="font-mono break-all">{status.envPath}</span></div>
          <div>설치 경로: <span className="font-mono break-all">{status.installDir}</span></div>
          <div>환경 설정 적용: <span className="font-semibold">{status.envConfigured ? 'yes' : 'no'}</span></div>
          <div>버전: <span className="font-mono">{status.version || 'unknown'}</span></div>
          <div>원격 UTC 시간: <span className="font-mono">{status.clock.utcTime || 'unknown'}</span></div>
          <div>시간대: <span className="font-mono">{status.clock.timezone || 'unknown'}</span></div>
          <div>NTP 동기화: <span className="font-semibold">{status.clock.ntpSynchronized ? 'yes' : 'no'}</span></div>
        </div>
      )}
    </div>
  );
}
