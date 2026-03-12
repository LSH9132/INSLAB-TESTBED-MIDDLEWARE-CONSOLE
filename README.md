# INSLAB Testbed Middleware Console

Raspberry Pi 테스트베드의 제어, 관측, 시각화를 위한 모노레포입니다.

현재 구조는 `web-console -> central-server -> log-server` 흐름을 기준으로 동작합니다.

- `web-console`: Next.js 기반 운영 UI
- `central-server`: PI 등록, SSH 프록시, 토폴로지, 상태 점검, `log-server` 프록시
- `log-server`: 로그와 네트워크 메트릭 ingest 및 조회 API
- `clients/net-agent`: 각 PI에서 실행되는 C 기반 네트워크 수집기
- `packages/shared`: 공통 타입과 상수

## Repository Layout

```text
apps/
  central-server/  Express + SQLite + WebSocket control plane
  log-server/      NestJS + PostgreSQL + Redis ingest server
  web-console/     Next.js operator UI
clients/
  net-agent/       C agent for per-node network metrics
packages/
  shared/          Shared types and protocol constants
```

## Data Flow

1. `net-agent`가 PI에서 인터페이스 샘플을 수집합니다.
2. 샘플은 `log-server` TCP ingest 포트로 전송됩니다.
3. `log-server`는 Redis 큐에 버퍼링한 뒤 PostgreSQL에 적재합니다.
4. `central-server`는 `log-server`의 로그/메트릭 API를 프록시합니다.
5. `web-console`은 `central-server`의 HTTP/WebSocket API를 사용합니다.

## Ports

| Service | Default Port | Purpose |
| --- | ---: | --- |
| `web-console` | `3000` | Operator UI |
| `central-server` | `3001` | Control plane API + WebSocket |
| `log-server` HTTP | `3002` | Log / metric query API |
| `log-server` TCP | `5140` | TCP ingest from PI / agent |
| `log-db` | `5432` | PostgreSQL |
| `log-redis` | `6379` | Redis ingest queue |

Docker 배포에서는 외부 TCP ingest 포트를 `6140 -> 5140`으로 매핑합니다.

## Prerequisites

- Node.js 20+
- `pnpm`
- Docker / Docker Compose
- Linux 또는 macOS 개발 환경

## Quick Start

전체 스택을 가장 간단하게 확인하려면:

```sh
docker compose up --build
```

확인:

```sh
curl http://localhost:3101/api/health
curl http://localhost:3102/api/health
```

## Local Development

의존성 설치:

```sh
pnpm install
```

권장 순서:

1. `docker compose up -d log-db log-redis`
2. `pnpm --filter @inslab/shared build`
3. `pnpm dev:log`
4. `pnpm dev:central`
5. `pnpm dev:web`

설명:

- `pnpm dev:web`는 `dev-server.js`를 사용해 `/api/*`, `/ws/*`를 `central-server`로 프록시합니다.
- `log-server`는 로컬 개발에서도 PostgreSQL과 Redis가 필요합니다.

## Environment Variables

### `apps/central-server`

핵심 변수:

- `PORT`: HTTP 포트. 기본값 `3001`
- `DB_PATH`: SQLite 경로. 기본값 `./data/central.sqlite`
- `LOG_SERVER_URL`: `log-server` HTTP 주소
- `SSH_PRIVATE_KEY_PATH`: SSH 개인키 경로
- `PUBLIC_LOG_SERVER_HOST`: `net-agent`에 내려줄 외부 접근 호스트
- `PUBLIC_LOG_SERVER_TCP_PORT`: `net-agent`에 내려줄 외부 TCP 포트
- `NET_AGENT_SHARED_SECRET`: 에이전트 토큰 서명용 시크릿

예시는 [`apps/central-server/.env.example`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/apps/central-server/.env.example)에 있습니다.

### `apps/log-server`

핵심 변수:

- `HTTP_PORT`: HTTP API 포트. 기본값 `3002`
- `TCP_PORT`: ingest 포트. 기본값 `5140`
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `REDIS_URL`: Redis 연결 문자열
- `NET_AGENT_SHARED_SECRET`: `central-server`와 동일해야 함

예시는 [`apps/log-server/.env.example`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/apps/log-server/.env.example)에 있습니다.

### `clients/net-agent`

핵심 변수:

- `NODE_ID`
- `LOG_SERVER_HOST`
- `LOG_SERVER_PORT`
- `PROTOCOL_VERSION`
- `AUTH_TOKEN`
- `SAMPLE_INTERVAL_SEC`

예시는 [`clients/net-agent/net-agent.env.sample`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/clients/net-agent/net-agent.env.sample)에 있습니다.

## Useful Commands

```sh
pnpm build
docker compose up -d log-db log-redis log-server
docker compose logs -f log-server
docker compose exec -T log-redis redis-cli LLEN net-metrics:ingest
curl http://localhost:3102/api/net-metrics/<NODE_ID>/latest
curl http://localhost:3101/api/net-stats/<PI_ID>
```

## Current Notes

- `central-server`는 원시 로그/메트릭을 저장하지 않습니다.
- 네트워크 메트릭 source of truth는 `log-server` PostgreSQL입니다.
- Redis는 ingest 버퍼 큐로만 사용됩니다.
- `web-console` 개발 모드는 WebSocket 프록시가 필요하므로 단순 `next dev`가 아니라 래핑된 개발 서버를 사용합니다.

## Documentation

- 아키텍처 개요: [`PROJECT_ARCHITECTURE.md`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/PROJECT_ARCHITECTURE.md)
- 물리/실험망 메모: [`docs/실험환경 구성.md`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/docs/실험환경%20구성.md)
- 에이전트 운영: [`clients/net-agent/README.md`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/clients/net-agent/README.md)
