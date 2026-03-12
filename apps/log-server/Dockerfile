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
RUN pnpm --filter @inslab/log-server build

RUN pnpm --filter @inslab/log-server deploy --prod --legacy /prod
RUN cp -r /app/apps/log-server/dist /prod/dist \
    && cp -r /app/packages/shared/dist /prod/node_modules/@inslab/shared/dist \
    && cp -r /app/apps/log-server/prisma /prod/prisma

FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=base /prod .

EXPOSE 5140 3002
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && node dist/main.js"]
