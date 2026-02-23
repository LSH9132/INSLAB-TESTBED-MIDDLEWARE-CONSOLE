'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { PiNode, PiAuthMethod } from '@inslab/shared';

const inputClass = (hasError: boolean) =>
  `w-full bg-[#F9FAFB] dark:bg-gray-900 border ${hasError ? 'border-[#F04452]' : 'border-[#E5E8EB] dark:border-gray-700'
  } rounded-xl px-4 py-3 text-[15px] text-[#191F28] dark:text-gray-100 placeholder-[#B0B8C1] dark:placeholder-gray-500 focus:outline-none focus:border-[#3182F6] focus:bg-white dark:focus:bg-gray-800 transition-all`;

const labelClass = 'block text-[#191F28] dark:text-gray-200 text-[14px] font-semibold mb-2';
const errorClass = 'text-[13px] text-[#F04452] mt-2 font-medium';

interface FormState {
  name: string;
  ip: string;
  sshUser: string;
  sshPort: string;
  authMethod: PiAuthMethod;
  sshPassword: string;
}

const defaultForm: FormState = {
  name: '',
  ip: '',
  sshUser: 'pi',
  sshPort: '22',
  authMethod: 'key',
  sshPassword: '',
};

type ValidationErrors = Partial<Record<keyof FormState, string>>;

