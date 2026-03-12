# CLAUDE.md

This file is a practical handoff and operating guide for agents working in this repository.

It is intentionally biased toward:
- current code behavior over historical intent
- concrete commands over abstract description
- avoiding regressions in the mixed `develop` state

## 1. Repository Shape

Monorepo layout:
- `apps/web-console`: Next.js frontend
- `apps/central-server`: Express control-plane backend
- `apps/log-server`: NestJS + Prisma log/metrics ingest backend
- `packages/shared`: shared types/constants
- `clients/net-agent`: C agent for PI-side network metric collection

Current architecture should be read as:
- network metrics: `PI net-agent -> log-server -> central-server -> web-console`
- generic logs: sender -> `log-server` -> query API / central proxy -> `web-console`
- SSH-based features still exist in `central-server` for terminal and topology scanning

Do not assume older docs that say "`central-server` directly SSH-collects network load" are current.

## 2. Current Architectural Truths

### Network metrics

Source of truth:
- `clients/net-agent/net_agent.c`
- `apps/log-server/src/net-metrics/*`
- `apps/central-server/src/routes/net-stats.routes.ts`
- `apps/central-server/src/services/network-stats.service.ts`
- `apps/web-console/src/hooks/useNetStats.ts`

Meaning:
- `net-agent` reads `/proc/net/dev` locally on the PI
- samples include `nodeId`
- `log-server` stores samples in PostgreSQL
- `central-server` does not originate network metrics; it proxies and broadcasts them
- `web-console` does initial REST load, then prefers WebSocket-driven updates

Critical mapping rule:
- `net-agent NODE_ID` must equal `central-server`'s `pi.id`

### Generic logs

Source of truth:
- `apps/log-server/src/logs/*`
- `apps/log-server/src/tcp/tcp.service.ts`

Meaning:
- `log-server` is the ingest/storage layer for logs
- verify sender deployment separately; do not assume all PIs are already sending

### SSH still exists

SSH is still valid for:
- terminal proxy
- topology scan

SSH is no longer the primary network-load collection path.

## 3. Ports and Runtime Modes

There are two execution contexts that frequently get confused.

### Local dev ports
- `3000`: `web-console` dev server
- `3001`: `central-server`
- `3002`: `log-server` HTTP
- `5140`: `log-server` TCP

### Docker compose ports often used for the full stack
- `3100`: web-console
- `3101`: central-server
- `3102`: log-server HTTP
- `6140`: log-server TCP

