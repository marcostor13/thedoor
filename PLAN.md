# The Door — plan de reconstrucción

Rediseño de https://thedoor-pr.netlify.app/ sobre Astro (frontend) y NestJS
(backend), desplegado en Coolify con DNS en Cloudflare y datos en MongoDB Atlas.

**Objetivo de diseño:** mismo contenido, misma línea gráfica (tipografías,
escalas, color, logo y animación de entrada **idénticos**), con una puesta en
escena más impactante.

---

## 0. Estado de los bloqueos

| Bloqueo | Estado | Impacto |
|---|---|---|
| Acceso a `thedoor-pr.netlify.app` | **Denegado** por la política de egress (403 en CONNECT) | No se puede extraer la línea gráfica real: fase 1 bloqueada |
| Variable `deploy` del repositorio | Resuelta — aportada manualmente | Ninguno |
| API de GitHub (`api.github.com`) | Denegada en esta sesión | El aprovisionamiento usa el PAT desde el runner de CI, no desde aquí |
| Push por git al repositorio | Funciona | Ninguno |
| Registro npm | Funciona | Ninguno |

Para desbloquear la fase 1 hay que añadir `thedoor-pr.netlify.app` a los
dominios permitidos del entorno en `claude.ai/code` y reanudar la sesión.

Todo lo que sigue a partir de la fase 2 es independiente del diseño y avanza
sin ese acceso.

---

## 1. Extracción de la línea gráfica (bloqueada)

Trabajo a realizar en cuanto el dominio esté accesible. No se inventa ni se
aproxima ninguno de estos valores: se extraen del sitio real.

1. **Inventario de contenido.** Volcado de cada sección, textos íntegros,
   navegación, footer, metadatos SEO y destinos de enlaces. Queda en
   `content/inventory.md` como fuente de verdad para la migración.
2. **Tokens tipográficos.** Familias reales (`@font-face` o Google Fonts),
   pesos cargados, escala completa de tamaños, interlineado, tracking y
   transformaciones por nivel. Se vuelcan a `apps/web/src/styles/tokens.css`.
3. **Color y espaciado.** Paleta completa con sus usos, radios, sombras, anchos
   de contenedor y la escala de espaciado y de breakpoints tal como está.
4. **Logo.** Descarga del activo original. Si es un raster, se revectoriza a SVG
   respetando las proporciones exactas; si ya es SVG, se usa tal cual.
5. **Animación de entrada.** Se captura el mecanismo real —CSS, Web Animations,
   GSAP, Lottie— con sus duraciones, curvas de easing, retardos y secuencia, y
   se porta literalmente. Es un requisito explícito: no se reinterpreta.

**Entregable:** `docs/design-system.md` + `tokens.css` poblado con valores
reales, y el criterio de aceptación de que logo y animación son
indistinguibles del original.

---

## 2. Andamiaje del monorepo (hecho)

```
thedoor/
├── apps/
│   ├── web/            Astro — sitio público
│   └── api/            NestJS — API, MongoDB
├── scripts/            Aprovisionamiento Coolify + DNS Cloudflare
├── .github/workflows/  CI y despliegue
└── .env.example        Claves sin valores
```

npm workspaces, Node 22. Se eligió npm porque es lo que ya usa el runner y
evita añadir un gestor de paquetes más a la cadena de despliegue.

---

## 3. Frontend — Astro

**Por qué Astro encaja:** el sitio es mayoritariamente contenido estático. Astro
entrega HTML sin JavaScript por defecto y permite hidratar solo los componentes
que de verdad lo necesitan (la animación de entrada, el formulario). Eso da un
LCP muy bajo, que es justo lo que sostiene la sensación de "impactante".

**Decisiones:**

- **Sin framework CSS.** Nada de Tailwind ni Bootstrap. Reproducir una línea
  gráfica existente al detalle es más fiable con CSS propio sobre custom
  properties que peleando contra la escala de un framework. Los estilos con
  ámbito de Astro evitan las colisiones sin coste en runtime.
- **Sin framework de UI** (React/Vue) salvo que algún componente lo exija. La
  interactividad prevista se cubre con Web Components y islas de Astro.
- **Renderizado:** estático para las páginas de contenido; el formulario habla
  con el backend por `fetch`, así que no hace falta SSR. Si más adelante el
  contenido pasa a gestionarse desde el backend, se cambia a `output: 'server'`
  con el adaptador de Node, que ya está previsto en el Dockerfile.

