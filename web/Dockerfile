# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

# 1) 根 workspace 元信息 + 锁文件 + ★把 tsconfig.base.json 也带上
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
# 如果你还有别的根级 tsconfig（比如 tsconfig.paths.json），也一起带上更保险：
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig*.json ./

# 2) 先把 web 包完整拷进去（安装前）
COPY web ./web

# 3) 只为 web 子包安装依赖（含 devDeps，确保 vite 存在）
RUN pnpm i --filter ./web... --frozen-lockfile

# 4) 构建（此时 /app/tsconfig.base.json 存在，web/tsconfig.json 的 ../ 能解析到它）
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm -C web build

# 保险：确认 dist 存在，否则打印目录树并失败
RUN test -d /app/web/dist || (echo "dist not found; tree:" && ls -R /app && exit 1)

# ---------- serve ----------
FROM nginx:1.25-alpine AS runner
# 如需 SPA 刷新 fallback，可自带 nginx.conf：
# COPY web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
