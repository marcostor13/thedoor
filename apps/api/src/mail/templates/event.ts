/**
 * La noche que hay en cartel.
 *
 * Cuando hay un evento abierto, quien se apunta desde la landing de invitación
 * no recibe un «te avisaremos»: recibe la invitación a esa noche concreta. Por
 * eso los datos viven aquí y no incrustados en la plantilla — cambiar de fecha
 * es editar este objeto, y nada más.
 *
 * `endsAt` es lo que evita el peor fallo posible de un correo así: seguir
 * invitando a una fiesta que ya pasó. Pasada esa hora, `eventOnBill()` devuelve
 * `undefined` y las altas vuelven a recibir la confirmación genérica sin que
 * nadie tenga que acordarse de desactivar nada.
 */
export interface EventDetails {
  /** Sitio, tal y como se anuncia. */
  venue: string
  /** Día, en la forma en que se lee dentro de la invitación. */
  date: string
  time: string
  dresscode: string
  /** Nombre del local para la línea de localización. */
  location: string
  address: string
  /** Adónde lleva el botón «cómo llegar». */
  mapsUrl: string
  /** Cuerpo de la invitación: un párrafo por elemento. */
  body: string[]
  /** Flyer. Cuelga de `${siteUrl}` y se sirve desde `apps/web/public`. */
  flyer: {
    path: string
    /** Se lee cuando el cliente bloquea las imágenes, que es casi siempre. */
    alt: string
    width: number
    height: number
  }
  /**
   * A partir de aquí la invitación deja de mandarse. Con zona horaria
   * explícita: el contenedor va en UTC y la noche es en Lima.
   */
  endsAt: string
}

export const CURRENT_EVENT: EventDetails = {
  venue: 'Poolbar by Handshake',
  date: 'Miércoles 26.08.26',
  time: '8pm',
  dresscode: 'Cocktail',
  location: 'Hotel Nhow Lima',
  address: 'Calle Atahualpa 155, Miraflores',
  mapsUrl: 'https://maps.google.com/?q=Hotel+Nhow+Lima,+Calle+Atahualpa+155,+Miraflores,+Lima',
  body: [
    'The Door PR te invita a la apertura de una nueva etapa en Poolbar by Handshake del hotel Nhow Lima.',
    'Les tenemos preparados welcome drinks y food tasting acompañados con DJ Shushupe en la cabina.',
    'Los esperamos…',
  ],
  flyer: {
    path: '/email/poolbar-26-08.png',
    alt: 'Poolbar by Handshake — Line up especial: David Ink, Shushupe y Soraya. 26 de agosto.',
    width: 920,
    height: 1600,
  },
  // La noche del 26 termina de madrugada: se corta a las 5am del 27, hora de
  // Lima, y no a medianoche.
  endsAt: '2026-08-27T05:00:00-05:00',
}

/** El evento en cartel, si todavía no ha pasado. */
export function eventOnBill(now: Date = new Date()): EventDetails | undefined {
  return now.getTime() < Date.parse(CURRENT_EVENT.endsAt) ? CURRENT_EVENT : undefined
}
