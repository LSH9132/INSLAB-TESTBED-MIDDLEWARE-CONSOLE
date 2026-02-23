import { Router } from 'express';
import { getAllPis, getPiById, createPi, deletePi, checkDuplicateName, checkDuplicateIp } from '../services/pi-registry.service.js';

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

piRouter.delete('/:id', (req, res) => {
  const ok = deletePi(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});
