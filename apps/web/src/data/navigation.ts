/**
 * Navegación y textos de marca — extraídos del sitio de referencia
 * (thedoor-pr.netlify.app): estructura de secciones, wordmark y tagline.
 */
export interface NavLink {
  label: string
  href: string
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Servicios', href: '/#services' },
  { label: 'Cartera', href: '/#roster' },
  { label: 'Postula', href: '/#apply' },
  { label: 'Contacto', href: '/#contact' },
]

export const SITE = {
  name: 'The Door PR',
  tagline: 'Doors don’t open for everyone — but we can open them for you.',
  /** Posicionamiento corto: encabeza el pie del hero y las meta etiquetas. */
  description:
    'Public relations agency that curates the right people for the right places.',
  /** El porqué del posicionamiento. Vive en la sección «The question». */
  proposition:
    'An event is not just about quantity: it’s about quality, ambiance and vibes.',
  cta: 'Abre la puerta',
  city: 'Lima, Perú — desde 2019',
} as const
