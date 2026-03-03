import { Router } from 'express';
import { getAllPis, getPiById, createPi, deletePi, checkDuplicateName, checkDuplicateIp, updatePi } from '../services/pi-registry.service.js';

export const piRouter = Router();

piRouter.get('/', (_req, res) => {
  res.json(getAllPis());
});

piRouter.get('/:id', (req, res) => {
  const pi = getPiById(req.params.id);
  if (!pi) return res.status(404).json({ error: 'Not found' });
  res.json(pi);
});

piRouter.post('/', (req, res) => {
  const { name, ip, sshPort, sshUser, authMethod, sshPassword } = req.body;

  if (!name || !ip) {
    return res.status(400).json({ error: 'name, ip required' });
  }

  if (authMethod === 'password' && !sshPassword) {
    return res.status(400).json({ error: 'sshPassword is required for password authentication' });
  }

  if (checkDuplicateName(name)) {
    return res.status(409).json({ error: '이미 등록된 이름입니다' });
  }
  if (checkDuplicateIp(ip)) {
    return res.status(409).json({ error: '이미 등록된 IP 주소입니다' });
  }

  const pi = createPi({ name, ip, sshPort, sshUser, authMethod, sshPassword });
  res.status(201).json(pi);
});

piRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, ip, sshPort, sshUser, authMethod, sshPassword } = req.body;

  const existingPi = getPiById(id);
  if (!existingPi) return res.status(404).json({ error: 'Not found' });

  if (name && name !== existingPi.name && checkDuplicateName(name)) {
    return res.status(409).json({ error: '이미 등록된 이름입니다' });
  }
  if (ip && ip !== existingPi.ip && checkDuplicateIp(ip)) {
    return res.status(409).json({ error: '이미 등록된 IP 주소입니다' });
  }

  if (authMethod === 'password' && !sshPassword) {
    // We optionally require password here if auth method changes to password, but it might be reused.
    // For simplicity, let's just make sure it's valid if they transmit an empty one.
    if (existingPi.authMethod !== 'password' || req.body.hasOwnProperty('sshPassword')) {
      if (!sshPassword) {
         return res.status(400).json({ error: 'sshPassword is required for password authentication' });
      }
    }
  }

  const updatedPi = updatePi(id, { name, ip, sshPort, sshUser, authMethod, sshPassword });
  res.json(updatedPi);
});

piRouter.delete('/:id', (req, res) => {
  const ok = deletePi(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});
