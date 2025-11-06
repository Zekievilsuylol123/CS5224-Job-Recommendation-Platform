FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

# 复制根 config（★关键：补上 tsconfig.base.json）
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# 复制整个 api（保持你原结构）
COPY api ./api
COPY api/resources ./api/resources


# 安装依赖
RUN pnpm -C api install --frozen-lockfile

# 编译
RUN pnpm -C api build


# ---------- runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production

# 1) 先拷锁文件（★关键）
COPY pnpm-lock.yaml ./pnpm-lock.yaml
# （可选但推荐，避免 workspace 相关解析差异）
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml

# 2) 只拷 API 的 package.json（避免按根包安装）
COPY api/package.json ./api/package.json

# 3) 安装 API 的生产依赖（有锁文件就能 --frozen-lockfile）
RUN pnpm -C api install --prod --frozen-lockfile

# 4) 拷编译产物 & 运行时资源
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/resources ./api/resources

EXPOSE 8080
CMD ["node", "api/dist/index.js"]
