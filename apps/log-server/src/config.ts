import { LOG_SERVER_TCP_PORT, LOG_SERVER_HTTP_PORT } from '@inslab/shared';

export const config = {
  tcpPort: parseInt(process.env.TCP_PORT || String(LOG_SERVER_TCP_PORT)),
  httpPort: parseInt(process.env.HTTP_PORT || String(LOG_SERVER_HTTP_PORT)),
  dbPath: process.env.DB_PATH || './data/logs.sqlite',
};
