'use client';

import type { NetAgentConfigResponse } from '@inslab/shared';

interface NetAgentConfigCardProps {
  config: NetAgentConfigResponse | null;
  error: string;
  loading: boolean;
  copyStatus: string;
  onLoad: () => void;
  onCopy: () => void;
}

export function NetAgentConfigCard({
  config,
  error,
  loading,
  copyStatus,
  onLoad,
  onCopy,
}: NetAgentConfigCardProps) {
  return (
    <div className="mt-6 max-w-4xl bg-white dark:bg-gray-800 border border-[#E5E8EB] dark:border-gray-700 rounded-2xl p-6 toss-shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-[#191F28] dark:text-gray-50">net-agent 설정</h3>
          <p className="mt-1 text-[13px] text-[#6B7684] dark:text-gray-400">
            `central-server` 인증을 거친 뒤 현재 `log-server` 호환 정보로 발급한 설정입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLoad}
            disabled={loading}
            className="px-4 py-2 bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-[#AFCBFA] text-white rounded-lg text-[14px] font-medium transition-colors"
          >
            {loading ? '발급 중...' : '설정 발급'}
          </button>
          {config && (
            <button
              onClick={onCopy}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#4E5968] dark:text-gray-200 rounded-lg text-[14px] font-medium transition-colors"
            >
              설정 복사
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {config && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 text-[13px] text-[#4E5968] dark:text-gray-300 sm:grid-cols-2">
            <div>Protocol: <span className="font-mono">{config.protocolVersion}</span></div>
            <div>TCP Port: <span className="font-mono">{config.logServerPort}</span></div>
            <div>Sample Interval: <span className="font-mono">{config.sampleIntervalSec}s</span></div>
            <div>Min Agent: <span className="font-mono">{config.minAgentVersion}</span></div>
            <div>Recommended: <span className="font-mono">{config.recommendedAgentVersion}</span></div>
          </div>
          <textarea
            readOnly
            value={config.envFileContent}
            rows={10}
            className="w-full rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-[13px] text-[#191F28] dark:text-gray-100 font-mono outline-none resize-y"
          />
          <div className="flex items-center justify-between text-[12px] text-[#8B95A1] dark:text-gray-500">
            <span>토큰 만료: {new Date(config.tokenExpiresAt).toLocaleString()}</span>
            {copyStatus && <span>{copyStatus}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