Always verify actual listeners:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
lsof -nP -iTCP:3002 -sTCP:LISTEN
lsof -nP -iTCP:3100 -sTCP:LISTEN
lsof -nP -iTCP:3101 -sTCP:LISTEN
lsof -nP -iTCP:3102 -sTCP:LISTEN
```

Do not assume `3000` is Docker. It is often a local Next dev process.

## 4. Web Console Development Caveat

The dev server had an App Router static asset issue:
- `/_next/static/css/app/layout.css`
- `/_next/static/chunks/app-pages-internals.js`

Current mitigation:
- `apps/web-console/package.json` uses `node dev-server.js` for `dev`
- it clears `.next` first
- `apps/web-console/dev-server.js` directly serves `/_next/static/*`

If frontend assets 404 in dev:
1. kill the current `3000` listener
2. restart with `pnpm --filter web-console dev`
3. verify:

```bash
curl -I http://localhost:3000/login
curl -I http://localhost:3000/_next/static/chunks/app-pages-internals.js
curl -I 'http://localhost:3000/_next/static/css/app/layout.css?v=1'
```

## 5. Build / Verification Commands

Preferred targeted builds:

```bash
pnpm --filter @inslab/shared build
pnpm --filter central-server build
pnpm --filter @inslab/log-server build
pnpm --filter web-console build
```

For the C agent:

```bash
make -C clients/net-agent
```

For the helper script:

```bash
clients/net-agent/manage.sh build
```

Docker verification:

```bash
docker compose ps
curl http://localhost:3102/api/health
curl http://localhost:3101/api/health
```

Metric-path verification:

```bash
curl http://localhost:3102/api/net-metrics/<PI_ID>/latest
curl http://localhost:3101/api/net-stats/<PI_ID>
curl 'http://localhost:3101/api/net-stats/<PI_ID>/history?iface=eth0&limit=5'
```

## 6. Important Files by Responsibility

### web-console
- `apps/web-console/src/hooks/useNetStats.ts`
- `apps/web-console/src/components/network/NetworkLoadCard.tsx`
- `apps/web-console/src/components/network/NetworkInterfacePanel.tsx`
- `apps/web-console/dev-server.js`
- `apps/web-console/package.json`

### central-server
- `apps/central-server/src/routes/net-stats.routes.ts`
- `apps/central-server/src/services/network-stats.service.ts`
- `apps/central-server/src/ws/net-stats.handler.ts`
- `apps/central-server/src/ws/index.ts`
- `apps/central-server/src/services/ssh-proxy.service.ts`
- `apps/central-server/src/services/topology.service.ts`

### log-server
- `apps/log-server/src/tcp/tcp.service.ts`
- `apps/log-server/src/ingest/ingest.worker.ts`
- `apps/log-server/src/net-metrics/net-metrics.controller.ts`
- `apps/log-server/src/net-metrics/net-metrics.service.ts`
- `apps/log-server/src/prisma/prisma.service.ts`
- `apps/log-server/prisma/schema.prisma`

### shared
- `packages/shared/src/types/net-stats.ts`
- `packages/shared/src/constants/protocols.ts`

### PI agent
- `clients/net-agent/net_agent.c`
- `clients/net-agent/manage.sh`
- `clients/net-agent/net-agent.env.sample`
- `clients/net-agent/net-agent.service`

## 7. net-agent Operational Notes

`clients/net-agent/manage.sh` exists for common operations:

```bash
./manage.sh build
sudo ./manage.sh install
./manage.sh run
sudo ./manage.sh status
sudo ./manage.sh logs
sudo ./manage.sh restart
sudo ./manage.sh stop
sudo ./manage.sh uninstall
```

Important env file:
- `/etc/net-agent/net-agent.env`

Critical values:
- `NODE_ID`
- `LOG_SERVER_HOST`
- `LOG_SERVER_PORT`
- `SPOOL_PATH`
- `MAX_SPOOL_BYTES`

## 8. Git / Branch Expectations

Current local pattern observed:
- local `develop` contains the log-pipeline merge
- remote sync state may differ, so verify before claiming anything is pushed

Always check:

```bash
git status --short
git branch --show-current
git log --oneline -n 10
git rev-parse HEAD
```

If discussing merge state, distinguish:
- local `develop`
- feature branch
- `origin/develop`

Do not assume remote has the latest local work.

## 9. Notion Documentation

Project docs already exist in Notion and were updated with:
- previous vs current architecture comparisons
- deployment comparison
- a dedicated handoff page

If continuing documentation work, preserve old descriptions and add explicit comparison sections rather than silently replacing historical text.

Repository-facing documentation now also exists in:
- `README.md`
- `PROJECT_ARCHITECTURE.md`
- `docs/실험환경 구성.md`
- `clients/net-agent/README.md`

## 10. Current Known Focus Areas

These are reasonable next tasks for another agent:
- deploy `net-agent` on real PI devices
- verify real network samples arrive end-to-end
- clarify the real operational sender path for generic logs
- push local `develop` state upstream if requested
- add retention/downsampling policy for metrics
- improve auth/TLS story around ingest and server communication
- make dev/prod run modes less confusing

## 11. Guardrails

- Prefer the current code over stale architecture notes.
- Do not reintroduce SSH-based network metric collection as the primary path unless explicitly asked.
- Be careful not to confuse Docker ports with local dev ports.
- Before saying an asset or API is broken, check which process is actually listening on the target port.
- If changing `web-console` dev behavior, keep the `/_next/static/*` serving issue in mind.
- If changing network metric identity rules, preserve `NODE_ID == pi.id` unless the whole mapping model is intentionally redesigned.