**Dónde se gana el impacto**, sin tocar la línea gráfica:

| Recurso | Cómo |
|---|---|
| Transiciones entre páginas | View Transitions API nativa de Astro; navegación sin parpadeo |
| Revelado al hacer scroll | `IntersectionObserver` + `animation-timeline`, con degradación limpia |
| Jerarquía tipográfica | Composición y ritmo vertical más agresivos, **con la escala existente** |
| Profundidad | Parallax sutil y capas, respetando la paleta actual |
| Microinteracciones | Estados de hover y foco con la curva de easing de la animación de entrada |

Todo bajo `prefers-reduced-motion`: con movimiento reducido el sitio se sirve
estático y la animación de entrada se salta.

---

## 4. Backend — NestJS

Arquitectura modular estándar de Nest, Mongoose sobre MongoDB Atlas.

| Módulo | Responsabilidad |
|---|---|
| `health` | `/health` — sonda de estado para Coolify |
| `contact` | Recepción y persistencia del formulario de contacto |
| `content` | Lectura de las secciones editables del sitio |
| `auth` | JWT para el panel de administración |

**Transversal:** `ValidationPipe` global con `class-validator`, filtro de
excepciones unificado, CORS restringido a `CORS_ORIGINS`, `helmet`, y
rate limiting en los endpoints públicos de escritura.

El alcance real de `content` y `auth` depende del inventario de la fase 1: si el
sitio actual es totalmente estático, `content` se reduce a servir el formulario
y `auth` puede no llegar a hacer falta. Se decide con el inventario delante, no
antes.

---

## 5. Infraestructura y despliegue

Deducido de la variable `deploy`:

```
Cloudflare DNS
   ├── thedoor.marcostorresalarcon.com      ──┐
   └── apithedoor.marcostorresalarcon.com   ──┤
                                              ▼
                                    Coolify (self-hosted)
                                      ├── web  (Astro, Docker)
                                      └── api  (NestJS, Docker)
                                              │
                                              ▼
                                    MongoDB Atlas
```

- **Coolify** despliega ambas aplicaciones desde este repositorio vía el PAT de
  GitHub. Dockerfile multi-etapa por aplicación; TLS por Let's Encrypt que
  gestiona el propio Coolify.
- **Cloudflare** aloja los registros A hacia la IP del servidor de Coolify.
  `scripts/cloudflare-dns.mjs` los crea de forma idempotente.
- **MongoDB Atlas** es gestionado; hay que añadir la IP del servidor a la
  lista de acceso de Atlas.
- **CI** en GitHub Actions: lint, build y tests en cada push; en `main`, se
  dispara el webhook de despliegue de Coolify.

**Seguridad:** ningún secreto llega al repositorio. Viven en GitHub Secrets
(para CI) y en las variables de entorno de Coolify (para runtime). Las
credenciales compartidas en el chat de la sesión deben rotarse: PAT de GitHub,
token de Coolify, token de Cloudflare y contraseña del usuario de Atlas.

---

## 6. Secuencia

| Fase | Trabajo | Depende de |
|---|---|---|
| 1 | Extracción de la línea gráfica | **Acceso al dominio** |
| 2 | Andamiaje del monorepo | — (hecho) |
| 3 | Base de Astro + tokens + layout | Fase 1 para los valores reales |
| 4 | Logo y animación de entrada portados | Fase 1 |
| 5 | Maquetación de secciones con el contenido real | Fases 1 y 3 |
| 6 | API NestJS + integración del formulario | — |
| 7 | Dockerfiles, scripts de Coolify y DNS | — |
| 8 | CI/CD y primer despliegue | Fase 7 |
| 9 | Rendimiento, accesibilidad y SEO | Fase 5 |

Las fases 2, 6, 7 y 8 no dependen del diseño y se ejecutan ya. Las fases 1, 3,
4 y 5 quedan a la espera del acceso al dominio.

---

## 7. Criterios de aceptación

- Logo y animación de entrada indistinguibles del original.
- Tipografías, escalas, paleta y espaciado idénticos a los del sitio actual.
- Todo el contenido migrado, sin pérdidas: textos, enlaces y metadatos.
- Lighthouse ≥ 95 en rendimiento, accesibilidad, buenas prácticas y SEO.
- Sitio funcional sin JavaScript salvo la animación de entrada y el formulario.
- `prefers-reduced-motion` respetado en todo el sitio.
- Ningún secreto en el repositorio.
