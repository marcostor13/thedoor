import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { type SignupConfirmationData } from './templates/signup-confirmation'
import { renderSignupEmail } from './templates/signup-email'

/**
 * Envío de correo por Resend.
 *
 * Se habla con la API HTTP directamente y no con el SDK: lo que necesitamos de
 * él es un `POST` con seis campos, y a cambio de escribirlo a mano tenemos el
 * control del camino de error —que aquí no es un detalle, ver el punto 2— y una
 * dependencia menos en el contenedor.
 *
 * Dos decisiones que gobiernan todo este servicio:
 *
 * 1. Es OPCIONAL. Sin `RESEND_API_KEY` y `MAIL_FROM` el servicio arranca
 *    apagado y lo dice una vez en el log. Un entorno sin correo configurado
 *    —desarrollo, o producción antes de tener dominio verificado— sigue
 *    registrando gente igual.
 *
 * 2. NUNCA lanza. Un fallo de Resend no puede convertir un alta correcta en un
 *    500: la persona ya está en la lista, y perder su registro por no poder
 *    saludarla sería el peor de los dos fallos. Los errores se registran y se
 *    tragan.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Un `fetch` sin límite se queda colgado mientras el socket siga abierto, y con
 * él la promesa que el servicio de altas ha soltado sin `await`. Diez segundos
 * son de sobra para una API que responde en menos de uno.
 */
const TIMEOUT_MS = 10_000

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name)

  private readonly apiKey = process.env.RESEND_API_KEY
  private readonly from = process.env.MAIL_FROM
  private readonly replyTo = process.env.MAIL_REPLY_TO
  private readonly siteUrl = (process.env.SITE_URL ?? 'https://thedoorpr.com').replace(/\/+$/, '')

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.warn(
        'Correo desactivado: faltan RESEND_API_KEY o MAIL_FROM. Las altas se registran, pero no se confirma nada por correo.',
      )
      return
    }

    this.logger.log(`Correo activo por Resend, remitente ${this.from}`)
  }

  get enabled(): boolean {
    return Boolean(this.apiKey && this.from)
  }

  /**
   * Confirmación de alta. Devuelve si se llegó a enviar, para que quien llame
   * pueda registrarlo, pero no falla nunca.
   */
  async sendSignupConfirmation(
    to: string,
    data: Omit<SignupConfirmationData, 'siteUrl'>,
  ): Promise<boolean> {
    if (!this.apiKey || !this.from) return false

    const { subject, html, text } = renderSignupEmail({ ...data, siteUrl: this.siteUrl })

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          reply_to: this.replyTo ?? this.from,
          subject,
          html,
          text,
          headers: {
            // Salir de la lista sin buscar un enlace: los clientes que la leen
            // pintan su propio botón de baja, y ayuda a la entregabilidad.
            'List-Unsubscribe': `<mailto:${extractAddress(this.replyTo ?? this.from)}?subject=Baja>`,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!response.ok) {
        // Resend explica en el cuerpo qué ha rechazado —dominio sin verificar,
        // clave caducada, destinatario inválido—, y sin eso en el log el fallo
        // es indistinguible de una caída.
        this.logger.error(
          `Resend ha rechazado la confirmación a ${to}: ${response.status} ${await describeResponse(response)}`,
        )
        return false
      }

      return true
    } catch (error) {
      // Se registra y se sigue: el alta ya está guardada y eso es lo que
      // importa. Reintentarlo es trabajo de una cola, no de esta petición.
      this.logger.error(`No se ha podido enviar la confirmación a ${to}: ${describe(error)}`)
      return false
    }
  }
}

/** `The Door PR <hola@thedoorpr.com>` → `hola@thedoorpr.com`. */
function extractAddress(from: string): string {
  return from.match(/<([^>]+)>/)?.[1] ?? from.trim()
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** El cuerpo del error de Resend, sin dejar que leerlo tumbe el logging. */
async function describeResponse(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500)
  } catch {
    return '(sin cuerpo)'
  }
}
