import { Router } from 'express';
import { getRingTopology } from '../services/ring-topology.service.js';

export const topologyRouter = Router();

topologyRouter.get('/', (_req, res) => {
  res.json(getRingTopology());
});
