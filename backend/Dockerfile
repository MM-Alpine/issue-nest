# IssueHub API — production image.
#
# Multi-stage so the runtime layer carries no compiler, tests or dev tooling:
#   build   → full deps, `prisma generate`, `tsc` → dist/
#   runtime → prod deps only + the generated Prisma client + dist/
#
# `openssl` is required by Prisma's query engine on debian-slim.
# Migrations run at container start (see CMD) so a deploy can never serve a
# schema the code does not expect.

FROM node:20-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- build ----------
FROM base AS build
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
  && npx prisma generate \
  && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 4000

# Railway injects PORT; env.ts defaults to 4000 when it is absent.
#
# The server only serves — it does not migrate. Railway runs migrations as a
# pre-deploy step (see railway.json) because a start command is argv-split, not
# shell-interpreted, so a `migrate && start` chain silently degrades into
# arguments passed to prisma and the server never boots. Pre-deploy also runs the
# migration once per deployment instead of once per replica restart.
CMD ["node", "dist/server.js"]
