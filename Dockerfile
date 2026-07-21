# =====================================================
# Stage 1 - Base
# =====================================================
FROM node:22-alpine AS base

#ENV NODE_ENV=production


WORKDIR /app

RUN apk add --no-cache libc6-compat

# =====================================================
# Stage 2 - Dependencies
# =====================================================
FROM base AS deps

COPY package*.json ./

#RUN npm ci
RUN npm ci --include=dev
# =====================================================
# Stage 3 - Builder
# =====================================================
FROM deps AS builder

COPY . .

RUN npm run build

# ÍÐÝ devDependencies
RUN npm prune --omit=dev

# =====================================================
# Stage 4 - Runner
# =====================================================
FROM node:22-alpine

ENV NODE_ENV=development

RUN apk add --no-cache ffmpeg

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder /app/i18n ./i18n

RUN mkdir -p /app/uploads && \
    chown node:node /app/uploads

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',res=>process.exit(res.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node","dist/main.js"]