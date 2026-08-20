# Contexto de build: la raíz del repositorio (el monorepo comparte lockfile).
#   docker build -f apps/web/Dockerfile .

# --- Etapa 1: build ---------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Se copian primero los manifiestos para que la capa de dependencias se
# reutilice mientras no cambien. Bun valida el lockfile contra TODOS los
# workspaces, así que hacen falta los dos package.json aunque solo se compile
# el frontend.
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

RUN bun install --frozen-lockfile --filter @thedoor/web

COPY apps/web apps/web

# Astro inyecta las PUBLIC_* en el bundle en tiempo de build, así que tienen
# que estar presentes aquí y no en runtime.
ARG PUBLIC_API_URL
ARG PUBLIC_SITE_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

RUN bun run build:web

# --- Etapa 2: runtime -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
