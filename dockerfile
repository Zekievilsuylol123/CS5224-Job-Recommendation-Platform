# syntax=docker/dockerfile:1.7

# ===== base =====
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack use pnpm@10.21.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# ===== deps: 预拉依赖到 pnpm store（不生成产物）=====
FROM base AS deps
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
# 仅做解析与下载，缓存到 /pnpm/store，中途不需要源码
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm -w fetch --frozen-lockfile

# ===== api-build =====
FROM base AS api-build
# 先把 deps 阶段缓存过来的 store 接入
COPY --from=deps /pnpm/store /pnpm/store
# 再拷贝源码（这一步会覆盖 /app/api 目录的任何旧内容）
COPY api ./api

# 在 api 包里重新链接依赖（使用已缓存的 store，很快）
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm -w --filter ./api install --frozen-lockfile

# 正式构建
RUN pnpm -w --filter ./api build

# ===== api-prod-deps: 仅生产依赖 =====
FROM base AS api-prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json
# 只装生产依赖（用缓存的 store）
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm -w --filter ./api --prod install --frozen-lockfile

# ===== api-prod =====
FROM node:20-alpine AS api-prod
WORKDIR /app
ENV NODE_ENV=production
# 根层依赖（若有共享依赖）
COPY --from=api-prod-deps /app/node_modules ./node_modules
# 包定义与产物
COPY package.json pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json
COPY --from=api-build /app/api/dist ./api/dist

EXPOSE 8080
CMD ["node", "api/dist/index.js"]
