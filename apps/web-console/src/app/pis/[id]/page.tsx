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
import { NetAgentConfigCard } from '@/components/pi/NetAgentConfigCard';
import { NetAgentManageCard } from '@/components/pi/NetAgentManageCard';
import { PiDetailsCard } from '@/components/pi/PiDetailsCard';

interface PiUpdatePayload {
  name: string;
  ip: string;
  sshUser: string;
  sshPort: number;
  authMethod: PiAuthMethod;
  sshPassword?: string;
  sshPrivateKey?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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
      const payload: PiUpdatePayload = {
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
    } catch (err: unknown) {
      setErrorDetails(getErrorMessage(err, '저장 중 오류가 발생했습니다.'));
    }
  };

  const handleLoadNetAgentConfig = async () => {
    setIsNetAgentLoading(true);
    setNetAgentError('');
    setCopyStatus('');

    try {
      const data = await apiFetch<NetAgentConfigResponse>(`/api/pis/${id}/net-agent-config`);
      setNetAgentConfig(data);
    } catch (err: unknown) {
      setNetAgentError(getErrorMessage(err, 'net-agent 설정을 가져오지 못했습니다.'));
    } finally {
      setIsNetAgentLoading(false);
    }
  };

  const loadNetAgentStatus = async () => {
    try {
      const status = await apiFetch<NetAgentRemoteStatus>(`/api/pis/${id}/net-agent/status`);
      setNetAgentStatus(status);
      setNetAgentManageError('');
    } catch (err: unknown) {
      setNetAgentStatus(null);
      setNetAgentManageError(getErrorMessage(err, 'net-agent 상태를 확인하지 못했습니다.'));
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
    } catch (err: unknown) {
      setNetAgentManageError(getErrorMessage(err, `net-agent ${action} 작업에 실패했습니다.`));
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
    } catch (err: unknown) {
      setNetAgentManageError(getErrorMessage(err, 'net-agent 설정 저장에 실패했습니다.'));
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

      <PiDetailsCard
        pi={pi}
        isEditing={isEditing}
        editName={editName}
        editIp={editIp}
        editSshUser={editSshUser}
        editSshPort={editSshPort}
        editAuthMethod={editAuthMethod}
        editSshPassword={editSshPassword}
        editSshPrivateKey={editSshPrivateKey}
        errorDetails={errorDetails}
        onEditNameChange={setEditName}
        onEditIpChange={setEditIp}
        onEditSshUserChange={setEditSshUser}
        onEditSshPortChange={setEditSshPort}
        onEditAuthMethodChange={setEditAuthMethod}
        onEditSshPasswordChange={setEditSshPassword}
        onEditSshPrivateKeyChange={setEditSshPrivateKey}
        onCancel={handleCancelClick}
        onSave={handleSaveClick}
      />

      {!isEditing && (
        <>
          <NetAgentConfigCard
            config={netAgentConfig}
            error={netAgentError}
            loading={isNetAgentLoading}
            copyStatus={copyStatus}
            onLoad={handleLoadNetAgentConfig}
            onCopy={handleCopyNetAgentConfig}
          />

          <NetAgentManageCard
            sampleIntervalSec={netAgentSampleIntervalSec}
            actionLoading={netAgentActionLoading}
            isSavingSettings={isSavingNetAgentSettings}
            status={netAgentStatus}
            error={netAgentManageError}
            message={netAgentManageMessage}
            onSampleIntervalChange={setNetAgentSampleIntervalSec}
            onSaveSettings={handleSaveNetAgentSettings}
            onRefreshStatus={loadNetAgentStatus}
            onRunAction={runNetAgentAction}
          />

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
