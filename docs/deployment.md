# Despliegue

```
Cloudflare DNS (thedoorpr.com)
  ├── thedoorpr.com       CNAME ─┐
  └── api.thedoorpr.com   CNAME ─┤  (proxy activado)
                                 ▼
              Cloudflare Tunnel acb6beb0-…
                                 │
                                 ▼
        Coolify (localcoolify.marcostorresalarcon.com)
          proyecto «The Door PR» · entorno production
          ├── thedoor-web  7uk0s7dxlcjxcwl0fyu3ezig · apps/web/Dockerfile · nginx :80
          └── thedoor-api  z8m1xhy5hsyddriyckngeynx · apps/api/Dockerfile · Bun :3000
                                 │
                                 ▼
                          MongoDB Atlas
```

**El servidor no está expuesto por IP pública.** Se anuncia en Cloudflare a
través de `cloudflared`, así que cada hostname es un **CNAME a
`<tunnel>.cfargotunnel.com` con el proxy activado** — obligatorio, porque ese
dominio solo resuelve desde el borde de Cloudflare. No hay registros A ni
`SERVER_IP`, y el TLS termina en Cloudflare (nada de desafíos HTTP de Let's
Encrypt contra el origen).

---

## Cómo funciona la entrega continua

Cada push a `main` dispara el workflow **Deploy**, que trabaja en tres tiempos:

1. **`changes`** — compara el commit anterior con el nuevo y decide qué hay que
   desplegar:

   | Qué cambió en el commit | Se despliega |
   |---|---|
   | `apps/web/**` | solo el frontend |
   | `apps/api/**` | solo el backend |
   | `package.json` o `bun.lock` de la raíz | los dos (entran en las dos imágenes) |
   | `docs/`, `README.md`, `scripts/`, `.github/` | nada |
   | primer push de la rama o *force-push* | los dos (no hay base con la que comparar) |

2. **`verify`** — instala, compila lo que se va a desplegar y pasa los tests. Si
   algo falla, Coolify no llega a tocar producción.

3. **`deploy-web` / `deploy-api`** — cada uno por su lado:
   comprueba credenciales y UUID → lanza el despliegue → **espera a que termine**
   → comprueba que el dominio responde (`/` en el frontend, `/health` con
   `database: up` en el backend). Si el despliegue falla en Coolify, el workflow
   sale en rojo.

Para desplegar a mano: pestaña **Actions → Deploy → Run workflow**, eligiendo
`web`, `api`, `all` o `auto`.

> **Importante:** las dos aplicaciones deben tener el **auto-deploy por webhook
> DESACTIVADO** en Coolify. Si está activo, Coolify despliega por su cuenta en
> cada push y se salta la verificación de build de este workflow.

El workflow **CI** cubre las demás ramas y los pull requests; no corre en `main`
para no repetir el mismo build que ya hace Deploy.

---

## 1. Antes de empezar

Copia `.env.example` a `.env` y rellena los valores. `.env` está en
`.gitignore` y no debe salir nunca de tu máquina.

Variables que hay que conseguir a mano, porque no salen de ningún sitio
automáticamente:

| Variable | De dónde sale | Para qué |
|---|---|---|
| `CLOUDFLARE_TUNNEL_ID` | Cloudflare Zero Trust, o el CNAME de cualquier app ya publicada | destino de los CNAME |
| `COOLIFY_WEB_UUID` | `bun run deploy -- --list` | disparar el despliegue del frontend |
| `COOLIFY_API_UUID` | `bun run deploy -- --list` | disparar el despliegue del backend |

`COOLIFY_PROJECT_UUID`, `COOLIFY_SERVER_UUID` y `COOLIFY_ENVIRONMENT` no los lee
ningún script: hacen falta para crear las aplicaciones. `SERVER_IP` solo se usa
si algún día se publica contra una IP en vez de por el túnel.

---

## 2. DNS en Cloudflare

