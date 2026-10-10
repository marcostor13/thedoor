import { describe, it, expect, afterEach, mock } from 'bun:test'
import { MailService } from './mail.service'

/**
 * MailService lee su configuración del entorno al construirse, así que cada
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

/** Suplanta el `fetch` global y devuelve el mock para inspeccionar la llamada. */
function withFetch(response: Response | Promise<never>): {
  fetch: ReturnType<typeof mock>
  restore: () => void
} {
  const original = globalThis.fetch
  const fake = mock((_url: string, _init: RequestInit) =>
    response instanceof Response ? Promise.resolve(response) : response,
  )
  globalThis.fetch = fake as unknown as typeof fetch
  return { fetch: fake, restore: () => (globalThis.fetch = original) }
}

const configurado = {
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'The Door PR <hola@thedoorpr.com>',
  MAIL_REPLY_TO: undefined,
  SITE_URL: 'https://thedoorpr.com',
}

describe('MailService', () => {
  let restore = (): void => {}

  afterEach(() => restore())

  it('queda apagado si no hay Resend configurado', () => {
    restore = withEnv({ RESEND_API_KEY: undefined, MAIL_FROM: undefined })

    const service = new MailService()
    service.onModuleInit()

    expect(service.enabled).toBe(false)
  })

  it('queda apagado si hay clave pero no remitente', () => {
    // Medio configurado es peor que nada: la petición saldría y Resend la
    // rechazaría por falta de `from`.
    restore = withEnv({ RESEND_API_KEY: 're_test_key', MAIL_FROM: undefined })

    const service = new MailService()
    service.onModuleInit()

    expect(service.enabled).toBe(false)
  })

  it('apagado, no envía nada y lo dice', async () => {
    restore = withEnv({ RESEND_API_KEY: undefined, MAIL_FROM: undefined })

    const service = new MailService()
    service.onModuleInit()

    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'guest' }),
    ).resolves.toBe(false)
  })

  it('se enciende con clave y remitente', () => {
    restore = withEnv(configurado)

    const service = new MailService()
    service.onModuleInit()

    expect(service.enabled).toBe(true)
  })

  it('Resend caído no lanza: devuelve false y sigue', async () => {
    const restoreEnv = withEnv(configurado)
    const red = withFetch(Promise.reject(new Error('ECONNREFUSED')))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const service = new MailService()

    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'venue' }),
    ).resolves.toBe(false)
  })

  it('un rechazo de Resend devuelve false, no lanza', async () => {
    const restoreEnv = withEnv(configurado)
    const red = withFetch(
      new Response(JSON.stringify({ message: 'Domain is not verified' }), { status: 403 }),
    )
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const service = new MailService()

    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'venue' }),
    ).resolves.toBe(false)
  })

  it('manda asunto, html, texto y cabecera de baja a la API de Resend', async () => {
    const restoreEnv = withEnv(configurado)
    const red = withFetch(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const service = new MailService()

    // Se prueba con un local a propósito: el correo del invitado depende de si
    // hay noche en cartel, y eso cambia con el calendario. Aquí lo que se mira
    // es el transporte —destinatario, reply-to, cabeceras—, que no cambia.
    await expect(
      service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'venue' }),
    ).resolves.toBe(true)

    const [url, init] = red.fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key')

    const sent = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(sent.to).toEqual(['ana@example.com'])
    expect(sent.from).toBe('The Door PR <hola@thedoorpr.com>')
    expect(sent.subject).toBe('Hemos recibido tu solicitud — The Door PR')
    // Sin MAIL_REPLY_TO, se responde al propio remitente.
    expect(sent.reply_to).toBe('The Door PR <hola@thedoorpr.com>')
    expect(String(sent.html)).toContain('Te hemos leído.')
    expect(String(sent.text)).toContain('THE DOOR PR')
    // La dirección de baja sale del From, sin el nombre visible.
    expect((sent.headers as Record<string, string>)['List-Unsubscribe']).toBe(
      '<mailto:hola@thedoorpr.com?subject=Baja>',
    )
  })

  it('avisa al equipo de un mensaje de contacto, con respuesta a quien escribió', async () => {
    const restoreEnv = withEnv({
      ...configurado,
      MAIL_NOTIFY_TO: 'equipo@example.com, otra@example.com',
    })
    const red = withFetch(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const service = new MailService()

    await expect(
      service.sendContactNotification({
        name: 'Ana <b>Torres</b>',
        email: 'ana@example.com',
        message: 'Queremos programar el local.\n<script>alert(1)</script>',
        kind: 'venue',
      }),
    ).resolves.toBe(true)

    const [, init] = red.fetch.mock.calls[0] as [string, RequestInit]
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(sent.to).toEqual(['equipo@example.com', 'otra@example.com'])
    expect(sent.from).toBe('The Door PR <hola@thedoorpr.com>')
    // Contestar al aviso es contestar a quien escribió.
    expect(sent.reply_to).toBe('ana@example.com')
    expect(sent.subject).toBe('Nuevo mensaje de Ana <b>Torres</b> (Local) — The Door PR')
    // Lo que viene del formulario entra escapado en el HTML.
    expect(String(sent.html)).not.toContain('<script>')
    expect(String(sent.html)).toContain('&lt;script&gt;')
    expect(String(sent.text)).toContain('Queremos programar el local.')
  })

  it('sin MAIL_NOTIFY_TO no hay a quién avisar: no sale nada', async () => {
    const restoreEnv = withEnv({ ...configurado, MAIL_NOTIFY_TO: undefined })
    const red = withFetch(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const service = new MailService()
    service.onModuleInit()

    await expect(
      service.sendContactNotification({
        name: 'Ana',
        email: 'ana@example.com',
        message: 'Hola, ¿hay sitio?',
      }),
    ).resolves.toBe(false)
    expect(red.fetch).not.toHaveBeenCalled()
  })

  it('respeta MAIL_REPLY_TO cuando está definido', async () => {
    const restoreEnv = withEnv({ ...configurado, MAIL_REPLY_TO: 'lista@thedoorpr.com' })
    const red = withFetch(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const service = new MailService()
    await service.sendSignupConfirmation('ana@example.com', { name: 'Ana', kind: 'venue' })

    const [, init] = red.fetch.mock.calls[0] as [string, RequestInit]
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(sent.reply_to).toBe('lista@thedoorpr.com')
    expect((sent.headers as Record<string, string>)['List-Unsubscribe']).toBe(
      '<mailto:lista@thedoorpr.com?subject=Baja>',
    )
  })
})
