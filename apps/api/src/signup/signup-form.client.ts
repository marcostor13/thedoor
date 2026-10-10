import { Injectable, Logger } from '@nestjs/common'

/**
 * Cliente del formulario público donde viven ahora las altas.
 *
 * Desde que la lista dejó de guardarse en Mongo, este `POST` **es** la
 * persistencia: si falla, el alta no existe en ninguna parte. Por eso este
 * cliente no se parece a `MailService` —que se traga sus errores porque el
 * registro ya estaba a salvo— sino al revés: aquí todo fallo se propaga, para
 * que el controlador devuelva error y la persona vuelva a intentarlo en lugar
 * de irse creyendo que está apuntada.
 *
 * Los nombres de los campos los fija la plataforma en la definición del
 * formulario y no se pueden elegir aquí. Se comprueban contra ella:
 *
 *   GET https://<host>/public/forms/<clave-pública>
 *
 * Si un día dejan de coincidir, el envío se rechaza con un 400 y el alta no se
 * guarda —que es el fallo ruidoso que queremos—, pero conviene mirarlo ahí
 * antes de tocar nada.
 */
export interface SignupFormFields {
  nombre: string
  email: string
  /** WhatsApp. Obligatorio en la definición del formulario. */
  whatsapp: string
  /** Instagram, ya normalizado. */
  instagram?: string
  // Sin `reference`: el formulario en uso no define ese campo, y mandar una
  // clave que la plataforma no conoce es jugarse un 400 en cada alta que
  // venga del enlace de una anfitriona. Quién invitó se sigue sabiendo por
  // `pageUrl`, que lleva su slug.
}

export interface SignupFormResult {
  /** `false` cuando esa persona ya había enviado este formulario. */
  created: boolean
  customerId?: string
}

interface SubmitResponse {
  ok?: boolean
  /**
   * Lo único que hay que mirar, según la plataforma: `new` es un alta en ESTE
   * formulario —también si el contacto ya existía por otra vía—, y `registered`
   * es alguien que ya lo había enviado antes.
   */
  status?: 'new' | 'registered'
  message?: string
  customerId?: string
  /** Dice lo mismo que `status`; se mantiene por compatibilidad. */
  created?: boolean
}

/**
 * Una petición sin límite se queda colgada mientras el socket siga abierto, y
 * con ella la del visitante esperando frente al formulario.
 */
const TIMEOUT_MS = 10_000

export class SignupFormError extends Error {}

@Injectable()
export class SignupFormClient {
  private readonly logger = new Logger(SignupFormClient.name)
  private readonly endpoint = process.env.SIGNUP_FORM_URL

  /**
   * Sin endpoint no hay dónde guardar. Se comprueba al usarlo y no al arrancar
   * porque el resto de la API —contacto, salud— sigue siendo válido sin esto;
   * lo que no puede pasar es que un alta se dé por buena sin haberse escrito.
   */
  async submit(fields: SignupFormFields, pageUrl?: string): Promise<SignupFormResult> {
    if (!this.endpoint) {
      throw new SignupFormError(
        'Falta SIGNUP_FORM_URL: no hay formulario donde guardar el alta.',
      )
    }

    let response: Response

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: fields, pageUrl }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      throw new SignupFormError(`El formulario no responde: ${describe(error)}`)
    }

    if (!response.ok) {
      // El cuerpo dice qué se ha rechazado —un campo obligatorio vacío, una
      // clave que ya no existe—, y sin él un 400 es indistinguible de un 500.
      const detalle = await readBody(response)
      throw new SignupFormError(`El formulario ha devuelto ${response.status}: ${detalle}`)
    }

    const body = (await response.json().catch(() => ({}))) as SubmitResponse

    // `ok: false` con 200 es la forma que tiene esta plataforma de rechazar
    // sin cambiar el código HTTP: si no se comprueba, un rechazo se leería
    // como un alta correcta.
    if (body.ok === false) {
      throw new SignupFormError(`El formulario ha rechazado el alta: ${body.message ?? 'sin motivo'}`)
    }

    // Manda `status`; `created` es el respaldo para una respuesta antigua. Si
    // faltaran los dos, tratarlo como alta nueva es el fallo menos malo: se
    // manda la bienvenida una vez de más, no de menos.
    const created = body.status ? body.status === 'new' : (body.created ?? true)

    return { created, customerId: body.customerId }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function readBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300)
  } catch {
    return '(sin cuerpo)'
  }
}
