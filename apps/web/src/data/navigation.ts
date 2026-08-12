/**
 * Navegación del sitio.
 *
 * ⚠️  PROVISIONAL. Estas secciones no proceden del sitio real: el dominio
 * thedoor-pr.netlify.app está bloqueado y no se ha podido hacer el inventario
 * de contenido. Se sustituyen por la estructura real en la fase 1 del plan.
 */
export interface NavLink {
  label: string
  href: string
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Nosotros', href: '/#nosotros' },
  { label: 'Servicios', href: '/#servicios' },
  { label: 'Clientes', href: '/#clientes' },
  { label: 'Contacto', href: '/#contacto' },
]

export const SITE = {
  name: 'The Door',
  tagline: 'Agencia de comunicación y relaciones públicas',
} as const
