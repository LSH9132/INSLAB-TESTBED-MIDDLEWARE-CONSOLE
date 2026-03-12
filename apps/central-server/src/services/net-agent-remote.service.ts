import { Client } from 'ssh2';
import type { ConnectConfig } from 'ssh2';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type {
  NetAgentRemoteOperationResult,
  NetAgentRemoteStatus,
  NetAgentServiceState,
  PiNode,
} from '@inslab/shared';
import { config } from '../config.js';
import { buildNetAgentConfig } from './net-agent-config.service.js';

const REMOTE_SERVICE_NAME = 'net-agent';
const REMOTE_INSTALL_DIR = '/opt/net-agent';
const REMOTE_ENV_DIR = '/etc/net-agent';
const REMOTE_STATE_DIR = '/var/lib/net-agent';
const REMOTE_SYSTEMD_DIR = '/etc/systemd/system';
const REMOTE_TMP_PREFIX = '/tmp/inslab-net-agent';

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface RemoteClockInfo {
  utcTime: string | null;
  timezone: string | null;
  ntpSynchronized: boolean;
}

type PiNetAgentAction = 'install' | 'configure' | 'restart' | 'sync-time' | 'uninstall';
type PiNetAgentRemoteStatus = NetAgentRemoteStatus & { clock: RemoteClockInfo };

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function resolveAssetPath(fileName: string): string {
  const candidates = [
    path.join(config.netAgentAssetsDir, fileName),
    path.resolve(process.cwd(), 'clients/net-agent', fileName),
  ];

  const matched = candidates.find(candidate => existsSync(candidate));
  if (!matched) {
    throw new Error(`net-agent asset not found: ${fileName}`);
  }

  return matched;
}

function buildConnectOptions(pi: PiNode) {
  const connectOptions: ConnectConfig = {
    host: pi.ip,
    port: pi.sshPort,
    username: pi.sshUser,
    readyTimeout: 10000,
  };

  if (pi.authMethod === 'password' && pi.sshPassword) {
    connectOptions.password = pi.sshPassword;
    return connectOptions;
  }

  if (pi.sshPrivateKey) {
    connectOptions.privateKey = pi.sshPrivateKey;
    return connectOptions;
  }

  const keyPath = config.sshPrivateKeyPath.replace('~', process.env.HOME || '');
  connectOptions.privateKey = readFileSync(keyPath);
  return connectOptions;
}

function connectToPi(pi: PiNode): Promise<Client> {
  return new Promise((resolve, reject) => {
    const ssh = new Client();
    ssh.on('ready', () => resolve(ssh));
    ssh.on('error', reject);
    ssh.connect(buildConnectOptions(pi));
  });
}

function execRemote(ssh: Client, command: string, sudoPassword?: string | null): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const finalCommand = sudoPassword
      ? `sudo -S -p '' sh -lc ${shellQuote(command)}`
      : `sudo -n sh -lc ${shellQuote(command)}`;

    ssh.exec(finalCommand, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }

      let stdout = '';
      let stderr = '';
      stream.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      stream.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      stream.on('close', (code: number | undefined) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error((stderr || stdout || `remote command failed with exit code ${code}`).trim()));
      });

      if (sudoPassword) {
        stream.write(`${sudoPassword}\n`);
      }
    });
  });
}

function uploadFile(ssh: Client, localPath: string, remotePath: string) {
  return new Promise<void>((resolve, reject) => {
    ssh.sftp((err, sftp) => {
      if (err) {
        reject(err);
        return;
      }

      sftp.fastPut(localPath, remotePath, (putErr) => {
        sftp.end();
        if (putErr) {
          reject(putErr);
          return;
        }
        resolve();
      });
    });
  });
}

