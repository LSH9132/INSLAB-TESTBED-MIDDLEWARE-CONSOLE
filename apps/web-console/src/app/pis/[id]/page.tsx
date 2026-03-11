'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type {
  NetAgentConfigResponse,
  NetAgentRemoteAction,
  NetAgentRemoteOperationResult,
  NetAgentRemoteStatus,
  PiNode,
  PiAuthMethod,
} from '@inslab/shared';
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
  const [netAgentConfig, setNetAgentConfig] = useState<NetAgentConfigResponse | null>(null);
  const [netAgentError, setNetAgentError] = useState('');
  const [isNetAgentLoading, setIsNetAgentLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [netAgentStatus, setNetAgentStatus] = useState<NetAgentRemoteStatus | null>(null);
  const [netAgentManageError, setNetAgentManageError] = useState('');
  const [netAgentManageMessage, setNetAgentManageMessage] = useState('');
  const [netAgentActionLoading, setNetAgentActionLoading] = useState<NetAgentRemoteAction | null>(null);
  const [netAgentSampleIntervalSec, setNetAgentSampleIntervalSec] = useState(5);
  const [isSavingNetAgentSettings, setIsSavingNetAgentSettings] = useState(false);

  useEffect(() => {
    fetchPiDetails();
  }, [id]);

  useEffect(() => {
    if (!isEditing) {
      void loadNetAgentStatus();
    }
  }, [id, isEditing]);

  const fetchPiDetails = () => {
    apiFetch<PiNode>(`/api/pis/${id}`)
      .then((data) => {
        setPi(data);
        resetEditForm(data);
        setNetAgentSampleIntervalSec(data.netAgentSampleIntervalSec ?? 5);
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

  const handleLoadNetAgentConfig = async () => {
    setIsNetAgentLoading(true);
    setNetAgentError('');
    setCopyStatus('');

    try {
      const data = await apiFetch<NetAgentConfigResponse>(`/api/pis/${id}/net-agent-config`);
      setNetAgentConfig(data);
    } catch (err: any) {
      setNetAgentError(err.message || 'net-agent 설정을 가져오지 못했습니다.');
    } finally {
      setIsNetAgentLoading(false);
    }
  };

  const loadNetAgentStatus = async () => {
    try {
      const status = await apiFetch<NetAgentRemoteStatus>(`/api/pis/${id}/net-agent/status`);
      setNetAgentStatus(status);
      setNetAgentManageError('');
    } catch (err: any) {
      setNetAgentStatus(null);
      setNetAgentManageError(err.message || 'net-agent 상태를 확인하지 못했습니다.');
    }
  };

  const runNetAgentAction = async (action: NetAgentRemoteAction) => {
    setNetAgentActionLoading(action);
    setNetAgentManageError('');
    setNetAgentManageMessage('');

    try {
      const path =
        action === 'uninstall'
          ? `/api/pis/${id}/net-agent`
          : `/api/pis/${id}/net-agent/${action}`;
      const method = action === 'uninstall' ? 'DELETE' : 'POST';
      const result = await apiFetch<NetAgentRemoteOperationResult>(path, { method });
      setNetAgentStatus(result.status);
      setNetAgentManageMessage(result.message);

      if (action === 'install' || action === 'configure') {
        await handleLoadNetAgentConfig();
      }
    } catch (err: any) {
      setNetAgentManageError(err.message || `net-agent ${action} 작업에 실패했습니다.`);
    } finally {
      setNetAgentActionLoading(null);
    }
  };

  const handleSaveNetAgentSettings = async () => {
    setIsSavingNetAgentSettings(true);
    setNetAgentManageError('');
    setNetAgentManageMessage('');

    try {
      const updatedPi = await apiFetch<PiNode>(`/api/pis/${id}/net-agent/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sampleIntervalSec: netAgentSampleIntervalSec }),
      });

      setPi(updatedPi);
      setNetAgentSampleIntervalSec(updatedPi.netAgentSampleIntervalSec ?? netAgentSampleIntervalSec);
      await handleLoadNetAgentConfig();

      if (netAgentStatus?.installed) {
        const result = await apiFetch<NetAgentRemoteOperationResult>(`/api/pis/${id}/net-agent/configure`, { method: 'POST' });
        setNetAgentStatus(result.status);
        setNetAgentManageMessage(`수집 주기를 ${updatedPi.netAgentSampleIntervalSec}초로 저장하고 원격 구성까지 적용했습니다.`);
      } else {
        setNetAgentManageMessage(`수집 주기를 ${updatedPi.netAgentSampleIntervalSec}초로 저장했습니다. 설치 후 또는 구성 적용 시 반영됩니다.`);
      }
    } catch (err: any) {
      setNetAgentManageError(err.message || 'net-agent 설정 저장에 실패했습니다.');
    } finally {
      setIsSavingNetAgentSettings(false);
    }
  };

  const handleCopyNetAgentConfig = async () => {
    if (!netAgentConfig) {
      return;
    }

    try {
      await navigator.clipboard.writeText(netAgentConfig.envFileContent);
      setCopyStatus('복사됨');
    } catch {
      setCopyStatus('복사 실패');
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
                  onClick={handleLoadNetAgentConfig}
                  disabled={isNetAgentLoading}
                  className="px-4 py-2 bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-[#AFCBFA] text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {isNetAgentLoading ? '발급 중...' : '설정 발급'}
                </button>
                {netAgentConfig && (
                  <button
                    onClick={handleCopyNetAgentConfig}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#4E5968] dark:text-gray-200 rounded-lg text-[14px] font-medium transition-colors"
                  >
                    설정 복사
                  </button>
                )}
              </div>
            </div>

            {netAgentError && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {netAgentError}
              </div>
            )}

            {netAgentConfig && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 text-[13px] text-[#4E5968] dark:text-gray-300 sm:grid-cols-2">
                  <div>Protocol: <span className="font-mono">{netAgentConfig.protocolVersion}</span></div>
                  <div>TCP Port: <span className="font-mono">{netAgentConfig.logServerPort}</span></div>
                  <div>Sample Interval: <span className="font-mono">{netAgentConfig.sampleIntervalSec}s</span></div>
                  <div>Min Agent: <span className="font-mono">{netAgentConfig.minAgentVersion}</span></div>
                  <div>Recommended: <span className="font-mono">{netAgentConfig.recommendedAgentVersion}</span></div>
                </div>
                <textarea
                  readOnly
                  value={netAgentConfig.envFileContent}
                  rows={10}
                  className="w-full rounded-xl border border-[#E5E8EB] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-[13px] text-[#191F28] dark:text-gray-100 font-mono outline-none resize-y"
                />
                <div className="flex items-center justify-between text-[12px] text-[#8B95A1] dark:text-gray-500">
                  <span>토큰 만료: {new Date(netAgentConfig.tokenExpiresAt).toLocaleString()}</span>
                  {copyStatus && <span>{copyStatus}</span>}
                </div>
              </div>
            )}
          </div>

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
                    value={netAgentSampleIntervalSec}
                    onChange={(e) => setNetAgentSampleIntervalSec(Number(e.target.value))}
                    className="w-28 rounded-lg border border-[#E5E8EB] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-[14px] text-[#191F28] dark:text-gray-100 font-mono outline-none"
                  />
                </label>
                <button
                  onClick={handleSaveNetAgentSettings}
                  disabled={isSavingNetAgentSettings || netAgentActionLoading !== null}
                  className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] disabled:bg-gray-400 text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {isSavingNetAgentSettings ? '저장 중...' : '주기 저장'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => loadNetAgentStatus()}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#4E5968] dark:text-gray-200 rounded-lg text-[14px] font-medium transition-colors"
                >
                  상태 새로고침
                </button>
                <button
                  onClick={() => runNetAgentAction('install')}
                  disabled={netAgentActionLoading !== null}
                  className="px-4 py-2 bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-[#AFCBFA] text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {netAgentActionLoading === 'install' ? '설치 중...' : '설치'}
                </button>
                <button
                  onClick={() => runNetAgentAction('configure')}
                  disabled={netAgentActionLoading !== null}
                  className="px-4 py-2 bg-[#0BC27C] hover:bg-[#09a86b] disabled:bg-[#86ddbc] text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {netAgentActionLoading === 'configure' ? '적용 중...' : '구성 적용'}
                </button>
                <button
                  onClick={() => runNetAgentAction('restart')}
                  disabled={netAgentActionLoading !== null}
                  className="px-4 py-2 bg-[#F5A623] hover:bg-[#d48c17] disabled:bg-[#f7c976] text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {netAgentActionLoading === 'restart' ? '재시작 중...' : '재시작'}
                </button>
                <button
                  onClick={() => runNetAgentAction('sync-time')}
                  disabled={netAgentActionLoading !== null}
                  className="px-4 py-2 bg-[#6B7280] hover:bg-[#4B5563] disabled:bg-[#C4C9D1] text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {netAgentActionLoading === 'sync-time' ? '동기화 중...' : '시간 동기화'}
                </button>
                <button
                  onClick={() => runNetAgentAction('uninstall')}
                  disabled={netAgentActionLoading !== null}
                  className="px-4 py-2 bg-[#F04452] hover:bg-[#d73745] disabled:bg-[#f4a5ac] text-white rounded-lg text-[14px] font-medium transition-colors"
                >
                  {netAgentActionLoading === 'uninstall' ? '제거 중...' : '제거'}
                </button>
              </div>
            </div>

            {netAgentManageError && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {netAgentManageError}
              </div>
            )}

            {netAgentManageMessage && (
              <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-[13px] text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {netAgentManageMessage}
              </div>
            )}

            {netAgentStatus && (
              <div className="mt-4 grid gap-2 text-[13px] text-[#4E5968] dark:text-gray-300 sm:grid-cols-2">
                <div>설치됨: <span className="font-semibold">{netAgentStatus.installed ? 'yes' : 'no'}</span></div>
                <div>서비스 상태: <span className="font-mono">{netAgentStatus.serviceState}</span></div>
                <div>수집 주기: <span className="font-mono">{pi.netAgentSampleIntervalSec}s</span></div>
                <div>환경 파일: <span className="font-mono break-all">{netAgentStatus.envPath}</span></div>
                <div>설치 경로: <span className="font-mono break-all">{netAgentStatus.installDir}</span></div>
                <div>환경 설정 적용: <span className="font-semibold">{netAgentStatus.envConfigured ? 'yes' : 'no'}</span></div>
                <div>버전: <span className="font-mono">{netAgentStatus.version || 'unknown'}</span></div>
                <div>원격 UTC 시간: <span className="font-mono">{netAgentStatus.clock.utcTime || 'unknown'}</span></div>
                <div>시간대: <span className="font-mono">{netAgentStatus.clock.timezone || 'unknown'}</span></div>
                <div>NTP 동기화: <span className="font-semibold">{netAgentStatus.clock.ntpSynchronized ? 'yes' : 'no'}</span></div>
              </div>
            )}
          </div>

          <Link
            href={`/terminal/${pi.id}`}
            className="inline-block mt-6 bg-[#3182F6] hover:bg-[#1B64DA] text-white px-6 py-3 rounded-xl text-[14px] font-bold transition-colors"
          >
            터미널 열기
          </Link>
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
