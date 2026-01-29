FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/web-console/ apps/web-console/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inslab/shared build
RUN pnpm --filter web-console build

FROM node:20-slim
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared ./packages/shared
COPY --from=base /app/apps/web-console ./apps/web-console

WORKDIR /app/apps/web-console
EXPOSE 3000
CMD ["npx", "next", "start"]
