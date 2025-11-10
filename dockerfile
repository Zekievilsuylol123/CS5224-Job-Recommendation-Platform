# ===== 0) 基础层：共用工具与清单 =====
FROM node:20-alpine AS base
WORKDIR /app
# corepack 管理 pnpm；libc6-compat 解决部分原生依赖对 glibc 的需求
RUN corepack enable && apk add --no-cache libc6-compat

# 仅拷贝安装所需的清单文件（提高缓存命中）
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY api/package.json ./api/package.json

# ===== 1) devdeps：安装完整依赖（含 devDeps）用于编译 =====
FROM base AS devdeps
# 可选：缓存 pnpm store 来加速
# --mount 要求 buildkit，Docker Desktop 默认已开启
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm -w install --frozen-lockfile

# 保险起见，确保 tsc 与 Node 类型在工作区已安装（若已在锁文件里会是 no-op）
RUN pnpm -w add -D typescript @types/node

# ===== 2) api-build：拷贝源码并编译 =====
FROM devdeps AS api-build
# 只在这一层拷贝源码，避免破坏前面安装缓存
COPY api/ ./api/
# 在 api 子包执行构建脚本（会使用 /app/node_modules/.bin/tsc）
RUN pnpm -C api run build

# ===== 3) api-prod-deps：仅安装生产依赖 =====
FROM base AS api-prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm -w install --prod --frozen-lockfile

# ===== 4) 运行层：最小化产物 =====
FROM node:20-alpine AS api-prod
WORKDIR /app/api
ENV NODE_ENV=production

# 复制工作区根的生产依赖（注意是 /app/node_modules，而不是 /app/api/node_modules）
COPY --from=api-prod-deps /app/node_modules /app/node_modules

# 复制清单文件（工作区根 + 子包清单）
COPY package.json /app/package.json
COPY api/package.json ./package.json

# 复制已编译产物
COPY --from=api-build /app/api/dist ./dist

EXPOSE 8080
CMD ["node", "/app/api/dist/index.js"]

# ---------- Frontend Build ----------
FROM node:20-alpine AS web-build
WORKDIR /app
RUN corepack enable
# 用根锁文件安装，仅安装 web 子包依赖
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/package.json
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

RUN pnpm -w install --frozen-lockfile
RUN pnpm -w install --filter ./web... --frozen-lockfile

# 进入 web 再构建
WORKDIR /app
COPY web/ ./web/

# 如果需要注入 Vite 变量（构建时生效），在这里传入
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm -C web run build
COPY web ./web
WORKDIR /app/web
RUN pnpm run build

COPY web/ .
RUN pnpm run build

# ---------- Frontend Nginx Runtime ----------
FROM nginx:alpine AS web-prod
WORKDIR /usr/share/nginx/html
COPY --from=web-build /app/web/dist .
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
