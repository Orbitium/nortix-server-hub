FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nortix/api... build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["pnpm", "--filter", "@nortix/api", "start"]
