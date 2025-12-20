# syntax=docker/dockerfile:1.7

FROM node:22-bookworm AS build

ARG RUST_VERSION=1.87.0
ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/.cargo/bin:${PATH}"

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  python3 \
  make \
  g++ \
  pkg-config \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain "${RUST_VERSION}"

WORKDIR /repo

COPY . .

RUN corepack enable || true

RUN yarn install --immutable

RUN yarn workspace @affine/server-native build

RUN yarn affine @affine/web build && \
  yarn affine @affine/admin build && \
  yarn affine @affine/mobile build

RUN yarn workspace @affine/reader build && \
  yarn workspace @affine/server build

RUN yarn workspaces focus @affine/server --production && \
  yarn workspace @affine/server prisma generate && \
  mv ./node_modules ./packages/backend/server/node_modules

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl libjemalloc2 && \
  rm -rf /var/lib/apt/lists/*

ENV LD_PRELOAD=libjemalloc.so.2

COPY --from=build /repo/packages/backend/server /app
COPY --from=build /repo/packages/frontend/apps/web/dist /app/static
COPY --from=build /repo/packages/frontend/admin/dist /app/static/admin
COPY --from=build /repo/packages/frontend/apps/mobile/dist /app/static/mobile

CMD ["node", "./dist/main.js"]

