import Database from 'better-sqlite3';
import { config } from '../config.js';
import { readFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(dirname(config.dbPath), { recursive: true });
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    runMigrations(db);
  }
  return db;
}

function runMigrations(db: Database.Database) {
  // 001: 초기 테이블 생성
  const sql001 = readFileSync(resolve(__dirname, 'migrations/001_init.sql'), 'utf-8');
  db.exec(sql001);

  // 002: 기존 ring 기반 스키마 → 새 스키마 마이그레이션
  // hostname 컬럼이 존재할 때만 마이그레이션 실행
  const hasHostnameColumn = db.prepare(
    "SELECT 1 FROM pragma_table_info('pi_nodes') WHERE name = 'hostname'"
  ).get() !== undefined;

  if (hasHostnameColumn) {
    const sql002 = readFileSync(resolve(__dirname, 'migrations/002_refactor_pi.sql'), 'utf-8');
    db.exec(sql002);
  }

  // 003: 토폴로지 링크 테이블 추가 (IF NOT EXISTS 이므로 항상 실행)
  const sql003 = readFileSync(resolve(__dirname, 'migrations/003_topology.sql'), 'utf-8');
  db.exec(sql003);
}
