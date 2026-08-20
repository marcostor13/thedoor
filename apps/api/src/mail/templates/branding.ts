/**
 * Línea gráfica de The Door PR, traducida a lo que un cliente de correo sabe
 * pintar.
 *
 * Los tokens del sitio viven en `apps/web/src/styles/tokens.css`, pero un
 * correo no puede leerlos: no hay custom properties fiables, ni hojas
 * externas, ni `rem`. Así que la paleta y la escala se repiten aquí en
 * valores literales —los mismos— y este archivo es el único sitio del backend
 * donde hay colores escritos a mano.
 *
 * Si cambia la línea gráfica del sitio, cambia aquí también.
 */
export const BRAND = {
  /** Fondo de la página del correo y de la tarjeta. */
  bg: '#000000',
  card: '#050505',
  elevated: '#0c0a0a',
  /** Tinta crema cálida, igual que en el sitio. */
  fg: '#f4f1ea',
  fgMuted: '#a8a39a',
  accent: '#ff1a25',
  accentSoft: '#ff5560',
  ink: '#050505',
  /** `rgb(255 255 255 / 0.08)` no lo entiende Outlook: va aplanado sobre negro. */
  border: '#1f1d1c',
  borderStrong: '#332f2e',
} as const

/**
 * Pilas tipográficas. Las webfonts solo cargan en los clientes que soportan
 * `@import` (Apple Mail, iOS); en Gmail y Outlook manda el primer sustituto
 * del sistema, así que cada pila empieza por la fuente de marca y sigue por
 * una que exista en todas partes y case con su carácter.
 */
export const FONT = {
  /** Italiana → Georgia: las dos son serif de asta fina y caja alta estrecha. */
  display: "'Italiana', Georgia, 'Times New Roman', Times, serif",
  body: "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Consolas, 'Courier New', monospace",
} as const

/** Ancho de la tarjeta. 600px es lo que cabe sin scroll lateral en Outlook. */
export const CARD_WIDTH = 600
