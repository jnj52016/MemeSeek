# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.11.0 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY client ./client
COPY server ./server

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter server exec prisma generate
RUN pnpm --filter server build
RUN pnpm --filter client build

FROM base AS server

WORKDIR /app/server

ENV NODE_ENV=production

# Keep the workspace node_modules layout because pnpm uses links from
# server/node_modules into the shared root .pnpm store.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server/node_modules /app/server/node_modules
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/prisma ./prisma
COPY --from=build /app/server/dist ./dist

RUN mkdir -p uploads/memes

EXPOSE 3000

# The migration is idempotent and runs before the API on every container start.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]

FROM nginx:1.27-alpine AS client

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
