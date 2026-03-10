import Database from 'better-sqlite3';
import { config } from '../config.js';
import { existsSync, readFileSync } from 'fs';
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
  const sql001 = readMigrationSql('001_init.sql');
  db.exec(sql001);

  // 002: 기존 ring 기반 스키마 → 새 스키마 마이그레이션
  // hostname 컬럼이 존재할 때만 마이그레이션 실행
  const hasHostnameColumn = db.prepare(
    "SELECT 1 FROM pragma_table_info('pi_nodes') WHERE name = 'hostname'"
  ).get() !== undefined;

  if (hasHostnameColumn) {
    const sql002 = readMigrationSql('002_refactor_pi.sql');
    db.exec(sql002);
  }

  // 003: 토폴로지 링크 테이블 추가 (IF NOT EXISTS 이므로 항상 실행)
  const sql003 = readMigrationSql('003_topology.sql');
  db.exec(sql003);

  // 004: ssh_private_key 컬럼 추가 (이미 존재하면 무시)
  const hasSshPrivateKeyColumn = db.prepare(
    "SELECT 1 FROM pragma_table_info('pi_nodes') WHERE name = 'ssh_private_key'"
  ).get() !== undefined;

  if (!hasSshPrivateKeyColumn) {
    const sql004 = readMigrationSql('004_add_ssh_private_key.sql');
    db.exec(sql004);
  }
}

function readMigrationSql(filename: string): string {
  const runtimePath = resolve(__dirname, 'migrations', filename);
  if (existsSync(runtimePath)) {
    return readFileSync(runtimePath, 'utf-8');
  }

  const sourcePath = resolve(__dirname, '../../src/db/migrations', filename);
  return readFileSync(sourcePath, 'utf-8');
}
