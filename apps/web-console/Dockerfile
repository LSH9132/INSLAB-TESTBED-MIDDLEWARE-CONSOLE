FROM node:20-slim AS base
RUN corepack enable

ARG NEXT_PUBLIC_CENTRAL_SERVER_URL

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web-console/package.json apps/web-console/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/web-console/ apps/web-console/

# Create .env.local with NEXT_PUBLIC variables for client-side
RUN echo "NEXT_PUBLIC_CENTRAL_SERVER_URL=${NEXT_PUBLIC_CENTRAL_SERVER_URL:-http://central-server:3001}" > apps/web-console/.env.local

RUN pnpm --filter @inslab/shared build
RUN pnpm --filter web-console build

FROM node:20-slim
WORKDIR /app

# Copy the standalone output (includes node_modules and server files)
COPY --from=base /app/apps/web-console/.next/standalone ./

# Copy static assets to the correct location within standalone structure
COPY --from=base /app/apps/web-console/.next/static ./apps/web-console/.next/static

# Copy public folder if exists
COPY --from=base /app/apps/web-console/public ./apps/web-console/public

# Copy custom server
COPY --from=base /app/apps/web-console/custom-server.js ./apps/web-console/custom-server.js

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
WORKDIR /app/apps/web-console
CMD ["node", "custom-server.js"]
