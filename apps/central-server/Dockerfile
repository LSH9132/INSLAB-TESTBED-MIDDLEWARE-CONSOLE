FROM node:20-slim AS base
RUN corepack enable
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/central-server/package.json apps/central-server/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/central-server/ apps/central-server/
COPY clients/net-agent/ clients/net-agent/
RUN rm -f clients/net-agent/net-agent && make -B -C clients/net-agent
RUN pnpm --filter @inslab/shared build
RUN pnpm --filter central-server build

RUN pnpm --filter central-server deploy --prod --legacy /prod
RUN cp -r /app/apps/central-server/dist /prod/dist \
    && cp -r /app/packages/shared/dist /prod/node_modules/@inslab/shared/dist \
    && cp -r /app/apps/central-server/src/db/migrations /prod/dist/db/migrations \
    && mkdir -p /prod/net-agent-assets \
    && cp /app/clients/net-agent/net-agent /prod/net-agent-assets/net-agent \
    && cp /app/clients/net-agent/net-agent.service /prod/net-agent-assets/net-agent.service \
    && cp /app/clients/net-agent/net-agent.env.sample /prod/net-agent-assets/net-agent.env.sample

FROM node:20-slim
RUN apt-get update && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=base /prod .

EXPOSE 3001
CMD ["node", "dist/index.js"]
