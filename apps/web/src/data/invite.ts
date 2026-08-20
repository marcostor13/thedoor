/**
 * Landing de invitación — el enlace que se reparte a mano por WhatsApp o
 * correo, no el que vive en la web.
 *
 * Es deliberadamente corta: quien la abre ya sabe de qué va, así que lo único
 * que tiene que ver es una frase y un formulario. Todo lo que sobre aquí
 * convierte «inscríbete» en «léete la web», que es justo lo que no queremos.
 */

export interface InviteEvent {
  /** Nombre de la noche, si ya lo hay. */
  name?: string
  /** Fecha en texto, tal cual se lee en el flyer. Ej.: «Viernes 12 de setiembre». */
  date?: string
  /** Lugar. Ej.: «Barranco, Lima». */
  place?: string
}

/**
 * Detalles de la próxima fecha. Se quedan vacíos a propósito mientras no haya
 * flyer: sin lugar ni fecha confirmados no se anuncian, y la página se pinta
 * igual. En cuanto lleguen, se rellenan aquí y aparecen solos bajo el titular
 * — no hay que tocar la plantilla.
 */
export const INVITE_EVENT: InviteEvent = {}

export const INVITE = {
  eyebrow: 'Invitación',
  title: 'Regístrate aquí para recibir una invitación',
  /** Una sola línea de apoyo. Si necesita dos, sobra. */
  note: 'Lista cerrada — Lima',
  cta: 'Inscríbete',
  legal: 'Te escribimos solo para invitarte. La lista no se vende ni se comparte.',
} as const

/** ¿Hay algo del flyer que anunciar? */
export const hasEventDetails = Boolean(
  INVITE_EVENT.name ?? INVITE_EVENT.date ?? INVITE_EVENT.place,
)
