FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/log-server/package.json apps/log-server/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/log-server/ apps/log-server/
RUN pnpm --filter @inslab/shared build
RUN pnpm --filter log-server build

RUN pnpm --filter log-server deploy --prod --legacy /prod
RUN cp -r /app/apps/log-server/dist /prod/dist \
    && cp -r /app/packages/shared/dist /prod/node_modules/@inslab/shared/dist \
    && cp -r /app/apps/log-server/src/db/migrations /prod/dist/db/migrations

FROM node:20-slim
WORKDIR /app
COPY --from=base /prod .

EXPOSE 5140 3002
CMD ["node", "dist/index.js"]
