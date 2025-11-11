# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY web/package.json ./web/package.json
RUN pnpm --filter ./web... install --frozen-lockfile

ARG VITE_API_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

COPY web/ ./web/
RUN pnpm -C web run build

# ---------- runtime (nginx) ----------
FROM nginx:alpine AS prod
WORKDIR /usr/share/nginx/html

COPY --from=build /app/web/dist ./

COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
