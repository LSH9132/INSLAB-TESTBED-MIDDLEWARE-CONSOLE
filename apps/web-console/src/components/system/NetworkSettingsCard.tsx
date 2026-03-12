'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface NetworkCollectionSettings {
  pollIntervalSec: number;
  freshnessSec: number;
}

export function NetworkSettingsCard() {
  const [settings, setSettings] = useState<NetworkCollectionSettings | null>(null);
  const [pollIntervalSec, setPollIntervalSec] = useState(5);
  const [freshnessSec, setFreshnessSec] = useState(30);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<NetworkCollectionSettings>('/api/system/net-settings')
      .then((data) => {
        setSettings(data);
        setPollIntervalSec(data.pollIntervalSec);
        setFreshnessSec(data.freshnessSec);
      })
      .catch((err: Error) => {
        setError(err.message || '설정을 불러오지 못했습니다.');
      });
  }, []);

  const save = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const next = await apiFetch<NetworkCollectionSettings>('/api/system/net-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollIntervalSec, freshnessSec }),
      });
      setSettings(next);
      setPollIntervalSec(next.pollIntervalSec);
      setFreshnessSec(next.freshnessSec);
      setMessage('네트워크 불러오기 설정을 저장했습니다.');
    } catch (err: any) {
      setError(err.message || '설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 toss-shadow transition-colors duration-200">
      <div className="mb-4">
        <h3 className="text-[18px] font-bold text-[#191F28] dark:text-gray-50">네트워크 불러오기 설정</h3>
        <p className="mt-1 text-[13px] text-[#6B7684] dark:text-gray-400">
          `central-server`가 `log-server`에서 최신값을 가져오는 속도와 stale 판정 시간을 조정합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] text-[#6B7684] dark:text-gray-400">
          <span>불러오기 주기 (초)</span>
          <input
            type="number"
            min={1}
            max={300}
            value={pollIntervalSec}
            onChange={(e) => setPollIntervalSec(Number(e.target.value))}
            className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-[14px] text-[#191F28] dark:text-gray-100 font-mono outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-[13px] text-[#6B7684] dark:text-gray-400">
          <span>최신값 유지 시간 (초)</span>
          <input
            type="number"
            min={5}
            max={3600}
            value={freshnessSec}
            onChange={(e) => setFreshnessSec(Number(e.target.value))}
            className="rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-[14px] text-[#191F28] dark:text-gray-100 font-mono outline-none"
          />
        </label>
      </div>

      {settings && (
        <div className="mt-4 text-[12px] text-[#8B95A1] dark:text-gray-500">
          현재 적용값: {settings.pollIntervalSec}s poll / {settings.freshnessSec}s freshness
        </div>
      )}

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

      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] disabled:bg-gray-400 text-white rounded-lg text-[14px] font-medium transition-colors"
        >
          {loading ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
