import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import type { SystemStatus, ServiceStatus } from '@inslab/shared';

const startTime = Date.now();

// Log Server 상태 확인
async function checkLogServer(): Promise<ServiceStatus> {
  try {
    const response = await fetch(`${config.logServerUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3초 타임아웃
    });

    if (response.ok) {
      return {
        status: 'online',
        message: '정상',
        lastChecked: Date.now()
      };
    } else {
      return {
        status: 'degraded',
        message: `HTTP ${response.status}`,
        lastChecked: Date.now()
      };
    }
  } catch (error: any) {
    return {
      status: 'offline',
      message: error.message || '연결 실패',
      lastChecked: Date.now()
    };
  }
}

// Database 상태 확인
function checkDatabase(): ServiceStatus {
  try {
    const db = getDb();
    // 간단한 쿼리로 DB 상태 확인
    db.prepare('SELECT 1').get();

    return {
      status: 'online',
      message: '정상',
      lastChecked: Date.now()
    };
  } catch (error: any) {
    return {
      status: 'offline',
      message: error.message || 'DB 연결 실패',
      lastChecked: Date.now()
    };
  }
}

// 전체 시스템 상태 가져오기
export async function getSystemStatus(): Promise<SystemStatus> {
  const uptime = Math.floor((Date.now() - startTime) / 1000); // 초 단위

  const [logServerStatus] = await Promise.all([
    checkLogServer()
  ]);

  const databaseStatus = checkDatabase();

  return {
    centralServer: {
      status: 'online',
      uptime,
      message: '정상',
      lastChecked: Date.now()
    },
    logServer: logServerStatus,
    database: databaseStatus
  };
}
