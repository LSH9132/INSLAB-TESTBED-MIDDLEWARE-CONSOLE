'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { PiNode, PiAuthMethod } from '@inslab/shared';
import { NetworkInterfacePanel } from '@/components/network/NetworkInterfacePanel';

export default function PiDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [pi, setPi] = useState<PiNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIp, setEditIp] = useState('');
  const [editSshUser, setEditSshUser] = useState('');
  const [editSshPort, setEditSshPort] = useState<number>(22);
  const [editAuthMethod, setEditAuthMethod] = useState<PiAuthMethod>('key');
  const [editSshPassword, setEditSshPassword] = useState('');
  const [editSshPrivateKey, setEditSshPrivateKey] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    fetchPiDetails();
  }, [id]);

  const fetchPiDetails = () => {
    apiFetch<PiNode>(`/api/pis/${id}`)
      .then((data) => {
        setPi(data);
        resetEditForm(data);
      })
      .catch(console.error);
  };

  const resetEditForm = (data: PiNode) => {
    setEditName(data.name);
    setEditIp(data.ip);
    setEditSshUser(data.sshUser);
    setEditSshPort(data.sshPort);
    setEditAuthMethod(data.authMethod);
    setEditSshPassword('');
    setEditSshPrivateKey(''); // 보안상 기존 개인키는 폼에 채우지 않음
    setErrorDetails('');
  };

  const handleEditClick = () => {
    if (pi) resetEditForm(pi);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    if (pi) resetEditForm(pi);
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    setErrorDetails('');
    try {
      const payload: any = {
        name: editName,
        ip: editIp,
        sshUser: editSshUser,
        sshPort: editSshPort,
        authMethod: editAuthMethod,
      };

      if (editAuthMethod === 'password' && editSshPassword) {
        payload.sshPassword = editSshPassword;
      }

      // 개인키를 입력한 경우에만 업데이트
      if (editAuthMethod === 'key' && editSshPrivateKey.trim()) {
        payload.sshPrivateKey = editSshPrivateKey;
      }

      await apiFetch(`/api/pis/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      setIsEditing(false);
      fetchPiDetails();
      router.refresh();
    } catch (err: any) {
      setErrorDetails(err.message || '저장 중 오류가 발생했습니다.');
    }
  };

  if (!pi) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#191F28] dark:text-gray-50">
          {isEditing ? '기기 정보 수정' : pi.name}
        </h2>
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="text-[14px] font-semibold text-[#3182F6] hover:bg-[#E8F3FF] dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            수정
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-[#E5E8EB] dark:border-gray-700 rounded-2xl p-6 space-y-4 max-w-md toss-shadow">
        {errorDetails && (
          <div className="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm mb-4">
            {errorDetails}
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">ID</span>
          <span className="text-[#4E5968] dark:text-gray-400 text-[14px] font-mono text-xs break-all">{pi.id}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">이름</span>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[14px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors"
            />
          ) : (
            <span className="text-[#191F28] dark:text-gray-100 text-[14px] font-semibold">{pi.name}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">IP 주소</span>
          {isEditing ? (
            <input
              type="text"
              value={editIp}
              onChange={(e) => setEditIp(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[14px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors"
            />
          ) : (
            <span className="text-[#4E5968] dark:text-gray-400 text-[14px] font-mono">{pi.ip}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">SSH</span>
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editSshUser}
                onChange={(e) => setEditSshUser(e.target.value)}
                className="w-1/2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[14px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors"
                placeholder="User"
              />
              <span className="text-[#8B95A1]">@</span>
              <input
                type="number"
                value={editSshPort}
                onChange={(e) => setEditSshPort(Number(e.target.value))}
                className="w-1/3 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[14px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors"
                placeholder="Port"
              />
            </div>
          ) : (
            <span className="text-[#4E5968] dark:text-gray-400 text-[14px] font-mono">{pi.sshUser}@{pi.ip}:{pi.sshPort}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">인증 방식</span>
          {isEditing ? (
            <select
              value={editAuthMethod}
              onChange={(e) => setEditAuthMethod(e.target.value as PiAuthMethod)}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[14px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors"
            >
              <option value="key">🔑 SSH 키</option>
              <option value="password">🔒 비밀번호</option>
            </select>
          ) : (
            <div className="flex flex-col gap-1">
              <span className={`text-[14px] font-semibold ${pi.authMethod === 'key' ? 'text-[#3182F6]' : 'text-[#F5A623]'}`}>
                {pi.authMethod === 'key' ? '🔑 SSH 키' : '🔒 비밀번호'}
              </span>
              {pi.authMethod === 'key' && (
                pi.sshPrivateKey
                  ? <span className="text-[12px] text-[#0BC27C]">✓ 개인키 등록됨</span>
                  : <span className="text-[12px] text-[#F04452]">⚠ 개인키 없음</span>
              )}
            </div>
          )}
        </div>

        {isEditing && editAuthMethod === 'password' && (
          <div className="flex items-center gap-3">
            <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">비밀번호</span>
            <input
              type="password"
              value={editSshPassword}
              onChange={(e) => setEditSshPassword(e.target.value)}
              placeholder="변경할 때만 입력"
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[14px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {isEditing && editAuthMethod === 'key' && (
          <div className="flex flex-col gap-2">
            <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium">SSH 개인키</span>
            <textarea
              rows={5}
              value={editSshPrivateKey}
              onChange={(e) => setEditSshPrivateKey(e.target.value)}
              placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n(비워두면 기존 키 유지)"}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-[#E5E8EB] dark:border-gray-600 rounded-lg text-[13px] text-[#191F28] dark:text-gray-100 outline-none focus:border-[#3182F6] dark:focus:border-blue-500 transition-colors font-mono resize-y"
              spellCheck={false}
            />
            <p className="text-[11px] text-[#8B95A1] dark:text-gray-500">비워두면 기존 개인키가 유지됩니다.</p>
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-3">
            <span className="text-[#8B95A1] dark:text-gray-500 text-[14px] font-medium w-24 flex-shrink-0">상태</span>
            <span className={`text-[14px] font-semibold ${pi.status === 'online' ? 'text-[#0BC27C]' : pi.status === 'offline' ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
              {pi.status === 'online' ? '● 온라인' : pi.status === 'offline' ? '● 오프라인' : '● 알 수 없음'}
            </span>
          </div>
        )}
        
        {isEditing && (
          <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E8EB] dark:border-gray-700">
            <button
              onClick={handleCancelClick}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#4E5968] dark:text-gray-300 rounded-lg text-[14px] font-medium transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSaveClick}
              className="px-4 py-2 bg-[#3182F6] hover:bg-[#1B64DA] text-white rounded-lg text-[14px] font-medium transition-colors"
            >
              저장
            </button>
          </div>
        )}
      </div>

      {!isEditing && (
        <>
          <Link
            href={`/terminal/${pi.id}`}
            className="inline-block mt-6 bg-[#3182F6] hover:bg-[#1B64DA] text-white px-6 py-3 rounded-xl text-[14px] font-bold transition-colors"
          >
            터미널 열기
          </Link>
          <div className="mt-6 max-w-4xl">
            <NetworkInterfacePanel piId={pi.id} />
          </div>
        </>
      )}

      {/* 네트워크 인터페이스 패널 — 온라인 PI에만 표시 */}
      {!isEditing && pi.status === 'online' && (
        <div className="mt-8">
          <h3 className="text-[16px] font-bold text-[#191F28] dark:text-gray-50 mb-3">네트워크 부하</h3>
          <NetworkInterfacePanel piId={pi.id} />
        </div>
      )}
    </div>
  );
}
