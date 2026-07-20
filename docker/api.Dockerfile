# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS dependencies
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/integrations/package.json packages/integrations/package.json
COPY packages/plugin-sdk/package.json packages/plugin-sdk/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN --mount=type=cache,id=nortix-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm --filter @nortix/api... build
RUN --mount=type=cache,id=nortix-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm config set store-dir /pnpm/store && \
    pnpm --filter @nortix/api deploy --prod --legacy /prod/api && \
    cd /prod/api && \
    ./node_modules/.bin/prisma generate \
      --schema node_modules/@nortix/database/prisma/schema.prisma && \
    node --input-type=module -e "await import('@nortix/database')"

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /prod/api ./
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/apps/api/src/server.js"]
