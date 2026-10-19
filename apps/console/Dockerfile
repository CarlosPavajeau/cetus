# Build from the repository root: docker build -f apps/console/Dockerfile .
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/console/package.json apps/console/
RUN pnpm install --frozen-lockfile --filter @cetus/console...
COPY apps/console apps/console
RUN pnpm --filter @cetus/console build

FROM node:22-slim
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app
WORKDIR /app/apps/console
ENV NODE_ENV=production
EXPOSE 3000
# Run "pnpm db:migrate" as Railway's pre-deploy command for this service.
CMD ["pnpm", "start"]
