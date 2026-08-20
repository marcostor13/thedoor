import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { MailService } from './mail.service'

/**
 * MailService lee su configuración del entorno en `onModuleInit`, así que cada
 * caso monta el entorno que quiere probar y lo deja como estaba.
 */
function withEnv(vars: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

describe('MailService', () => {
  let restore = (): void => {}

  afterEach(() => restore())

  it('queda apagado si no hay SMTP configurado', () => {
    restore = withEnv({ MAIL_HOST: undefined, MAIL_FROM: undefined })

    const service = new MailService()
    service.onModuleInit()

    expect(service.enabled).toBe(false)
  })

  it('queda apagado si hay host pero no remitente', () => {
    // Medio configurado es peor que nada: nodemailer aceptaría el envío y el
    // correo saldría sin `From` válido.
    restore = withEnv({ MAIL_HOST: 'smtp.example.com', MAIL_FROM: undefined })

    const service = new MailService()
    service.onModuleInit()

    expect(service.enabled).toBe(false)
  })

  it('apagado, no envía nada y lo dice', async () => {
    restore = withEnv({ MAIL_HOST: undefined, MAIL_FROM: undefined })

    const service = new MailService()
    service.onModuleInit()

    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'guest' }),
    ).resolves.toBe(false)
  })

  it('se enciende con host y remitente', () => {
    restore = withEnv({
      MAIL_HOST: 'smtp.example.com',
      MAIL_FROM: 'The Door PR <hola@thedoorpr.com>',
    })

    const service = new MailService()
    service.onModuleInit()

    expect(service.enabled).toBe(true)
  })

  it('un SMTP caído no lanza: devuelve false y sigue', async () => {
    restore = withEnv({
      MAIL_HOST: 'smtp.example.com',
      MAIL_FROM: 'The Door PR <hola@thedoorpr.com>',
    })

    const service = new MailService()
    service.onModuleInit()

    // Se sustituye el transporte por uno que siempre falla, que es lo que hace
    // un SMTP inalcanzable.
    ;(service as unknown as { transporter: { sendMail: unknown } }).transporter = {
      sendMail: mock(() => Promise.reject(new Error('ECONNREFUSED'))),
    }

    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'guest' }),
    ).resolves.toBe(false)
  })

  it('manda asunto, html, texto y cabecera de baja', async () => {
    restore = withEnv({
      MAIL_HOST: 'smtp.example.com',
      MAIL_FROM: 'The Door PR <hola@thedoorpr.com>',
      MAIL_REPLY_TO: undefined,
      SITE_URL: 'https://thedoorpr.com',
    })

    // El mock declara su parámetro: sin él, `mock.calls` se infiere como
    // tuplas vacías y leer el primer argumento no compila.
    type SentMail = Record<string, unknown>
    const sendMail = mock((_options: SentMail) => Promise.resolve({ messageId: '1' }))
    const service = new MailService()
    service.onModuleInit()
    ;(service as unknown as { transporter: { sendMail: unknown } }).transporter = { sendMail }

    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'guest' }),
    ).resolves.toBe(true)

    const sent: SentMail = sendMail.mock.calls[0][0]
    expect(sent.to).toBe('ana@example.com')
    expect(sent.subject).toBe('Estás en la lista — The Door PR')
    expect(sent.replyTo).toBe('The Door PR <hola@thedoorpr.com>')
    expect(String(sent.html)).toContain('Estás en la lista.')
    expect(String(sent.text)).toContain('THE DOOR PR')
    // La dirección de baja sale del From, sin el nombre visible.
    expect((sent.headers as Record<string, string>)['List-Unsubscribe']).toBe(
      '<mailto:hola@thedoorpr.com?subject=Baja>',
    )
  })
})
