import { describe, it, expect } from 'bun:test'
import { renderSignupConfirmation } from './signup-confirmation'

const base = { name: 'Ana Torres', siteUrl: 'https://thedoorpr.com' }

describe('renderSignupConfirmation', () => {
  it('saluda por el nombre de pila y confirma el alta al invitado', () => {
    const mail = renderSignupConfirmation({ ...base, kind: 'guest' })

    expect(mail.subject).toBe('Estás en la lista — The Door PR')
    expect(mail.html).toContain('Estás en la lista.')
    expect(mail.html).toContain('Ana, te hemos apuntado')
    // Nombre de pila, no el nombre completo.
    expect(mail.html).not.toContain('Ana Torres,')
  })

  it('nombra a la anfitriona cuando el alta viene de su enlace', () => {
    const mail = renderSignupConfirmation({
      ...base,
      kind: 'guest',
      reference: 'Sandra Valdez',
    })

    expect(mail.html).toContain('Te invita Sandra Valdez')
    expect(mail.text).toContain('Te invita Sandra Valdez')
  })

  it('le habla distinto a un local, y por el nombre de su sala', () => {
    const mail = renderSignupConfirmation({
      ...base,
      kind: 'venue',
      reference: 'Maison Noir',
    })

    expect(mail.subject).toBe('Hemos recibido tu solicitud — The Door PR')
    expect(mail.html).toContain('Maison Noir')
    expect(mail.html).toContain('Te hemos leído.')
    expect(mail.html).not.toContain('Estás en la lista')
  })

  it('cambia el titular cuando el correo ya estaba en la lista', () => {
    const mail = renderSignupConfirmation({ ...base, kind: 'guest', duplicate: true })

    expect(mail.html).toContain('Ya estabas dentro.')
    expect(mail.html).toContain('no hemos duplicado nada')
  })

  it('escapa el nombre: el formulario es público', () => {
    const mail = renderSignupConfirmation({
      ...base,
      name: '<script>alert(1)</script>',
      kind: 'guest',
    })

    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('escapa también el nombre del local', () => {
    const mail = renderSignupConfirmation({
      ...base,
      kind: 'venue',
      reference: 'Bar "<img src=x onerror=alert(1)>"',
    })

    expect(mail.html).not.toContain('<img src=x')
    expect(mail.html).toContain('&lt;img src=x')
  })

  it('apunta la imagen y el botón al sitio, sin barra doble', () => {
    const mail = renderSignupConfirmation({
      ...base,
      siteUrl: 'https://thedoorpr.com/',
      kind: 'guest',
    })

    expect(mail.html).toContain('src="https://thedoorpr.com/email/door.png"')
    expect(mail.html).toContain('href="https://thedoorpr.com"')
    expect(mail.html).not.toContain('thedoorpr.com//')
  })

  it('manda también una versión en texto, sin etiquetas', () => {
    const mail = renderSignupConfirmation({
      ...base,
      kind: 'venue',
      reference: 'Maison Noir',
    })

    expect(mail.text).toContain('Maison Noir')
    expect(mail.text).not.toContain('<')
    expect(mail.text).not.toContain('&amp;')
  })

  it('no depende de la imagen: el wordmark viaja como texto', () => {
    const mail = renderSignupConfirmation({ ...base, kind: 'guest' })

    // Con las imágenes bloqueadas —que es como se abre un correo la primera
    // vez— la marca tiene que seguir estando.
    expect(mail.html).toContain('THE&nbsp;')
    expect(mail.html).toContain('DOOR')
    expect(mail.html).toContain('alt=""')
  })
})
