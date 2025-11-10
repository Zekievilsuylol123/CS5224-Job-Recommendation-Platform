# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && apk add --no-cache libc6-compat

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY api/package.json ./api/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm -w install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
WORKDIR /app

COPY api ./api
COPY api/resources ./api/resources

RUN pnpm -C api run build

# ---------- runtime ----------
FROM node:20-alpine AS prod
WORKDIR /app/api
ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY api/package.json ./package.json
COPY --from=build /app/api/dist ./dist
COPY api/resources ./resources

EXPOSE 8080
CMD ["node", "dist/index.js"]
