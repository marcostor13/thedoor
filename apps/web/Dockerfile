# Contexto de build: la raíz del repositorio (el monorepo comparte lockfile).
#   docker build -f apps/web/Dockerfile .

# --- Etapa 1: build ---------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Se copian primero los manifiestos para que la capa de dependencias se
# reutilice mientras no cambien.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

RUN npm ci --workspace @thedoor/web --include-workspace-root

COPY apps/web apps/web

# Astro inyecta las PUBLIC_* en el bundle en tiempo de build, así que tienen
# que estar presentes aquí y no en runtime.
ARG PUBLIC_API_URL
ARG PUBLIC_SITE_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

RUN npm run build --workspace @thedoor/web

# --- Etapa 2: runtime -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
