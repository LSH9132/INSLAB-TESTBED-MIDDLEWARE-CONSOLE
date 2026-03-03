'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { PiNode } from '@inslab/shared';

export default function PiDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [pi, setPi] = useState<PiNode | null>(null);

  useEffect(() => {
    apiFetch<PiNode>(`/api/pis/${id}`).then(setPi).catch(console.error);
  }, [id]);

  if (!pi) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#191F28] dark:text-gray-50">{pi.name}</h2>
      <div className="bg-white dark:bg-gray-800 border border-[#E5E8EB] dark:border-gray-700 rounded-2xl p-6 space-y-3 max-w-md toss-shadow">
        <div className="flex gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24">ID</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px] font-mono text-xs break-all">{pi.id}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24">이름</span>
          <span className="text-[#191F28] dark:text-gray-100 text-[14px] font-semibold">{pi.name}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24">IP 주소</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px] font-mono">{pi.ip}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24">SSH</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px] font-mono">{pi.sshUser}@{pi.ip}:{pi.sshPort}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24">인증 방식</span>
          <span className={`text-[14px] font-semibold ${pi.authMethod === 'key' ? 'text-[#3182F6]' : 'text-[#F5A623]'}`}>
            {pi.authMethod === 'key' ? '🔑 SSH 키' : '🔒 비밀번호'}
          </span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24">상태</span>
          <span className={`text-[14px] font-semibold ${pi.status === 'online' ? 'text-[#0BC27C]' : pi.status === 'offline' ? 'text-[#F04452]' : 'text-[#8B95A1]'
            }`}>
            {pi.status === 'online' ? '● 온라인' : pi.status === 'offline' ? '● 오프라인' : '● 알 수 없음'}
          </span>
        </div>
      </div>

      <Link
        href={`/terminal/${pi.id}`}
        className="inline-block mt-6 bg-[#3182F6] hover:bg-[#1B64DA] text-white px-6 py-3 rounded-xl text-[14px] font-bold transition-colors"
      >
        터미널 열기
      </Link>
    </div>
  );
}