export default function PiManagementPage() {
  const [pis, setPis] = useState<PiNode[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const load = () => apiFetch<PiNode[]>('/api/pis').then(setPis).catch(console.error);
  useEffect(() => { load(); }, []);

  const isValidIP = (ip: string): boolean => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    return ip.split('.').every(p => { const n = parseInt(p, 10); return n >= 0 && n <= 255; });
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!form.name.trim()) {
      errors.name = '이름을 입력해주세요';
    } else if (pis.some(pi => pi.name.toLowerCase() === form.name.toLowerCase())) {
      errors.name = '이미 등록된 이름입니다';
    }

    if (!form.ip.trim()) {
      errors.ip = 'IP 주소를 입력해주세요';
    } else if (!isValidIP(form.ip)) {
      errors.ip = '올바른 IP 주소 형식이 아닙니다';
    } else if (pis.some(pi => pi.ip === form.ip)) {
      errors.ip = '이미 등록된 IP 주소입니다';
    }

    const port = Number(form.sshPort);
    if (!form.sshPort.trim()) {
      errors.sshPort = 'SSH 포트를 입력해주세요';
    } else if (isNaN(port) || port < 1 || port > 65535) {
      errors.sshPort = '올바른 포트 번호(1-65535)를 입력해주세요';
    }

    if (form.authMethod === 'password' && !form.sshPassword.trim()) {
      errors.sshPassword = '비밀번호를 입력해주세요';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    setError('');
    if (!validateForm()) return;

    try {
      await apiFetch('/api/pis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          ip: form.ip,
          sshUser: form.sshUser,
          sshPort: Number(form.sshPort),
          authMethod: form.authMethod,
          sshPassword: form.authMethod === 'password' ? form.sshPassword : undefined,
        }),
      });
      setForm(defaultForm);
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
    const dotColor = status === 'online' ? 'bg-[#0BC27C]' : status === 'offline' ? 'bg-[#F04452]' : 'bg-[#8B95A1]';
    const label = status === 'online' ? '온라인' : status === 'offline' ? '오프라인' : '알 수 없음';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium border ${styles}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {label}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">Pi 관리</h1>
      <p className="text-[#6B7684] dark:text-gray-400 text-[15px] mb-8">Raspberry Pi 노드를 등록하고 관리하세요</p>

      {/* 등록 폼 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-6 toss-shadow transition-colors duration-200">
        <h2 className="text-[20px] font-bold text-[#191F28] dark:text-gray-100 mb-6">새 Raspberry Pi 등록</h2>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 이름 */}
            <div>
              <label className={labelClass}>이름 <span className="text-[#F04452]">*</span></label>
              <input
                placeholder="예: pi-lab-01"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass(!!validationErrors.name)}
              />
              {validationErrors.name && <p className={errorClass}>{validationErrors.name}</p>}
            </div>

            {/* IP 주소 */}
            <div>
              <label className={labelClass}>IP 주소 <span className="text-[#F04452]">*</span></label>
              <input
                placeholder="예: 192.168.1.100"
                value={form.ip}
                onChange={(e) => setForm({ ...form, ip: e.target.value })}
                className={inputClass(!!validationErrors.ip)}
              />
              {validationErrors.ip && <p className={errorClass}>{validationErrors.ip}</p>}
            </div>

            {/* SSH 사용자 */}
            <div>
              <label className={labelClass}>SSH 사용자</label>
              <input
                placeholder="pi"
                value={form.sshUser}
                onChange={(e) => setForm({ ...form, sshUser: e.target.value })}
                className={inputClass(false)}
              />
            </div>

            {/* SSH 포트 */}
            <div>
              <label className={labelClass}>SSH 포트</label>
              <input
                placeholder="22"
                value={form.sshPort}
                onChange={(e) => setForm({ ...form, sshPort: e.target.value })}
                className={inputClass(!!validationErrors.sshPort)}
              />
              {validationErrors.sshPort && <p className={errorClass}>{validationErrors.sshPort}</p>}
            </div>

            {/* 인증 방식 */}
            <div>
              <label className={labelClass}>인증 방식 <span className="text-[#F04452]">*</span></label>
              <select
                value={form.authMethod}
                onChange={(e) => setForm({ ...form, authMethod: e.target.value as PiAuthMethod, sshPassword: '' })}
                className={inputClass(false)}
              >
                <option value="key">SSH 키 (권장)</option>
                <option value="password">비밀번호</option>
              </select>
            </div>

            {/* 비밀번호 (password 인증 시만 표시) */}
            {form.authMethod === 'password' && (
              <div>
                <label className={labelClass}>비밀번호 <span className="text-[#F04452]">*</span></label>
                <input
                  type="password"
                  placeholder="SSH 비밀번호"
                  value={form.sshPassword}
                  onChange={(e) => setForm({ ...form, sshPassword: e.target.value })}
                  className={inputClass(!!validationErrors.sshPassword)}
                />
                {validationErrors.sshPassword && <p className={errorClass}>{validationErrors.sshPassword}</p>}
              </div>
            )}
          </div>

          {/* SSH 키 안내 */}
          {form.authMethod === 'key' && (
            <div className="p-4 bg-[#F0F6FF] dark:bg-blue-900/20 border border-[#3182F6]/30 rounded-xl">
              <p className="text-[13px] text-[#3182F6] dark:text-blue-400 font-medium">
                🔑 SSH 키 인증을 사용합니다. central-server의 SSH 공개 키가 Pi의 <code className="bg-[#3182F6]/10 px-1 rounded">~/.ssh/authorized_keys</code>에 등록되어 있어야 합니다.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-[#FEF1F2] dark:bg-red-900/20 border border-[#F04452] rounded-xl">
              <p className="text-[14px] text-[#F04452] dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleAdd}
            className="w-full md:w-auto bg-[#3182F6] hover:bg-[#1B64DA] text-white px-8 py-4 rounded-xl text-[15px] font-bold transition-colors"
          >
            Raspberry Pi 추가하기
          </button>
        </div>
      </div>

      {/* Pi 목록 */}
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
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">이름</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">IP 주소</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">SSH</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">인증</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">상태</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-[#4E5968] dark:text-gray-400">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pis.map((pi, index) => (
                  <tr
                    key={pi.id}
                    className={`border-b border-[#F2F4F6] dark:border-gray-700 hover:bg-[#F9FAFB] dark:hover:bg-gray-700/50 transition-colors ${index === pis.length - 1 ? 'border-0' : ''}`}
                  >
                    <td className="px-6 py-4 text-[14px] font-semibold text-[#191F28] dark:text-gray-100">{pi.name}</td>
                    <td className="px-6 py-4 text-[14px] text-[#4E5968] dark:text-gray-400 font-mono">{pi.ip}</td>
                    <td className="px-6 py-4 text-[14px] text-[#4E5968] dark:text-gray-400 font-mono">
                      {pi.sshUser}@{pi.ip}:{pi.sshPort}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold border ${pi.authMethod === 'key'
                          ? 'bg-[#F0F6FF] text-[#3182F6] border-[#3182F6]/30 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-[#FFF7E6] text-[#F5A623] border-[#F5A623]/30 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                        {pi.authMethod === 'key' ? '🔑 키' : '🔒 비밀번호'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(pi.status)}</td>
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
