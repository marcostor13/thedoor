# The Door

Rediseño del sitio de The Door: frontend en **Astro**, backend en **NestJS**,
desplegado en **Coolify** con DNS en **Cloudflare** y datos en **MongoDB Atlas**.

- Plan de trabajo y estado: [`PLAN.md`](./PLAN.md)
- Procedimiento de despliegue: [`docs/deployment.md`](./docs/deployment.md)

---

## ⚠️ Estado del diseño

**La línea gráfica de este repositorio es provisional y no se corresponde con
la de The Door.**

El sitio de referencia (`thedoor-pr.netlify.app`) está bloqueado por la política
de egress del entorno de desarrollo, así que no se ha podido extraer nada del
diseño original: ni tipografías, ni escalas, ni paleta, ni el logo, ni la
animación de entrada. Lo que hay en su lugar es un andamiaje neutro que existe
para validar la estructura, y está marcado como tal en el código:

| Archivo | Qué falta |
|---|---|
| `apps/web/src/styles/tokens.css` | Tipografías, escala, paleta y espaciado reales |
| `apps/web/src/components/Logo.astro` | El logo original |
| `apps/web/src/components/Intro.astro` | La animación de entrada original |
| `apps/web/src/data/navigation.ts` | La estructura real de secciones |
| `apps/web/src/pages/index.astro` | Los textos reales |

Para desbloquearlo hay que añadir `thedoor-pr.netlify.app` a los dominios
permitidos del entorno. Todo el CSS consume custom properties y nunca valores
literales, así que al poblar `tokens.css` con los valores reales la línea
gráfica correcta se propaga a todo el sitio sin tocar los componentes.

---

## Estructura

```
apps/
  web/    Astro — sitio público (estático, nginx en producción)
  api/    NestJS — API REST, Mongoose sobre MongoDB Atlas
scripts/  Aprovisionamiento de DNS y despliegue en Coolify
docs/     Documentación de operaciones
```

## Requisitos

- Node.js 22 o superior
- Una instancia de MongoDB accesible (Atlas o local) para el backend

## Puesta en marcha

```bash
npm install
cp .env.example .env    # y rellenar los valores
```

```bash
npm run dev             # frontend y backend a la vez
npm run dev:web         # solo Astro   → http://localhost:4321
npm run dev:api         # solo NestJS  → http://localhost:3000
```

El backend no arranca sin `MONGO_URI`: falla de forma explícita en el arranque
en lugar de quedarse a medias.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | Compila ambas aplicaciones |
| `npm test` | Tests de todos los workspaces |
| `npm run deploy -- --list` | Lista proyectos y aplicaciones de Coolify |
| `npm run dns -- --dry-run` | Muestra los cambios de DNS sin aplicarlos |

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servicio y de la conexión a Mongo |
| `POST` | `/contact` | Envío del formulario de contacto |

`POST /contact` está limitado a 5 envíos por IP cada 10 minutos e incluye una
trampa para bots (campo `company`, oculto en el formulario): si llega relleno,
el mensaje se descarta silenciosamente.

## Seguridad

Los secretos no se commitean nunca. `.env` está en `.gitignore`; en CI viven en
GitHub Secrets y en producción, en las variables de entorno de Coolify. El
procedimiento de rotación está en [`docs/deployment.md`](./docs/deployment.md#6-rotación-de-credenciales).
