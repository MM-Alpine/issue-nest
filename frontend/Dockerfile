# IssueHub web — production image.
#
# Vite compiles to static assets, so the runtime is a static file server (Caddy)
# rather than Node: smaller surface, gzip/zstd, correct SPA fallback for React
# Router deep links (/projects/:id reloaded directly must still serve index.html).
#
# VITE_API_URL is baked in at BUILD time — Vite inlines import.meta.env. Railway
# passes service variables to Docker builds as build args, hence the ARG below.
# Changing the API URL therefore requires a rebuild, not just a restart.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
