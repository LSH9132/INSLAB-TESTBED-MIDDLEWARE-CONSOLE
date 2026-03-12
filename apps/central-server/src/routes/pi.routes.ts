import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getAllPis,
  getPiById,
  getStoredPiById,
  createPi,
  deletePi,
  checkDuplicateName,
  checkDuplicateIp,
  updatePi,
  toPublicPiNode,
} from '../services/pi-registry.service.js';
import { buildNetAgentConfig } from '../services/net-agent-config.service.js';
import { getNetAgentRemoteStatus, runNetAgentRemoteAction } from '../services/net-agent-remote.service.js';
import type { PiCreateRequest } from '@inslab/shared';

export const piRouter = Router();
type PiNetAgentAction = 'install' | 'configure' | 'restart' | 'sync-time' | 'uninstall';

interface PiRouteParams {
  id: string;
}

interface NetAgentSettingsBody {
  sampleIntervalSec?: unknown;
}

type PiMutationBody = Partial<PiCreateRequest>;

function parseSampleIntervalSec(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3600) {
    return NaN;
  }
  return parsed;
}

piRouter.get('/', (_req, res) => {
  res.json(getAllPis());
});

piRouter.get('/:id', (req, res) => {
  const pi = getPiById(req.params.id);
  if (!pi) return res.status(404).json({ error: 'Not found' });
  res.json(pi);
});

piRouter.get('/:id/net-agent-config', async (req, res) => {
  const pi = getStoredPiById(req.params.id);
  if (!pi) return res.status(404).json({ error: 'Not found' });

  try {
    const config = await buildNetAgentConfig(pi);
    res.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build net-agent config';
    res.status(503).json({ error: message });
  }
});

piRouter.get('/:id/net-agent/status', async (req, res) => {
  const pi = getStoredPiById(req.params.id);
  if (!pi) return res.status(404).json({ error: 'Not found' });

  try {
    const status = await getNetAgentRemoteStatus(pi);
    res.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to inspect net-agent';
    res.status(503).json({ error: message });
  }
});

piRouter.put('/:id/net-agent/settings', (req: Request<PiRouteParams, unknown, NetAgentSettingsBody>, res) => {
  const pi = getPiById(req.params.id);
  if (!pi) return res.status(404).json({ error: 'Not found' });

  const sampleIntervalSec = parseSampleIntervalSec(req.body?.sampleIntervalSec);
  if (sampleIntervalSec === undefined || Number.isNaN(sampleIntervalSec)) {
    return res.status(400).json({ error: 'sampleIntervalSec must be an integer between 1 and 3600' });
  }

  const updatedPi = updatePi(req.params.id, { netAgentSampleIntervalSec: sampleIntervalSec });
  res.json(updatedPi ? toPublicPiNode(updatedPi) : updatedPi);
});

async function handleNetAgentAction(req: Request<PiRouteParams>, res: Response, action: PiNetAgentAction) {
  const pi = getStoredPiById(req.params.id);
  if (!pi) return res.status(404).json({ error: 'Not found' });

  try {
    const result = await runNetAgentRemoteAction(pi, action);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to ${action} net-agent`;
    res.status(503).json({ error: message });
  }
}

piRouter.post('/:id/net-agent/install', (req, res) => {
  handleNetAgentAction(req, res, 'install');
});

piRouter.post('/:id/net-agent/configure', (req, res) => {
  handleNetAgentAction(req, res, 'configure');
});

piRouter.post('/:id/net-agent/restart', (req, res) => {
  handleNetAgentAction(req, res, 'restart');
});

piRouter.post('/:id/net-agent/sync-time', (req, res) => {
  handleNetAgentAction(req, res, 'sync-time');
});

piRouter.delete('/:id/net-agent', (req, res) => {
  handleNetAgentAction(req, res, 'uninstall');
});

piRouter.post('/', (req: Request<Record<string, never>, unknown, PiMutationBody>, res) => {
  const { name, ip, sshPort, sshUser, authMethod, sshPassword, sshPrivateKey, netAgentSampleIntervalSec } = req.body;
  const sampleIntervalSec = parseSampleIntervalSec(netAgentSampleIntervalSec);

  if (!name || !ip) {
    return res.status(400).json({ error: 'name, ip required' });
  }

  if (netAgentSampleIntervalSec !== undefined && Number.isNaN(sampleIntervalSec)) {
    return res.status(400).json({ error: 'netAgentSampleIntervalSec must be an integer between 1 and 3600' });
  }

  if (authMethod === 'password' && !sshPassword) {
    return res.status(400).json({ error: 'sshPassword is required for password authentication' });
  }

  if (authMethod === 'key' && !sshPrivateKey?.trim()) {
    return res.status(400).json({ error: 'SSH 개인키를 입력해주세요' });
  }

  if (checkDuplicateName(name)) {
    return res.status(409).json({ error: '이미 등록된 이름입니다' });
  }
  if (checkDuplicateIp(ip)) {
    return res.status(409).json({ error: '이미 등록된 IP 주소입니다' });
  }

  const pi = createPi({
    name,
    ip,
    sshPort,
    sshUser,
    authMethod,
    sshPassword,
    sshPrivateKey,
    netAgentSampleIntervalSec: sampleIntervalSec,
  });
  res.status(201).json(toPublicPiNode(pi));
});

piRouter.put('/:id', (req: Request<PiRouteParams, unknown, PiMutationBody>, res) => {
  const { id } = req.params;
  const { name, ip, sshPort, sshUser, authMethod, sshPassword, sshPrivateKey, netAgentSampleIntervalSec } = req.body;
  const sampleIntervalSec = parseSampleIntervalSec(netAgentSampleIntervalSec);

  const existingPi = getStoredPiById(id);
  if (!existingPi) return res.status(404).json({ error: 'Not found' });

  if (netAgentSampleIntervalSec !== undefined && Number.isNaN(sampleIntervalSec)) {
    return res.status(400).json({ error: 'netAgentSampleIntervalSec must be an integer between 1 and 3600' });
  }

  if (name && name !== existingPi.name && checkDuplicateName(name)) {
    return res.status(409).json({ error: '이미 등록된 이름입니다' });
  }
  if (ip && ip !== existingPi.ip && checkDuplicateIp(ip)) {
    return res.status(409).json({ error: '이미 등록된 IP 주소입니다' });
  }

  if (authMethod === 'password' && !sshPassword) {
    if (existingPi.authMethod !== 'password' || Object.prototype.hasOwnProperty.call(req.body, 'sshPassword')) {
      if (!sshPassword) {
         return res.status(400).json({ error: 'sshPassword is required for password authentication' });
      }
    }
  }

  const updatedPi = updatePi(id, {
    name,
    ip,
    sshPort,
    sshUser,
    authMethod,
    sshPassword,
    sshPrivateKey,
    netAgentSampleIntervalSec: sampleIntervalSec,
  });
  res.json(updatedPi ? toPublicPiNode(updatedPi) : updatedPi);
});

piRouter.delete('/:id', (req, res) => {
  const ok = deletePi(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});
