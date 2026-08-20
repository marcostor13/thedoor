# Contexto de build: la raíz del repositorio (el monorepo comparte lockfile).
#   docker build -f apps/api/Dockerfile .

# --- Etapa 1: build ---------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Se copian primero los manifiestos para que la capa de dependencias se
# reutilice mientras no cambien. Bun valida el lockfile contra TODOS los
# workspaces, así que hacen falta los dos package.json aunque solo se compile
# la API.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN bun install --frozen-lockfile --filter @thedoor/api

COPY apps/api apps/api

# Se compila con `nest build` (tsc), no con el bundler de Bun: Nest resuelve las
# dependencias a partir de los metadatos de `emitDecoratorMetadata` y tsc es la
# referencia para emitirlos. El script lleva `--bun` porque el binario de Nest
# trae shebang `#!/usr/bin/env node` y esta imagen no incluye node.
RUN bun run build:api

# --- Etapa 2: dependencias de producción ------------------------------------
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN bun install --frozen-lockfile --production --filter @thedoor/api \
  # Con el linker aislado, apps/api/node_modules son enlaces relativos al store
  # de /app/node_modules/.bun; el COPY de la etapa siguiente mantiene esa misma
  # ruta, así que siguen resolviendo. Se crea vacío por si no llega a existir.
  && mkdir -p /app/apps/api/node_modules

# --- Etapa 3: runtime -------------------------------------------------------
FROM oven/bun:1-alpine AS runtime

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json

# El proceso no corre como root (la imagen de Bun trae este usuario).
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "dist/main.js"]
