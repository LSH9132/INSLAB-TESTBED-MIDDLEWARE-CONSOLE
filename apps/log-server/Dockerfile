FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/log-server/ apps/log-server/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inslab/shared build
RUN pnpm --filter log-server build

FROM node:20-slim
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared ./packages/shared
COPY --from=base /app/apps/log-server ./apps/log-server

COPY --from=base /app/apps/log-server/src/db/migrations ./apps/log-server/dist/db/migrations

WORKDIR /app/apps/log-server
EXPOSE 5140 3002
CMD ["node", "dist/index.js"]
