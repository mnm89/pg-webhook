# -------------------------------------
# 🔧 Shared base for installing dependencies
# -------------------------------------
FROM node:24.3.0-alpine3.22 AS base
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-setuptools \
    make \
    g++ \
    bash
ENV PYTHON=/usr/bin/python3
WORKDIR /app
# Copy only package manager files (to cache install step)
COPY package-lock.json package.json ./
# Install all deps (cached unless any package.json/lockfile changes)
RUN npm install --frozen-lockfile



# -------------------------------------
# 🛠 Build NestJS App
# -------------------------------------
FROM base AS builder
WORKDIR /app
# Copy src and build config files to avoid breaking cache
COPY . .
# Build Nest app
RUN npm run build


# -------------------------------------
# 🚀 Final NestJS Runtime Image
# -------------------------------------
FROM node:24.3.0-alpine3.22
LABEL org.opencontainers.image.title="pg-event-listener"
LABEL org.opencontainers.image.description="Postgres data change listener"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/mnm89/pg-webhook"
LABEL org.opencontainers.image.maintainer="https://github.com/mnm89"

WORKDIR /app

# Copy build artifacts and prune only production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/package-lock.json ./

RUN npm i --omit dev
ENV NODE_ENV production

EXPOSE 3000
CMD ["npm", "run", "start:prod"]