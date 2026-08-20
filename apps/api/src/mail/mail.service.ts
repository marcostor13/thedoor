import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'
import {
  renderSignupConfirmation,
  type SignupConfirmationData,
} from './templates/signup-confirmation'

/**
 * Envío de correo por SMTP.
 *
 * Dos decisiones que gobiernan todo este servicio:
 *
 * 1. Es OPCIONAL. Sin `MAIL_HOST` y `MAIL_FROM` el servicio arranca apagado y
 *    lo dice una vez en el log. Un entorno sin SMTP configurado —desarrollo,
 *    o producción antes de tener buzón— sigue registrando gente igual.
 *
 * 2. NUNCA lanza. Un SMTP caído no puede convertir un alta correcta en un 500:
 *    la persona ya está en la lista, y perder su registro por no poder
 *    saludarla sería el peor de los dos fallos. Los errores se registran y se
 *    tragan.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name)
  private transporter?: Transporter

  private readonly from = process.env.MAIL_FROM
  private readonly replyTo = process.env.MAIL_REPLY_TO
  private readonly siteUrl = (process.env.SITE_URL ?? 'https://thedoorpr.com').replace(/\/+$/, '')

  onModuleInit(): void {
    const host = process.env.MAIL_HOST

    if (!host || !this.from) {
      this.logger.warn(
        'Correo desactivado: faltan MAIL_HOST o MAIL_FROM. Las altas se registran, pero no se confirma nada por correo.',
      )
      return
    }

    const port = Number(process.env.MAIL_PORT ?? 587)

    this.transporter = createTransport({
      host,
      port,
      // 465 es SMTPS (TLS desde el saludo); 587 y 25 empiezan en claro y
      // suben a TLS con STARTTLS. `secure` distingue justo eso.
      secure: process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' : port === 465,
      auth: process.env.MAIL_USER
        ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD ?? '' }
        : undefined,
    })

    this.logger.log(`Correo activo por SMTP contra ${host}:${port}`)
  }

  get enabled(): boolean {
    return this.transporter !== undefined
  }

  /**
   * Confirmación de alta. Devuelve si se llegó a enviar, para que quien llame
   * pueda registrarlo, pero no falla nunca.
   */
  async sendSignupConfirmation(
    to: string,
    data: Omit<SignupConfirmationData, 'siteUrl'>,
  ): Promise<boolean> {
    if (!this.transporter || !this.from) return false

    const { subject, html, text } = renderSignupConfirmation({
      ...data,
      siteUrl: this.siteUrl,
    })

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        replyTo: this.replyTo ?? this.from,
        subject,
        html,
        text,
        headers: {
          // Salir de la lista sin buscar un enlace: los clientes que la leen
          // pintan su propio botón de baja, y ayuda a la entregabilidad.
          'List-Unsubscribe': `<mailto:${extractAddress(this.replyTo ?? this.from)}?subject=Baja>`,
        },
      })
      return true
    } catch (error) {
      // Se registra y se sigue: el alta ya está guardada y eso es lo que
      // importa. Reintentarlo es trabajo de una cola, no de esta petición.
      this.logger.error(
        `No se ha podido enviar la confirmación a ${to}: ${describe(error)}`,
      )
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
