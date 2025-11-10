# ---------- Common base ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && apk add --no-cache libc6-compat
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY api/package.json ./api/package.json

# ---------- Dev deps for building ----------
FROM base AS devdeps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm -w install --frozen-lockfile

# ---------- API build ----------
FROM devdeps AS api-build
WORKDIR /app
COPY api/ ./api/
COPY resources ./resources
COPY resources ./api/resources
COPY api/resources ./api/resources

RUN pnpm -C api run build

# ---------- API runtime ----------
FROM node:20-alpine AS api-prod
WORKDIR /app/api
ENV NODE_ENV=production

COPY --from=devdeps /app/node_modules /app/node_modules
COPY api/package.json ./package.json
COPY --from=api-build /app/api/dist ./dist
COPY api/resources ./resources

EXPOSE 8080
CMD ["node", "dist/index.js"]

# ---------- Web build ----------
FROM node:20-alpine AS web-build
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY web/package.json ./web/package.json

RUN pnpm --filter ./web... install --frozen-lockfile

COPY web ./web

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

RUN pnpm -C web run build

# ---------- Web runtime (nginx) ----------
FROM nginx:alpine AS web-prod
WORKDIR /usr/share/nginx/html
COPY --from=web-build /app/web/dist ./

# 这个 nginx.conf 里把 /api 反代到容器名 "api:8080"
# 若你本机单跑 web 容器、后端裸机 8080，请改为 host.docker.internal:8080
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80