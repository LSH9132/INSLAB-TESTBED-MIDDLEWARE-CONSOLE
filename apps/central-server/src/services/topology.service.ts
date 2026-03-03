import { getDb } from '../db/connection.js';
import { getAllPis } from './pi-registry.service.js';
import type { TopologyLink, TopologyNode, TopologyGraph } from '@inslab/shared';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { config } from '../config.js';

// ─────────────────────────────────────────────
// 문서 기반 정적 토폴로지 데이터 (14노드, 27링크)
// ─────────────────────────────────────────────
const MGMT_IP: Record<string, string> = {
  pi1: '10.10.0.6', pi2: '10.10.0.7', pi3: '10.10.0.8', pi4: '10.10.0.9',
  pi5: '10.10.0.10', pi6: '10.10.0.11', pi7: '10.10.0.12', pi8: '10.10.0.2',
  pi9: '10.10.0.3', pi10: '10.10.0.4', pi11: '10.10.0.5', pi12: '10.10.0.13',
  pi13: '10.10.0.14', pi14: '10.10.0.15',
};

const STATIC_LINKS = [
  { nodeA: 'pi1', nodeB: 'pi2', vlan: 12, iface: 'int12', ipA: '10.1.2.1/30', ipB: '10.1.2.2/30' },
  { nodeA: 'pi1', nodeB: 'pi4', vlan: 14, iface: 'int14', ipA: '10.1.4.1/30', ipB: '10.1.4.2/30' },
  { nodeA: 'pi1', nodeB: 'pi5', vlan: 15, iface: 'int15', ipA: '10.1.5.1/30', ipB: '10.1.5.2/30' },
  { nodeA: 'pi2', nodeB: 'pi3', vlan: 23, iface: 'int23', ipA: '10.2.3.1/30', ipB: '10.2.3.2/30' },
  { nodeA: 'pi2', nodeB: 'pi5', vlan: 25, iface: 'int25', ipA: '10.2.5.1/30', ipB: '10.2.5.2/30' },
  { nodeA: 'pi3', nodeB: 'pi5', vlan: 35, iface: 'int35', ipA: '10.3.5.1/30', ipB: '10.3.5.2/30' },
  { nodeA: 'pi3', nodeB: 'pi6', vlan: 36, iface: 'int36', ipA: '10.3.6.1/30', ipB: '10.3.6.2/30' },
  { nodeA: 'pi4', nodeB: 'pi5', vlan: 45, iface: 'int45', ipA: '10.4.5.1/30', ipB: '10.4.5.2/30' },
  { nodeA: 'pi4', nodeB: 'pi7', vlan: 47, iface: 'int47', ipA: '10.4.7.1/30', ipB: '10.4.7.2/30' },
  { nodeA: 'pi5', nodeB: 'pi6', vlan: 56, iface: 'int56', ipA: '10.5.6.1/30', ipB: '10.5.6.2/30' },
  { nodeA: 'pi5', nodeB: 'pi8', vlan: 58, iface: 'int58', ipA: '10.5.8.1/30', ipB: '10.5.8.2/30' },
  { nodeA: 'pi5', nodeB: 'pi9', vlan: 59, iface: 'int59', ipA: '10.5.9.1/30', ipB: '10.5.9.2/30' },
  { nodeA: 'pi6', nodeB: 'pi9', vlan: 69, iface: 'int69', ipA: '10.6.9.1/30', ipB: '10.6.9.2/30' },
  { nodeA: 'pi7', nodeB: 'pi8', vlan: 78, iface: 'int78', ipA: '10.7.8.1/30', ipB: '10.7.8.2/30' },
  { nodeA: 'pi7', nodeB: 'pi10', vlan: 70, iface: 'int70', ipA: '10.7.10.1/30', ipB: '10.7.10.2/30' },
  { nodeA: 'pi8', nodeB: 'pi9', vlan: 89, iface: 'int89', ipA: '10.8.9.1/30', ipB: '10.8.9.2/30' },
  { nodeA: 'pi8', nodeB: 'pi10', vlan: 80, iface: 'int80', ipA: '10.8.10.1/30', ipB: '10.8.10.2/30' },
  { nodeA: 'pi8', nodeB: 'pi11', vlan: 81, iface: 'int81', ipA: '10.8.11.1/30', ipB: '10.8.11.2/30' },
  { nodeA: 'pi9', nodeB: 'pi11', vlan: 91, iface: 'int91', ipA: '10.9.11.1/30', ipB: '10.9.11.2/30' },
  { nodeA: 'pi9', nodeB: 'pi12', vlan: 92, iface: 'int92', ipA: '10.9.12.1/30', ipB: '10.9.12.2/30' },
  { nodeA: 'pi10', nodeB: 'pi11', vlan: 10, iface: 'int10', ipA: '10.10.11.1/30', ipB: '10.10.11.2/30' },
  { nodeA: 'pi10', nodeB: 'pi13', vlan: 30, iface: 'int30', ipA: '10.10.13.1/30', ipB: '10.10.13.2/30' },
  { nodeA: 'pi11', nodeB: 'pi12', vlan: 21, iface: 'int21', ipA: '10.11.12.1/30', ipB: '10.11.12.2/30' },
  { nodeA: 'pi11', nodeB: 'pi13', vlan: 31, iface: 'int31', ipA: '10.11.13.1/30', ipB: '10.11.13.2/30' },
  { nodeA: 'pi11', nodeB: 'pi14', vlan: 41, iface: 'int41', ipA: '10.11.14.1/30', ipB: '10.11.14.2/30' },
  { nodeA: 'pi12', nodeB: 'pi14', vlan: 42, iface: 'int42', ipA: '10.12.14.1/30', ipB: '10.12.14.2/30' },
  { nodeA: 'pi13', nodeB: 'pi14', vlan: 43, iface: 'int43', ipA: '10.13.14.1/30', ipB: '10.13.14.2/30' },
];

