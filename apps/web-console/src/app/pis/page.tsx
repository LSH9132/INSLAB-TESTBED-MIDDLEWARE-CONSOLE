'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { PiNode } from '@inslab/shared';

export default function PiManagementPage() {
  const [pis, setPis] = useState<PiNode[]>([]);
  const [form, setForm] = useState({ hostname: '', ipManagement: '', ipRing: '', sshUser: 'pi', sshPort: '22' });
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{ hostname?: string; ipManagement?: string; ipRing?: string; sshPort?: string }>({});

  const load = () => apiFetch<PiNode[]>('/api/pis').then(setPis).catch(console.error);
  useEffect(() => { load(); }, []);

  const validateForm = (): boolean => {
    const errors: { hostname?: string; ipManagement?: string; ipRing?: string; sshPort?: string } = {};

    // 필수 필드 검증
    if (!form.hostname.trim()) {
      errors.hostname = '호스트명을 입력해주세요';
    } else if (pis.some(pi => pi.hostname.toLowerCase() === form.hostname.toLowerCase())) {
      errors.hostname = '이미 등록된 호스트명입니다';
    }

    // Management IP 검증
    if (!form.ipManagement.trim()) {
      errors.ipManagement = 'Management IP를 입력해주세요';
    } else if (!isValidIP(form.ipManagement)) {
      errors.ipManagement = '올바른 IP 주소 형식이 아닙니다';
    } else if (pis.some(pi => pi.ipManagement === form.ipManagement)) {
      errors.ipManagement = '이미 등록된 Management IP입니다';
    }

    // Ring IP 검증
    if (!form.ipRing.trim()) {
      errors.ipRing = 'Ring IP를 입력해주세요';
    } else if (!isValidIP(form.ipRing)) {
      errors.ipRing = '올바른 IP 주소 형식이 아닙니다';
    } else if (pis.some(pi => pi.ipRing === form.ipRing)) {
      errors.ipRing = '이미 등록된 Ring IP입니다';
    }

    // SSH 포트 검증
    const port = Number(form.sshPort);
    if (!form.sshPort.trim()) {
      errors.sshPort = 'SSH 포트를 입력해주세요';
    } else if (isNaN(port) || port < 1 || port > 65535) {
      errors.sshPort = '올바른 포트 번호(1-65535)를 입력해주세요';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // IP 주소 형식 검증 함수
  const isValidIP = (ip: string): boolean => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };


  const handleAdd = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      await apiFetch('/api/pis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sshPort: Number(form.sshPort) }),
      });
      setForm({ hostname: '', ipManagement: '', ipRing: '', sshUser: 'pi', sshPort: '22' });
      setValidationErrors({});
      load();
    } catch (err: any) {
      setError(err.message || 'Pi 추가에 실패했습니다');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await apiFetch(`/api/pis/${id}`, { method: 'DELETE' });
    load();
  };

  const getStatusBadge = (status: string) => {
    const styles = status === 'online'
      ? 'bg-[#E7F4EF] text-[#0BC27C] border-[#0BC27C]'
      : status === 'offline'
        ? 'bg-[#FEF1F2] text-[#F04452] border-[#F04452]'
        : 'bg-[#F2F4F6] text-[#8B95A1] border-[#D1D6DB]';

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium border ${styles}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-[#0BC27C]' : status === 'offline' ? 'bg-[#F04452]' : 'bg-[#8B95A1]'}`} />
        {status === 'online' ? '온라인' : status === 'offline' ? '오프라인' : '알 수 없음'}
      </span>
    );
  };

  return (
    <div>
      {/* 토스 스타일 헤더 */}
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">Pi 관리</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">Raspberry Pi 노드를 등록하고 관리하세요</p>

      {/* 토스 스타일 등록 폼 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-6 toss-shadow transition-colors duration-200">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-6">새 Raspberry Pi 등록</h2>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Hostname */}
            <div>
              <label className="block text-[#191F28] dark:text-gray-200 text-[14px] font-semibold mb-2">
                호스트명 <span className="text-[#F04452]">*</span>
              </label>
              <input
                placeholder="예: raspberrypi-01"
                value={form.hostname}
                onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                className={`w-full bg-[#F9FAFB] dark:bg-gray-900 border ${validationErrors.hostname ? 'border-[#F04452]' : 'border-[#E5E8EB] dark:border-gray-700'} rounded-xl px-4 py-3 text-[15px] text-[#191F28] dark:text-gray-100 placeholder-[#B0B8C1] dark:placeholder-gray-500 focus:outline-none focus:border-[#3182F6] focus:bg-white dark:focus:bg-gray-800 transition-all`}
              />
              {validationErrors.hostname && (
                <p className="text-[13px] text-[#F04452] mt-2 font-medium">{validationErrors.hostname}</p>
              )}
            </div>

            {/* Management IP */}
            <div>
              <label className="block text-[#191F28] dark:text-gray-200 text-[14px] font-semibold mb-2">
                Management IP <span className="text-[#F04452]">*</span>
              </label>
              <input
                placeholder="예: 192.168.1.100"
                value={form.ipManagement}
                onChange={(e) => setForm({ ...form, ipManagement: e.target.value })}
                className={`w-full bg-[#F9FAFB] dark:bg-gray-900 border ${validationErrors.ipManagement ? 'border-[#F04452]' : 'border-[#E5E8EB] dark:border-gray-700'} rounded-xl px-4 py-3 text-[15px] text-[#191F28] dark:text-gray-100 placeholder-[#B0B8C1] dark:placeholder-gray-500 focus:outline-none focus:border-[#3182F6] focus:bg-white dark:focus:bg-gray-800 transition-all`}
              />
              {validationErrors.ipManagement && (
                <p className="text-[13px] text-[#F04452] mt-2 font-medium">{validationErrors.ipManagement}</p>
              )}
            </div>

            {/* Ring IP */}
            <div>
              <label className="block text-[#191F28] dark:text-gray-200 text-[14px] font-semibold mb-2">
                Ring IP <span className="text-[#F04452]">*</span>
              </label>
              <input
                placeholder="예: 10.0.0.100"
                value={form.ipRing}
                onChange={(e) => setForm({ ...form, ipRing: e.target.value })}
                className={`w-full bg-[#F9FAFB] dark:bg-gray-900 border ${validationErrors.ipRing ? 'border-[#F04452]' : 'border-[#E5E8EB] dark:border-gray-700'} rounded-xl px-4 py-3 text-[15px] text-[#191F28] dark:text-gray-100 placeholder-[#B0B8C1] dark:placeholder-gray-500 focus:outline-none focus:border-[#3182F6] focus:bg-white dark:focus:bg-gray-800 transition-all`}
              />
              {validationErrors.ipRing && (
                <p className="text-[13px] text-[#F04452] mt-2 font-medium">{validationErrors.ipRing}</p>
              )}
            </div>

            {/* SSH User */}
            <div>
              <label className="block text-[#191F28] dark:text-gray-200 text-[14px] font-semibold mb-2">SSH 사용자</label>
              <input
                placeholder="pi"
                value={form.sshUser}
                onChange={(e) => setForm({ ...form, sshUser: e.target.value })}
                className="w-full bg-[#F9FAFB] dark:bg-gray-900 border border-[#E5E8EB] dark:border-gray-700 rounded-xl px-4 py-3 text-[15px] text-[#191F28] dark:text-gray-100 placeholder-[#B0B8C1] dark:placeholder-gray-500 focus:outline-none focus:border-[#3182F6] focus:bg-white dark:focus:bg-gray-800 transition-all"
              />
            </div>

            {/* SSH Port */}
            <div>
              <label className="block text-[#191F28] dark:text-gray-200 text-[14px] font-semibold mb-2">SSH 포트</label>
              <input
                placeholder="22"
                value={form.sshPort}
                onChange={(e) => setForm({ ...form, sshPort: e.target.value })}
                className={`w-full bg-[#F9FAFB] dark:bg-gray-900 border ${validationErrors.sshPort ? 'border-[#F04452]' : 'border-[#E5E8EB] dark:border-gray-700'} rounded-xl px-4 py-3 text-[15px] text-[#191F28] dark:text-gray-100 placeholder-[#B0B8C1] dark:placeholder-gray-500 focus:outline-none focus:border-[#3182F6] focus:bg-white dark:focus:bg-gray-800 transition-all`}
              />
              {validationErrors.sshPort && (
                <p className="text-[13px] text-[#F04452] mt-2 font-medium">{validationErrors.sshPort}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-[#FEF1F2] dark:bg-red-900/20 border border-[#F04452] darker:border-red-800 rounded-xl">
              <p className="text-[14px] text-[#F04452] dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={Object.keys(validationErrors).length > 0}
            className="w-full md:w-auto bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-[#E5E8EB] dark:disabled:bg-gray-700 disabled:text-[#B0B8C1] dark:disabled:text-gray-500 text-white px-8 py-4 rounded-xl text-[15px] font-bold transition-colors"
          >
            Raspberry Pi 추가하기
          </button>
        </div>
      </div>

      {/* 토스 스타일 Pi 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden toss-shadow transition-colors duration-200">
        {pis.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-[#F2F4F6] dark:bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#B0B8C1] dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <p className="text-[#4E5968] dark:text-gray-400 text-[15px] font-medium">등록된 Raspberry Pi가 없습니다</p>
            <p className="text-[#8B95A1] dark:text-gray-500 text-[14px] mt-1">위 폼에서 새로운 Pi를 등록해보세요</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F9FAFB] dark:bg-gray-900 border-b border-[#E5E8EB] dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">호스트명</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">Management IP</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">Ring IP</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">상태</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">링 위치</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pis.map((pi, index) => (
                  <tr key={pi.id} className={`border-b border-[#F2F4F6] dark:border-gray-700 hover:bg-[#F9FAFB] dark:hover:bg-gray-700/50 transition-colors ${index === pis.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-6 py-4 text-[14px] font-semibold text-[#191F28] dark:text-gray-100">{pi.hostname}</td>
                    <td className="px-6 py-4 text-[14px] text-[#4E5968] dark:text-gray-400">{pi.ipManagement}</td>
                    <td className="px-6 py-4 text-[14px] text-[#4E5968] dark:text-gray-400">{pi.ipRing}</td>
                    <td className="px-6 py-4">{getStatusBadge(pi.status)}</td>
                    <td className="px-6 py-4 text-[14px] text-[#4E5968] dark:text-gray-400">
                      {pi.ringPosition !== null ? `#${pi.ringPosition}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => window.open(`/terminal/${pi.id}`, '_blank')}
                        className="text-[#3182F6] hover:bg-[#F2F4F6] dark:hover:bg-gray-700 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors mr-2"
                      >
                        터미널
                      </button>
                      <button
                        onClick={() => handleDelete(pi.id)}
                        className="text-[#F04452] hover:bg-[#FEF1F2] dark:hover:bg-red-900/20 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
