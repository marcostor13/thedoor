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
/**
 * Lo mínimo que tiene cualquier cosa que esté en cartel: qué es, cuándo, y
 * hasta cuándo se anuncia. Lo que no todas tienen —dirección, mapa, dress
 * code— vive en `EventDetails`.
 */
export interface BillEntry {
  /** Sitio, tal y como se anuncia. */
  venue: string
  /** Día, en la forma en que se lee dentro de la invitación. */
  date: string
  time: string
  /** Nombre del local para la línea de localización. */
  location: string
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
   * Desde cuándo se anuncia esta noche. Es opcional porque una noche sola no
   * lo necesita —basta con `endsAt`—, pero en cuanto hay dos en el archivo sí:
   * sin él, la más nueva empezaría a mandarse desde el principio de los
   * tiempos y se comería a la que todavía estaba en cartel.
   */
  startsAt?: string
  /**
   * A partir de aquí la invitación deja de mandarse. Con zona horaria
   * explícita: el contenedor va en UTC y la noche es en Lima.
   */
  endsAt: string
}

/** Una noche con puerta conocida: se puede decir cómo vestir y cómo llegar. */
export interface EventDetails extends BillEntry {
  dresscode: string
  address: string
  /** Adónde lleva el botón «cómo llegar». */
  mapsUrl: string
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

/**
 * Oscar's List — el cóctel de Óscar Lorenzo Café.
 *
 * Tiene plantilla propia (`oscars-list.ts`) y no la de la invitación normal:
 * no es una noche de The Door PR con su flyer, es la lista de un anfitrión, y
 * lo que recibe quien se apunta es el saludo y la dirección, no un pase.
 *
 * `startsAt` existe por lo dicho arriba: sin él, esta noche habría estado en
 * cartel también el 26 de agosto y habría tapado a Poolbar.
 */
export const OSCARS_LIST: EventDetails = {
  venue: 'Óscar Lorenzo Café',
  date: 'Viernes 4 de septiembre',
  time: '7:00 p.m.',
  dresscode: 'Cocktail attire · Golden details',
  location: 'Óscar Lorenzo Café',
  address: 'Av. Jorge Basadre 318, San Isidro',
  mapsUrl: 'https://maps.google.com/?q=Oscar+Lorenzo+Caf%C3%A9,+Av.+Jorge+Basadre+318,+San+Isidro,+Lima',
  body: [
    'Gracias por registrarte en Oscar’s List: un cóctel privado y exclusivo para celebrar, compartir y conectar.',
    'Nos encanta que nos acompañes a disfrutar una noche de champagne & bites con electro house music 🥂',
  ],
  flyer: {
    path: '/email/oscars-list-04-09.jpg',
    alt: 'Oscar’s List — Viernes 4 de septiembre, 7:00 p.m., Óscar Lorenzo Café, Jorge Basadre 318, San Isidro. Dress code: cocktail attire · golden details.',
    width: 1080,
    height: 1350,
  },
  startsAt: '2026-08-31T00:00:00-05:00',
  // El cóctel empieza a las 7; se corta a las 5am del día siguiente, hora de
  // Lima, para no invitar a una fiesta que ya pasó.
  endsAt: '2026-09-05T05:00:00-05:00',
}

/**
 * Jampara List — Jampara Vol. 01, un almuerzo alrededor de la cocina peruana.
 *
 * Es un `BillEntry` y no un `EventDetails` porque la locación es secreta: no
 * hay dirección que escribir ni mapa al que mandar a nadie. Tampoco dress code.
 * Por eso lleva plantilla propia (`jampara-list.ts`), que es el saludo y la
 * invitación, sin botón de «cómo llegar».
 */
export const JAMPARA_LIST: BillEntry = {
  venue: 'Jampara Vol. 01',
  date: 'Sábado 24 de octubre',
  time: '1:00 p.m.',
  location: 'Locación secreta',
  body: [
    'Gracias por registrarte en Jampara List: una tarde para descubrir sabores, compartir, conversar y disfrutar de la cocina peruana a nuestra manera.',
  ],
  flyer: {
    path: '/email/jampara-24-10.jpg',
    alt: 'Jampara Vol. 01 — Invitación especial. 24 de octubre de 2026, 1:00 p.m. Locación secreta. Encuentros alrededor de la cocina peruana.',
    width: 1600,
    height: 1066,
  },
  startsAt: '2026-10-09T00:00:00-05:00',
  // Es una tarde, no una madrugada: se corta al acabar el día 24, hora de Lima.
  endsAt: '2026-10-25T00:00:00-05:00',
}

/** ¿Está esta noche en cartel ahora mismo? */
export function onBill(event: BillEntry, now: Date = new Date()): boolean {
  const empezado = !event.startsAt || Date.parse(event.startsAt) <= now.getTime()
  return empezado && now.getTime() < Date.parse(event.endsAt)
}

/** El evento en cartel, si todavía no ha pasado. */
export function eventOnBill(now: Date = new Date()): EventDetails | undefined {
  return onBill(CURRENT_EVENT, now) ? CURRENT_EVENT : undefined
}

/** Oscar's List, mientras siga en cartel. */
export function oscarsListOnBill(now: Date = new Date()): EventDetails | undefined {
  return onBill(OSCARS_LIST, now) ? OSCARS_LIST : undefined
}

/** Jampara List, mientras siga en cartel. */
export function jamparaListOnBill(now: Date = new Date()): BillEntry | undefined {
  return onBill(JAMPARA_LIST, now) ? JAMPARA_LIST : undefined
}

/** El archivo de noches, de la más reciente a la más antigua. */
const BILL: BillEntry[] = [JAMPARA_LIST, OSCARS_LIST, CURRENT_EVENT]

/**
 * La noche que haya en cartel ahora mismo, sea cual sea.
 *
 * Es lo que mira `enviar-invitaciones.ts` antes de un envío en lote: le da
 * igual de quién sea la noche —cada una trae su plantilla, y de eso ya se
 * ocupa `renderSignupEmail`—; lo que necesita saber es si hay alguna, porque
 * sin ella el lote saldría con la confirmación genérica.
 */
export function nightOnBill(now: Date = new Date()): BillEntry | undefined {
  return BILL.find((event) => onBill(event, now))
}