async function queryStatus(ssh: Client, sudoPassword?: string | null): Promise<PiNetAgentRemoteStatus> {
  const command = [
    `if [ -f ${shellQuote(`${REMOTE_INSTALL_DIR}/net-agent`)} ]; then installed=yes; else installed=no; fi`,
    `if [ -f ${shellQuote(`${REMOTE_ENV_DIR}/net-agent.env`)} ]; then env_configured=yes; else env_configured=no; fi`,
    `if systemctl list-unit-files ${REMOTE_SERVICE_NAME}.service >/dev/null 2>&1; then state="$(systemctl is-active ${REMOTE_SERVICE_NAME} 2>/dev/null || true)"; else state="not-installed"; fi`,
    `if [ "$env_configured" = "yes" ]; then version="$(awk -F= '/^AGENT_VERSION=/{print $2}' ${shellQuote(`${REMOTE_ENV_DIR}/net-agent.env`)} 2>/dev/null | tail -n 1)"; else version=""; fi`,
    `clock_utc="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || true)"`,
    `clock_tz="$(timedatectl show -p Timezone --value 2>/dev/null || true)"`,
    `clock_sync="$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)"`,
    `printf 'installed=%s\nenv_configured=%s\nstate=%s\nversion=%s\nclock_utc=%s\nclock_tz=%s\nclock_sync=%s\n' "$installed" "$env_configured" "$state" "$version" "$clock_utc" "$clock_tz" "$clock_sync"`,
  ].join('; ');

  const result = await execRemote(ssh, command, sudoPassword);
  const values = new Map(
    result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const idx = line.indexOf('=');
        return idx === -1 ? [line, ''] : [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );

  const state = (values.get('state') || 'unknown') as NetAgentServiceState;
  return {
    installed: values.get('installed') === 'yes',
    envConfigured: values.get('env_configured') === 'yes',
    serviceState: state,
    version: values.get('version') || null,
    unitFilePath: `${REMOTE_SYSTEMD_DIR}/${REMOTE_SERVICE_NAME}.service`,
    installDir: REMOTE_INSTALL_DIR,
    envPath: `${REMOTE_ENV_DIR}/net-agent.env`,
    clock: {
      utcTime: values.get('clock_utc') || null,
      timezone: values.get('clock_tz') || null,
      ntpSynchronized: values.get('clock_sync') === 'yes',
    },
  };
}

async function syncRemoteClock(ssh: Client, sudoPassword?: string | null) {
  const nowUtc = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const command = [
    'timedatectl set-timezone UTC || true',
    'timedatectl set-ntp true || true',
    'if systemctl list-unit-files systemd-timesyncd.service >/dev/null 2>&1; then systemctl enable --now systemd-timesyncd.service || true; systemctl restart systemd-timesyncd.service || true; fi',
    'if systemctl list-unit-files chronyd.service >/dev/null 2>&1; then systemctl enable --now chronyd.service || true; systemctl restart chronyd.service || true; fi',
    'if systemctl list-unit-files ntp.service >/dev/null 2>&1; then systemctl enable --now ntp.service || true; systemctl restart ntp.service || true; fi',
    'sleep 2',
    `if [ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null || echo no)" != "yes" ]; then date -u -s ${shellQuote(nowUtc)}; fi`,
  ].join(' && ');

  await execRemote(ssh, command, sudoPassword);
}

async function withPiConnection<T>(pi: PiNode, fn: (ssh: Client) => Promise<T>): Promise<T> {
  const ssh = await connectToPi(pi);
  try {
    return await fn(ssh);
  } finally {
    ssh.end();
  }
}

async function uploadNetAgentBundle(ssh: Client, pi: PiNode) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'net-agent-'));
  const envFilePath = path.join(tempDir, 'net-agent.env');
  const servicePath = resolveAssetPath('net-agent.service');
  const binaryPath = resolveAssetPath('net-agent');
  const configResponse = await buildNetAgentConfig(pi);
  const remoteTempBase = `${REMOTE_TMP_PREFIX}-${pi.id}`;

  writeFileSync(envFilePath, `${configResponse.envFileContent}\n`, 'utf8');

  try {
    await uploadFile(ssh, binaryPath, `${remoteTempBase}.bin`);
    await uploadFile(ssh, servicePath, `${remoteTempBase}.service`);
    await uploadFile(ssh, envFilePath, `${remoteTempBase}.env`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  return remoteTempBase;
}

export async function getNetAgentRemoteStatus(pi: PiNode): Promise<NetAgentRemoteStatus> {
  return withPiConnection(pi, async (ssh) => queryStatus(ssh, pi.authMethod === 'password' ? pi.sshPassword : null));
}

export async function runNetAgentRemoteAction(
  pi: PiNode,
  action: PiNetAgentAction,
): Promise<NetAgentRemoteOperationResult> {
  return withPiConnection(pi, async (ssh) => {
    const sudoPassword = pi.authMethod === 'password' ? pi.sshPassword : null;
    let remoteTempBase: string | null = null;

    if (action === 'install' || action === 'configure') {
      remoteTempBase = await uploadNetAgentBundle(ssh, pi);
    }

    if (action === 'install') {
      await syncRemoteClock(ssh, sudoPassword);
      await execRemote(
        ssh,
        [
          `mkdir -p ${shellQuote(REMOTE_INSTALL_DIR)} ${shellQuote(REMOTE_ENV_DIR)} ${shellQuote(REMOTE_STATE_DIR)}`,
          `install -m 0755 ${shellQuote(`${remoteTempBase}.bin`)} ${shellQuote(`${REMOTE_INSTALL_DIR}/net-agent`)}`,
          `install -m 0644 ${shellQuote(`${remoteTempBase}.env`)} ${shellQuote(`${REMOTE_ENV_DIR}/net-agent.env`)}`,
          `install -m 0644 ${shellQuote(`${remoteTempBase}.service`)} ${shellQuote(`${REMOTE_SYSTEMD_DIR}/${REMOTE_SERVICE_NAME}.service`)}`,
          `rm -f ${shellQuote(`${remoteTempBase}.bin`)} ${shellQuote(`${remoteTempBase}.env`)} ${shellQuote(`${remoteTempBase}.service`)}`,
          'systemctl daemon-reload',
          `systemctl enable --now ${REMOTE_SERVICE_NAME}`,
          `systemctl restart ${REMOTE_SERVICE_NAME}`,
        ].join(' && '),
        sudoPassword,
      );
    } else if (action === 'configure') {
      await syncRemoteClock(ssh, sudoPassword);
      await execRemote(
        ssh,
        [
          `install -m 0644 ${shellQuote(`${remoteTempBase}.env`)} ${shellQuote(`${REMOTE_ENV_DIR}/net-agent.env`)}`,
          `rm -f ${shellQuote(`${remoteTempBase}.env`)}`,
          `systemctl restart ${REMOTE_SERVICE_NAME}`,
        ].join(' && '),
        sudoPassword,
      );
    } else if (action === 'restart') {
      await syncRemoteClock(ssh, sudoPassword);
      await execRemote(ssh, `systemctl restart ${REMOTE_SERVICE_NAME}`, sudoPassword);
    } else if (action === 'sync-time') {
      await syncRemoteClock(ssh, sudoPassword);
    } else if (action === 'uninstall') {
      await execRemote(
        ssh,
        [
          `systemctl disable --now ${REMOTE_SERVICE_NAME} || true`,
          `rm -f ${shellQuote(`${REMOTE_SYSTEMD_DIR}/${REMOTE_SERVICE_NAME}.service`)}`,
          `rm -f ${shellQuote(`${REMOTE_INSTALL_DIR}/net-agent`)}`,
          `rm -f ${shellQuote(`${REMOTE_ENV_DIR}/net-agent.env`)}`,
          `rm -f ${shellQuote(`${REMOTE_TMP_PREFIX}-${pi.id}.bin`)} ${shellQuote(`${REMOTE_TMP_PREFIX}-${pi.id}.env`)} ${shellQuote(`${REMOTE_TMP_PREFIX}-${pi.id}.service`)}`,
          'systemctl daemon-reload',
        ].join(' && '),
        sudoPassword,
      );
    }

    const status = await queryStatus(ssh, sudoPassword);
    const actionLabel = action === 'configure'
      ? 'configured'
      : action === 'sync-time'
        ? 'time synchronized'
        : action === 'uninstall'
          ? 'removed'
          : `${action}ed`;
    return {
      action,
      success: true,
      message: `net-agent ${actionLabel} on ${pi.name}`,
      status,
    };
  });
}
