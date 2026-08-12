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
  tagline: 'Doors don’t open for everyone. Ours do — for the right people, on the right nights.',
  description:
    'Una casa de relaciones públicas para hospitalidad, vida nocturna y la gente que llena las salas.',
  cta: 'Abre la puerta',
  city: 'Lima, Perú — desde 2019',
} as const
