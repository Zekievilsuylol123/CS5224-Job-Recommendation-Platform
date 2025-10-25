FROM node:18-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY api/package.json api/package.json

RUN pnpm install --filter ./api... --prod=false

COPY api ./api

RUN pnpm --filter api build

FROM node:18-alpine AS runner
WORKDIR /app
RUN corepack enable

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/api/dist ./dist
COPY --from=base /app/api/package.json ./package.json

ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "dist/index.js"]
