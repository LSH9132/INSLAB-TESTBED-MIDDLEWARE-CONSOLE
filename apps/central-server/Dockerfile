FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/central-server/ apps/central-server/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inslab/shared build
RUN pnpm --filter central-server build

FROM node:20-slim
WORKDIR /app
COPY --from=base /app/apps/central-server/dist ./dist
COPY --from=base /app/apps/central-server/package.json ./
COPY --from=base /app/apps/central-server/src/db/migrations ./dist/db/migrations
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./node_modules/@inslab/shared/dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
