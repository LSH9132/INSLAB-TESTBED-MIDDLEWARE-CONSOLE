import { CENTRAL_SERVER_PORT } from '@inslab/shared';

export const config = {
  port: parseInt(process.env.PORT || String(CENTRAL_SERVER_PORT)),
  dbPath: process.env.DB_PATH || './data/central.sqlite',
  sshPrivateKeyPath: process.env.SSH_PRIVATE_KEY_PATH || '~/.ssh/id_rsa',
  logServerUrl: process.env.LOG_SERVER_URL || 'http://localhost:3033',
};
