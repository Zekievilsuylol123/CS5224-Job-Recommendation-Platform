# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

COPY web/package.json ./
RUN pnpm install

# 拷源码
COPY web ./

# ★ 关键：把仓库根的 tsconfig.base.json 放到容器根（对应 "../"）
COPY tsconfig.base.json /tsconfig.base.json

# 构建所需变量
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN pnpm build

# ---------- prod ----------
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