```bash
bun scripts/cloudflare-dns.mjs --dry-run   # revisar qué haría
bun scripts/cloudflare-dns.mjs             # aplicarlo
```

Crea los CNAME de ambos dominios apuntando al túnel, de forma idempotente:
si ya existen con el valor correcto no toca nada, y si existe un registro A de
un modelo anterior lo convierte.

Los registros van **con proxy** (nube naranja). No es opcional:
`cfargotunnel.com` solo resuelve desde el borde de Cloudflare.

> Añadir el CNAME basta mientras el túnel tenga una regla de entrada
> *catch-all* hacia el proxy de Coolify — que es como está montado: 18
> hostnames distintos cuelgan del mismo túnel. Si algún día se pasa a reglas
> por hostname, habrá que declarar el nuevo dominio también en Zero Trust.

---

## 3. Las aplicaciones en Coolify

**Ya están creadas** — proyecto «The Door PR» (`hy2pewtfg61eateye69h5uwi`),
entorno `production`, servidor `localhost` (`n82fxzt2v9zw439me11df2b4`). Esta
sección queda como registro de su configuración y como guía si hay que
rehacerlas.

Se crearon con `POST /api/v1/applications/public` (el repositorio es público,
así que no hace falta fuente privada) y `instant_deploy: false`, para poder
dejar las variables puestas antes del primer build.

### Aplicación `thedoor-web`

| Campo | Valor |
|---|---|
| Tipo | Dockerfile |
| Repositorio | `marcostor13/thedoor`, rama `main` |
| Base directory | `/` (la raíz: el monorepo comparte lockfile) |
| Dockerfile | `apps/web/Dockerfile` |
| Puerto expuesto | `80` |
| Dominio | `https://thedoorpr.com` |
| Auto deploy | **desactivado** (lo dispara GitHub Actions) |
| UUID | `7uk0s7dxlcjxcwl0fyu3ezig` |

Build arguments — Astro incrusta las `PUBLIC_*` en el bundle en tiempo de
build, así que tienen que ir aquí y no como variables de runtime:

```
PUBLIC_API_URL=https://api.thedoorpr.com
PUBLIC_SITE_URL=https://thedoorpr.com
```

### Aplicación `thedoor-api`

| Campo | Valor |
|---|---|
| Tipo | Dockerfile |
| Repositorio | `marcostor13/thedoor`, rama `main` |
| Base directory | `/` |
| Dockerfile | `apps/api/Dockerfile` |
| Puerto expuesto | `3000` |
| Dominio | `https://api.thedoorpr.com` |
| Health check | `/health` |
| Auto deploy | **desactivado** |
| UUID | `z8m1xhy5hsyddriyckngeynx` |

Variables de entorno (runtime):

```
NODE_ENV=production
PORT=3000
MONGO_URI=<cadena de conexión de Atlas>
CORS_ORIGINS=https://thedoorpr.com
JWT_SECRET=<openssl rand -base64 48>

# Correo de confirmación de alta. Opcional: sin MAIL_HOST ni MAIL_FROM la API
# arranca igual y sigue registrando, solo que sin confirmar nada por correo.
MAIL_HOST=<smtp del proveedor>
MAIL_PORT=587
MAIL_USER=<usuario smtp>
MAIL_PASSWORD=<contraseña o app password>
MAIL_FROM=The Door PR <hola@thedoorpr.com>
SITE_URL=https://thedoorpr.com
```

El dominio de `MAIL_FROM` necesita **SPF y DKIM** publicados en Cloudflare, y
conviene añadir DMARC. Sin eso el correo sale, pero Gmail y Outlook lo mandan a
spam: para un correo que la gente está esperando, eso es lo mismo que no
enviarlo. Los registros exactos los da el proveedor de SMTP.

La imagen del correo se sirve desde el frontend (`/email/door.png`), así que
`SITE_URL` tiene que apuntar al sitio publicado, no a la API.

