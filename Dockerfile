# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pin pnpm to the lockfile toolchain (9.2.x) and copy .npmrc so frozen install settings match
RUN corepack enable \
  && corepack prepare pnpm@9.2.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY tsconfig.json tsconfig.base.json load-env.mjs ./
RUN pnpm --version && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NODE_ENV=production
ENV BASE_PATH=/admin/
ENV PORT=8080
RUN pnpm --filter @workspace/api-server run build \
  && pnpm --filter @workspace/admin run build

FROM node:24-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx curl \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/lib ./lib
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/load-env.mjs ./load-env.mjs
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/admin/dist/public /usr/share/nginx/html/admin
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/wait-for-db.mjs ./docker/wait-for-db.mjs
COPY docker/run-drizzle.mjs ./docker/run-drizzle.mjs
COPY docker/run-seed.mjs ./docker/run-seed.mjs
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
