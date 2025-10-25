FROM node:18-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY web/package.json web/package.json

RUN pnpm install --filter ./web... --prod=false

COPY web ./web

ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter web build

FROM nginx:1.25-alpine AS runner
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
