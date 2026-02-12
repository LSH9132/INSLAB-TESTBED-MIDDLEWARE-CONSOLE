import { Router } from 'express';
import { getAllPis, getPiById, createPi, deletePi, checkDuplicateHostname, checkDuplicateIp } from '../services/pi-registry.service.js';

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
  const { hostname, ipManagement, ipRing, sshPort, sshUser } = req.body;
  if (!hostname || !ipManagement || !ipRing) {
    return res.status(400).json({ error: 'hostname, ipManagement, ipRing required' });
  }

  // Check for duplicates
  if (checkDuplicateHostname(hostname)) {
    return res.status(409).json({ error: 'A Pi with this hostname already exists' });
  }
  if (checkDuplicateIp(ipManagement)) {
    return res.status(409).json({ error: 'A Pi with this management IP already exists' });
  }
  if (checkDuplicateIp(ipRing)) {
    return res.status(409).json({ error: 'A Pi with this ring IP already exists' });
  }

  const pi = createPi({ hostname, ipManagement, ipRing, sshPort, sshUser });
  res.status(201).json(pi);
});

piRouter.delete('/:id', (req, res) => {
  const ok = deletePi(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});
