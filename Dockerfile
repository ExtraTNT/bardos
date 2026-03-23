# -----------------------------
# Frontend build stage (Node)
# -----------------------------
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY src ./src
COPY lib ./lib
COPY build.js ./
RUN npm run build

# -----------------------------
# Backend build stage (Haskell)
# -----------------------------
FROM haskell:9.6.7 AS backend-build
WORKDIR /app/backend

COPY backend/src ./src
COPY backend/lib ./lib
COPY backend/bardosBackend.cabal .
RUN cabal update && \
    cabal build exe:bardosBackend && \
    cp "$(cabal list-bin exe:bardosBackend)" /tmp/bardosBackend

# -----------------------------
# Runtime stage
# -----------------------------
FROM haskell:9.6.7
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Runtime binary
COPY --from=backend-build /tmp/bardosBackend /app/bardosBackend

# Frontend static assets
COPY --from=frontend-build /app/dist /app/dist

# Content roots consumed by backend API
COPY backend/pages /app/pages
COPY backend/images /app/images

EXPOSE 3443

# Serve dist over HTTPS with pages/images API folders.
CMD ["/app/bardosBackend", "dist", "--pages", "pages", "--images", "images", "--port", "3443"]
