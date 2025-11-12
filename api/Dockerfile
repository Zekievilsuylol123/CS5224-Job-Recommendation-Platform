# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

COPY api ./    
COPY tsconfig.base.json /tsconfig.base.json

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install; \
    fi

RUN pnpm build

# ---------- runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 8080
CMD ["node", "dist/server.js"]
