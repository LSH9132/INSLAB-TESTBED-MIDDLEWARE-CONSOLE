FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/log-server/ apps/log-server/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inslab/shared build
RUN pnpm --filter log-server build

FROM node:20-slim
WORKDIR /app
COPY --from=base /app/apps/log-server/dist ./dist
COPY --from=base /app/apps/log-server/package.json ./
COPY --from=base /app/apps/log-server/src/db/migrations ./dist/db/migrations
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./node_modules/@inslab/shared/dist

EXPOSE 5140 3002
CMD ["node", "dist/index.js"]