Ojo con las variables de build: en esta versión de la API el campo se llama
`is_buildtime` (sin guion bajo entre *build* y *time*). `is_build_time` da un
422 «This field is not allowed».

Para recoger las UUID y comprobar que todo cuadra antes de desplegar nada:

```bash
bun run deploy -- --list
bun run deploy -- --check
```

---

## 4. MongoDB Atlas

Añade la IP del servidor de Coolify a la **IP Access List** del clúster. Sin
eso la API arranca pero no conecta: `/health` devuelve `database: down` y el
paso de comprobación del workflow falla a propósito, para que no se quede un
despliegue en verde con la base de datos caída.

El usuario de base de datos debería tener permisos solo sobre la base `thedoor`,
no sobre el clúster entero.

---

## 5. Secretos y variables de GitHub Actions

**Ya están puestos.** Quedan documentados por si hay que rehacerlos.

En **Settings → Secrets and variables → Actions**, pestaña *Secrets*:

| Secreto | Para qué |
|---|---|
| `COOLIFY_URL` | Base de la API de Coolify |
| `COOLIFY_TOKEN` | Token de la API (con permiso de escritura sobre el equipo) |
| `COOLIFY_WEB_UUID` | Aplicación del frontend |
| `COOLIFY_API_UUID` | Aplicación del backend |

Y en la pestaña *Variables* (no son secretos: acaban en el bundle del
navegador). **Tienen que ser variables del repositorio, no del entorno
`production`**: el job de verificación compila sin entorno y se quedaría sin
ellas.

| Variable | Valor |
|---|---|
| `PUBLIC_API_URL` | `https://api.thedoorpr.com` |
| `PUBLIC_SITE_URL` | `https://thedoorpr.com` |

Los jobs de despliegue usan el entorno `production`. Si le pones revisores
obligatorios, cada despliegue esperará aprobación — que es justo lo que quieres
si prefieres una puerta manual delante de producción.

> **La rama por defecto del repositorio no es `main`**, sino
> `claude/redesign-astro-nestjs-hafu2o`. El workflow escucha en `main`, que
> existe y funciona, pero si fusionas los pull requests contra la rama por
> defecto no se desplegará nada. Conviene poner `main` como rama por defecto en
> Settings → General.
>
> En los secretos del repositorio queda además uno antiguo llamado `DEPLOY`,
> anterior a esta configuración. Ya no lo usa ningún workflow y contiene
> credenciales viejas: bórralo.

---

## 6. Comandos útiles

```bash
bun run deploy -- --list                    # UUID de proyectos, servidores y apps
bun run deploy -- --check                   # credenciales + UUID, sin desplegar
bun run deploy -- --deploy --target web     # desplegar solo el frontend
bun run deploy -- --deploy --target api     # desplegar solo el backend
bun run deploy -- --deploy --target all     # los dos
bun run deploy -- --deploy --target api --no-wait   # lanzar y salir
```

Por defecto el script **espera** a que Coolify termine (hasta 15 minutos) y
sale con error si el despliegue falla.

---

## 7. Rotación de credenciales

Las credenciales de la variable `deploy` se compartieron por chat durante el
desarrollo. Conviene rotarlas todas:

- **PAT de GitHub** — Settings → Developer settings → Personal access tokens.
  Al rotarlo, actualiza también la fuente de GitHub en Coolify.
- **Token de Coolify** — Keys & Tokens → API tokens. Actualiza el secreto de
  Actions y el `.env`.
- **Token de Cloudflare** — My Profile → API Tokens.
- **Usuario de MongoDB Atlas** — Database Access → Edit → Edit Password.
  Actualiza `MONGO_URI` en las variables de la aplicación en Coolify.
- **`JWT_SECRET`** — todavía no lo usa ningún módulo, pero el valor actual es
  demasiado corto para firmar nada. Genera uno de verdad antes de montar el
  panel de administración: `openssl rand -base64 48`.

Ninguna de ellas está en el repositorio, y `.gitignore` cubre `.env` para que
siga siendo así.
