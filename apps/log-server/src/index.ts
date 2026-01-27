import express from 'express';
import { config } from './config.js';
import { getDb } from './db/connection.js';
import { startTcpReceiver } from './receiver/tcp.receiver.js';
import { logQueryRouter } from './routes/log-query.routes.js';

// Initialize DB
getDb();

// Start TCP log receiver
startTcpReceiver();

// Start HTTP query API
const app = express();
app.use('/api/logs', logQueryRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(config.httpPort, () => {
  console.log(`Log query API on port ${config.httpPort}`);
});