// ─────────────────────────────────────────────
// Static Seed: 서버 시작 시 27개 링크를 DB에 삽입
// ─────────────────────────────────────────────
export function seedStaticTopology() {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO topology_links (id, node_a, node_b, vlan, iface, ip_a, ip_b, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'static')
  `);

  const insertMany = db.transaction(() => {
    for (const link of STATIC_LINKS) {
      const id = `${link.nodeA}-${link.nodeB}`;
      insert.run(id, link.nodeA, link.nodeB, link.vlan, link.iface, link.ipA, link.ipB);
    }
  });

  insertMany();
  console.log('[topology] Static seed complete: 27 links inserted (if not exists)');
}

// ─────────────────────────────────────────────
// DB Read: 전체 토폴로지 그래프 반환
// ─────────────────────────────────────────────
export function getTopologyGraph(): TopologyGraph {
  const db = getDb();

  const linkRows = db.prepare('SELECT * FROM topology_links ORDER BY node_a, node_b').all() as any[];
  const links: TopologyLink[] = linkRows.map(rowToLink);

  // pi_nodes 등록 목록으로 status 매핑
  const registeredPis = getAllPis();
  const piStatusMap = new Map(registeredPis.map(p => [p.name, p.status]));

  // 노드 목록: MGMT_IP에 정의된 14개 기준
  const nodes: TopologyNode[] = Object.entries(MGMT_IP).map(([name, mgmtIp]) => {
    // 이 노드가 참여하는 인터페이스 수집
    const interfaces = STATIC_LINKS
      .filter(l => l.nodeA === name || l.nodeB === name)
      .map(l => l.iface);

    return {
      name,
      mgmtIp,
      status: piStatusMap.get(name) ?? 'unknown',
      interfaces,
    };
  });

  const lastScanRow = db.prepare(
    'SELECT MAX(last_scan) as last_scan FROM topology_links WHERE last_scan IS NOT NULL'
  ).get() as any;

  return {
    nodes,
    links,
    scannedAt: lastScanRow?.last_scan ?? null,
  };
}

function rowToLink(row: any): TopologyLink {
  return {
    id: row.id,
    nodeA: row.node_a,
    nodeB: row.node_b,
    vlan: row.vlan,
    iface: row.iface,
    ipA: row.ip_a,
    ipB: row.ip_b,
    status: row.status,
    lastScan: row.last_scan,
    source: row.source,
  };
}

// ─────────────────────────────────────────────
// SSH Discover: 각 Pi ssh → ip addr → int* 파싱
// ─────────────────────────────────────────────
export async function discoverTopology(): Promise<void> {
  const pis = getAllPis();
  const db = getDb();

  const updateStatus = db.prepare(
    'UPDATE topology_links SET status = ?, last_scan = unixepoch(), source = ? WHERE id = ?'
  );

  for (const pi of pis) {
    try {
      const output = await sshExec(
        pi.ip,
        pi.sshPort,
        pi.sshUser,
        pi.authMethod,
        (pi as any).sshPassword,
        "ip -o -4 addr show 2>/dev/null | awk '$2 ~ /^int/ {print $2, $4}'"
      );

      // 결과 파싱: "int12 10.1.2.1/30"
      const activeIfaces = new Set<string>();
      for (const line of output.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) activeIfaces.add(parts[0]);
      }

      // 이 Pi가 node_a 또는 node_b인 링크의 status 업데이트
      const piName = pi.name;
      const linkRows = db.prepare(
        "SELECT * FROM topology_links WHERE node_a = ? OR node_b = ?"
      ).all(piName, piName) as any[];

      for (const link of linkRows) {
        const isUp = activeIfaces.has(link.iface);
        updateStatus.run(isUp ? 'up' : 'down', 'discovered', link.id);
      }

      console.log(`[topology] Scanned ${piName}: ${activeIfaces.size} active int* interfaces`);
    } catch (err: any) {
      console.warn(`[topology] SSH scan failed for ${pi.name} (${pi.ip}): ${err.message}`);
    }
  }
}

function sshExec(
  host: string,
  port: number,
  username: string,
  authMethod: string,
  sshPassword: string | null | undefined,
  command: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ssh = new Client();
    let output = '';

    ssh.on('ready', () => {
      ssh.exec(command, (err, stream) => {
        if (err) { ssh.end(); return reject(err); }

        stream.on('data', (data: Buffer) => { output += data.toString(); });
        stream.stderr.on('data', () => { /* ignore */ });
        stream.on('close', () => { ssh.end(); resolve(output); });
      });
    });

    ssh.on('error', reject);

    const connectOptions: any = { host, port, username, readyTimeout: 5000 };

    if (authMethod === 'password' && sshPassword) {
      connectOptions.password = sshPassword;
    } else {
      try {
        const keyPath = config.sshPrivateKeyPath.replace('~', process.env.HOME || '');
        connectOptions.privateKey = readFileSync(keyPath);
      } catch {
        return reject(new Error('SSH private key not found'));
      }
    }

    ssh.connect(connectOptions);
  });
}
