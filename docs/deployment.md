# Despliegue

Arquitectura deducida de la variable `deploy` del repositorio:

```
Cloudflare DNS (marcostorresalarcon.com)
  ├── thedoor.marcostorresalarcon.com      → frontend Astro
  └── apithedoor.marcostorresalarcon.com   → backend NestJS
                    │
                    ▼
        Coolify (localcoolify.marcostorresalarcon.com)
          ├── thedoor-web  · Dockerfile apps/web/Dockerfile · nginx
          └── thedoor-api  · Dockerfile apps/api/Dockerfile · Node 22
                    │
                    ▼
              MongoDB Atlas
```

> **Estado:** los scripts de este directorio **no han podido ejecutarse contra
> la infraestructura real**. La política de egress de la sesión en la que se
> escribieron bloquea `api.cloudflare.com` y el host de Coolify, así que la
> primera ejecución hay que hacerla con `--dry-run` / `--list` delante y
> verificar la salida.

---

## 1. Antes de empezar

Copia `.env.example` a `.env` y rellena los valores. `.env` está en
`.gitignore` y no debe salir nunca de tu máquina.

Falta un dato que no venía en la variable `deploy`: **`SERVER_IP`**, la IPv4
pública del servidor donde corre Coolify. Es el destino de los registros A. Se
saca del panel de Coolify, en la ficha del servidor.

---

## 2. DNS en Cloudflare

```bash
node scripts/cloudflare-dns.mjs --dry-run   # revisar qué haría
node scripts/cloudflare-dns.mjs             # aplicarlo
```

Crea los registros A de ambos dominios apuntando a `SERVER_IP`, de forma
idempotente.

Los registros se crean **sin proxy** (nube gris). Es intencionado: Coolify
emite los certificados con Let's Encrypt mediante un desafío HTTP, que el
proxy naranja de Cloudflare interrumpiría. Una vez emitido el certificado,
puedes activar el proxy si te interesa.

---

## 3. Crear las aplicaciones en Coolify

Solo hace falta una vez. Se hace desde la interfaz porque el endpoint de
creación de la API cambia de forma entre versiones de Coolify y no compensa
automatizarlo para una operación única.

Primero, conecta el repositorio: en Coolify, **Sources → GitHub**, usando el
PAT del `.env` (necesita scope `repo`).

### Aplicación `thedoor-web`

| Campo | Valor |
|---|---|
| Tipo | Dockerfile |
| Repositorio | `marcostor13/thedoor`, rama `main` |
| Base directory | `/` (la raíz: el monorepo comparte lockfile) |
| Dockerfile | `apps/web/Dockerfile` |
| Puerto expuesto | `80` |
| Dominio | `https://thedoor.marcostorresalarcon.com` |

Build arguments — Astro incrusta las `PUBLIC_*` en el bundle en tiempo de
build, así que tienen que ir aquí y no como variables de runtime:

```
PUBLIC_API_URL=https://apithedoor.marcostorresalarcon.com
PUBLIC_SITE_URL=https://thedoor.marcostorresalarcon.com
```

### Aplicación `thedoor-api`

| Campo | Valor |
|---|---|
| Tipo | Dockerfile |
| Repositorio | `marcostor13/thedoor`, rama `main` |
| Base directory | `/` |
| Dockerfile | `apps/api/Dockerfile` |
| Puerto expuesto | `3000` |
| Dominio | `https://apithedoor.marcostorresalarcon.com` |
| Health check | `/health` |

Variables de entorno (runtime):

```
NODE_ENV=production
PORT=3000
MONGO_URI=<cadena de conexión de Atlas>
CORS_ORIGINS=https://thedoor.marcostorresalarcon.com
JWT_SECRET=<openssl rand -base64 48>
```

Cuando estén creadas, recoge sus UUID:

```bash
node scripts/deploy.mjs --list
```

y guárdalas como `COOLIFY_WEB_UUID` y `COOLIFY_API_UUID`.

---

## 4. MongoDB Atlas

Añade la IP del servidor de Coolify a la **IP Access List** del clúster. Sin
eso la API arranca pero no conecta, y `/health` devuelve `database: down`.

El usuario de base de datos debería tener permisos solo sobre la base `thedoor`,
no sobre el clúster entero.

---

## 5. Secretos de GitHub Actions

En **Settings → Secrets and variables → Actions**:

| Secreto | Para qué |
|---|---|
| `COOLIFY_URL` | Base de la API de Coolify |
| `COOLIFY_TOKEN` | Token de la API |
| `COOLIFY_WEB_UUID` | Aplicación del frontend |
| `COOLIFY_API_UUID` | Aplicación del backend |

Y como *variables* (no son secretos, acaban en el bundle del navegador):

| Variable | Valor |
|---|---|
| `PUBLIC_API_URL` | `https://apithedoor.marcostorresalarcon.com` |
| `PUBLIC_SITE_URL` | `https://thedoor.marcostorresalarcon.com` |

Con eso, cada push a `main` compila y, si el build pasa, dispara el despliegue
de ambas aplicaciones.

---

## 6. Rotación de credenciales

Las credenciales de la variable `deploy` se compartieron por chat durante el
desarrollo. Conviene rotarlas todas:

- **PAT de GitHub** — Settings → Developer settings → Personal access tokens.
  Al rotarlo, actualiza también la fuente de GitHub en Coolify.
- **Token de Coolify** — Keys & Tokens → API tokens. Actualiza el secreto de
  Actions.
- **Token de Cloudflare** — My Profile → API Tokens.
- **Usuario de MongoDB Atlas** — Database Access → Edit → Edit Password.
  Actualiza `MONGO_URI` en las variables de la aplicación en Coolify.

Ninguna de ellas está en el repositorio, y `.gitignore` cubre `.env` para que
siga siendo así.
