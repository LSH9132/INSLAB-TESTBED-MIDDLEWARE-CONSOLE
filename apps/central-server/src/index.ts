import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { getDb } from './db/connection.js';
import { initNetStatsTable } from './db/net-stats.db.js';
import { piRouter } from './routes/pi.routes.js';
import { topologyRouter } from './routes/topology.routes.js';
import { logRouter } from './routes/log.routes.js';
import { systemRouter } from './routes/system.routes.js';
import { netStatsRouter } from './routes/net-stats.routes.js';
import { setupWebSocket } from './ws/index.js';
import { startMonitor } from './services/pi-monitor.service.js';
import { seedStaticTopology } from './services/topology.service.js';
import { startNetworkMonitor } from './services/network-stats.service.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/pis', piRouter);
app.use('/api/topology', topologyRouter);
app.use('/api/logs', logRouter);
app.use('/api/system', systemRouter);
app.use('/api/net-stats', netStatsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Initialize DB
getDb();
initNetStatsTable();
seedStaticTopology();

const server = createServer(app);
setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`Central server running on port ${config.port}`);
  startMonitor();
  startNetworkMonitor();
});
