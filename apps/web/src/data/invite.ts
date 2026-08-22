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

/**
 * Anfitrionas: cada una reparte su propio enlace (`/invitacion/<slug>`) y el
 * alta llega marcada con su nombre, así que la lista dice quién invitó a
 * quién sin preguntárselo a nadie.
 *
 * El nombre viaja en el campo `reference` del registro, que para un `guest`
 * ya significa exactamente eso: quién te refiere. No hace falta tocar el API.
 *
 * El `slug` es lo que se pega en WhatsApp: corto, sin acentos y reconocible
 * de un vistazo por quien lo reparte. Añadir una anfitriona es añadir una
 * línea aquí; la ruta se genera sola en el build.
 */
export interface InviteHost {
  /** Trozo de URL. Minúsculas, sin acentos ni espacios. */
  slug: string
  /** Nombre tal cual se muestra y se guarda en el registro. */
  name: string
}

export const INVITE_HOSTS: InviteHost[] = [
  { slug: 'sandra', name: 'Sandra Valdez' },
  { slug: 'ximena', name: 'Ximena García Piaggio' },
  { slug: 'daniela', name: 'Daniela Roda' },
  { slug: 'paola', name: 'Paola Mendiola' },
]

export const INVITE = {
  /**
   * El antetítulo es siempre el mismo, con anfitriona o sin ella: la landing
   * no dice quién reparte el enlace. El nombre sigue viajando en el alta
   * (campo `reference`), pero no se enseña — a quien abre el enlace se le
   * hace una pregunta, no una presentación.
   */
  eyebrow: 'Are you in?, or are you out?',
  title: 'Regístrate aquí para recibir una invitación',
  /** Una sola línea de apoyo. Si necesita dos, sobra. */
  note: 'Lista cerrada — Lima',
  cta: 'Regístrate',
  legal: 'Te escribimos solo para invitarte. La lista no se vende ni se comparte.',
} as const

/** ¿Hay algo del flyer que anunciar? */
export const hasEventDetails = Boolean(
  INVITE_EVENT.name ?? INVITE_EVENT.date ?? INVITE_EVENT.place,
)
