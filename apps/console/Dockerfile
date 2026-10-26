# Build from the repository root: docker build -f apps/console/Dockerfile .
FROM node:24.22.1-slim AS build
COPY infra/security/update-trust.sh /usr/local/bin/cetus-update-trust
RUN sh /usr/local/bin/cetus-update-trust
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/console/package.json apps/console/
RUN pnpm install --frozen-lockfile --filter @cetus/console...
COPY apps/console apps/console
# Railway passes the service's variables of these names: the browser's DSN and the release are fixed in the
# bundle, and the token uploads the source maps to Sentry. The runtime stage keeps none of them.
ARG VITE_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG CETUS_COMMIT_SHA
RUN pnpm --filter @cetus/console build

FROM node:24.22.1-slim
COPY infra/security/update-trust.sh /usr/local/bin/cetus-update-trust
RUN sh /usr/local/bin/cetus-update-trust
WORKDIR /app
RUN corepack enable
COPY --from=build --chown=node:node /app /app
COPY --from=build --chown=node:node /root/.cache/node/corepack /home/node/.cache/node/corepack
WORKDIR /app/apps/console
ENV NODE_ENV=production
ENV COREPACK_HOME=/home/node/.cache/node/corepack
USER node
EXPOSE 3000
# Run "pnpm db:migrate" as Railway's pre-deploy command for this service.
CMD ["pnpm", "start"]
