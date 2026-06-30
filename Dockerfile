# syntax=docker/dockerfile:1.7

###############################################
# Base Image
###############################################
FROM node:22-bookworm-slim AS base

WORKDIR /app

###############################################
# Dependencies
###############################################
FROM base AS deps

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

###############################################
# Builder
###############################################
FROM deps AS builder

COPY . .

RUN npm run build

###############################################
# Production Dependencies
###############################################
FROM base AS production-deps

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

###############################################
# Runner
###############################################
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN mkdir -p uploads

RUN groupadd -r nodejs && \
    useradd -r -g nodejs nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini","--"]

CMD ["node","dist/main.js"]