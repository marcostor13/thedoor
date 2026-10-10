import { describe, it, expect, afterEach, mock } from 'bun:test'
import { SignupFormClient, SignupFormError } from './signup-form.client'

const ENDPOINT = 'https://apimayabar.example.com/public/forms/abc/submit'

const campos = {
  nombre: 'Ana',
  email: 'ana@example.com',
  whatsapp: '+51 999 999 999',
  instagram: '@ana',
}

/** Suplanta el `fetch` global y devuelve el mock para inspeccionar la llamada. */
function withFetch(respuesta: Response | Promise<never>): {
  fetch: ReturnType<typeof mock>
  restore: () => void
} {
  const original = globalThis.fetch
  const fake = mock((_url: string, _init: RequestInit) =>
    respuesta instanceof Response ? Promise.resolve(respuesta) : respuesta,
  )
  globalThis.fetch = fake as unknown as typeof fetch
  return { fetch: fake, restore: () => (globalThis.fetch = original) }
}

function withEndpoint(value: string | undefined): () => void {
  const previo = process.env.SIGNUP_FORM_URL
  if (value === undefined) delete process.env.SIGNUP_FORM_URL
  else process.env.SIGNUP_FORM_URL = value
  return () => {
    if (previo === undefined) delete process.env.SIGNUP_FORM_URL
    else process.env.SIGNUP_FORM_URL = previo
  }
}

describe('SignupFormClient', () => {
  let restore = (): void => {}
  afterEach(() => restore())

  it('envía los campos y la página de origen al endpoint', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const red = withFetch(
      new Response(JSON.stringify({ ok: true, customerId: 'c1', created: true }), { status: 200 }),
    )
    restore = () => {
      red.restore()
      restoreEnv()
    }

    const resultado = await new SignupFormClient().submit(campos, 'https://thedoorpr.com/invitacion/')

    expect(resultado).toEqual({ created: true, customerId: 'c1' })

    const [url, init] = red.fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      data: campos,
      pageUrl: 'https://thedoorpr.com/invitacion/',
    })
  })

  it('un correo ya dado de alta vuelve como created:false, no como error', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const red = withFetch(new Response(JSON.stringify({ ok: true, created: false }), { status: 200 }))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    await expect(new SignupFormClient().submit(campos)).resolves.toMatchObject({ created: false })
  })

  it('`status` manda sobre `created`: `new` es alta, `registered` es reenvío', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const nueva = withFetch(
      new Response(JSON.stringify({ ok: true, status: 'new', created: false }), { status: 200 }),
    )
    await expect(new SignupFormClient().submit(campos)).resolves.toMatchObject({ created: true })
    nueva.restore()

    const repetida = withFetch(
      new Response(JSON.stringify({ ok: true, status: 'registered', created: true }), {
        status: 200,
      }),
    )
    restore = () => {
      repetida.restore()
      restoreEnv()
    }

    await expect(new SignupFormClient().submit(campos)).resolves.toMatchObject({ created: false })
  })

  it('sin SIGNUP_FORM_URL lanza en vez de dar el alta por buena', async () => {
    restore = withEndpoint(undefined)

    await expect(new SignupFormClient().submit(campos)).rejects.toBeInstanceOf(SignupFormError)
  })

  it('un error de red lanza: el alta no se ha guardado', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const red = withFetch(Promise.reject(new Error('ECONNREFUSED')))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    await expect(new SignupFormClient().submit(campos)).rejects.toBeInstanceOf(SignupFormError)
  })

  it('un 4xx lanza y arrastra el cuerpo, que dice qué se ha rechazado', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const red = withFetch(
      new Response(JSON.stringify({ message: 'whatsapp es obligatorio' }), { status: 400 }),
    )
    restore = () => {
      red.restore()
      restoreEnv()
    }

    await expect(new SignupFormClient().submit(campos)).rejects.toThrow('whatsapp es obligatorio')
  })

  it('un 200 con ok:false también lanza: es un rechazo disfrazado', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const red = withFetch(
      new Response(JSON.stringify({ ok: false, message: 'formulario cerrado' }), { status: 200 }),
    )
    restore = () => {
      red.restore()
      restoreEnv()
    }

    await expect(new SignupFormClient().submit(campos)).rejects.toThrow('formulario cerrado')
  })

  it('si falta `created`, cuenta como alta nueva', async () => {
    const restoreEnv = withEndpoint(ENDPOINT)
    const red = withFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    restore = () => {
      red.restore()
      restoreEnv()
    }

    await expect(new SignupFormClient().submit(campos)).resolves.toMatchObject({ created: true })
  })
})
