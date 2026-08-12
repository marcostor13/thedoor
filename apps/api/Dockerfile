# Contexto de build: la raíz del repositorio (el monorepo comparte lockfile).
#   docker build -f apps/api/Dockerfile .

# --- Etapa 1: build ---------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --workspace @thedoor/api --include-workspace-root

COPY apps/api apps/api

RUN npm run build --workspace @thedoor/api

# --- Etapa 2: dependencias de producción ------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --omit=dev --workspace @thedoor/api --include-workspace-root \
  && npm cache clean --force \
  # npm iza casi todo a la raíz, así que apps/api/node_modules puede no
  # llegar a existir. Se crea vacío para que el COPY de la etapa siguiente
  # no falle.
  && mkdir -p /app/apps/api/node_modules

# --- Etapa 3: runtime -------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json

# El proceso no corre como root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
