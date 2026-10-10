import { describe, it, expect } from 'bun:test'
import { renderJamparaList } from './jampara-list'
import { renderSignupEmail } from './signup-email'
import { JAMPARA_LIST, jamparaListOnBill, nightOnBill } from './event'

const base = { siteUrl: 'https://thedoorpr.com', event: JAMPARA_LIST }

const enCartel = new Date('2026-10-15T12:00:00-05:00')

describe('renderJamparaList', () => {
  it('saluda por el nombre de quien se registró', () => {
    const mail = renderJamparaList({ ...base, name: '  Sandra   Valdez ' })

    expect(mail.subject).toBe('Estás en Jampara List — Sábado 24 de octubre')
    expect(mail.html).toContain('Hola, <span')
    expect(mail.html).toContain('>Sandra Valdez<')
    expect(mail.text).toContain('HOLA SANDRA VALDEZ')
  })

  it('lleva el mensaje del registro', () => {
    const mail = renderJamparaList({ ...base, name: 'Sandra Valdez' })

    const mensaje =
      'Gracias por registrarte en Jampara List: una tarde para descubrir sabores, compartir, conversar y disfrutar de la cocina peruana a nuestra manera.'
    expect(mail.html).toContain(mensaje)
    expect(mail.text).toContain(mensaje)
  })

  it('lleva la invitación, colgada del sitio y sin barra duplicada', () => {
    const mail = renderJamparaList({ ...base, name: 'Ana', siteUrl: 'https://thedoorpr.com/' })

    expect(mail.html).toContain('src="https://thedoorpr.com/email/jampara-24-10.jpg"')
    // Con las imágenes bloqueadas, el alt es lo único que queda del flyer.
    expect(mail.html).toContain('alt="Jampara Vol. 01')
  })

  it('escribe la fecha y la hora en texto, no solo dentro del flyer', () => {
    const mail = renderJamparaList({ ...base, name: 'Ana' })

    for (const dato of ['Sábado 24 de octubre', '1:00 p.m.', 'Locación secreta']) {
      expect(mail.html).toContain(dato)
      expect(mail.text).toContain(dato)
    }
  })

  it('escapa un nombre con HTML', () => {
    const mail = renderJamparaList({ ...base, name: '<script>alert(1)</script>' })

    expect(mail.html).not.toContain('<script>alert')
    expect(mail.html).toContain('&lt;script&gt;')
  })
})

describe('Jampara List en cartel', () => {
  it('está en cartel hasta que acaba el 24 de octubre, hora de Lima', () => {
    expect(jamparaListOnBill(enCartel)).toBe(JAMPARA_LIST)
    expect(nightOnBill(enCartel)).toBe(JAMPARA_LIST)
    expect(jamparaListOnBill(new Date('2026-10-24T23:59:00-05:00'))).toBe(JAMPARA_LIST)
    expect(jamparaListOnBill(new Date('2026-10-25T00:00:00-05:00'))).toBeUndefined()
  })

  it('no tapa a las noches anteriores', () => {
    expect(jamparaListOnBill(new Date('2026-09-04T12:00:00-05:00'))).toBeUndefined()
  })

  it('quien se apunta a la lista recibe la invitación de Jampara', () => {
    const mail = renderSignupEmail(
      { name: 'Sandra Valdez', kind: 'guest', siteUrl: 'https://thedoorpr.com' },
      enCartel,
    )

    expect(mail.subject).toBe('Estás en Jampara List — Sábado 24 de octubre')
  })

  it('pasada la fecha, vuelve sola la confirmación genérica', () => {
    const mail = renderSignupEmail(
      { name: 'Sandra Valdez', kind: 'guest', siteUrl: 'https://thedoorpr.com' },
      new Date('2026-10-25T09:00:00-05:00'),
    )

    expect(mail.subject).toBe('Estás en la lista — The Door PR')
  })
})
