import { describe, it, expect } from 'bun:test'
import { renderEventInvitation } from './event-invitation'
import { CURRENT_EVENT, eventOnBill } from './event'

const base = { siteUrl: 'https://thedoorpr.com', event: CURRENT_EVENT }

describe('renderEventInvitation', () => {
  it('pone el nombre del invitado y el titular de la invitación', () => {
    const mail = renderEventInvitation({ ...base, name: 'Sandra Valdez' })

    expect(mail.subject).toBe('YOU ARE IN — Poolbar by Handshake, Miércoles 26.08.26')
    expect(mail.html).toContain('You are in!')
    expect(mail.html).toContain('Sandra Valdez')
    expect(mail.text).toContain('SANDRA VALDEZ')
  })

  it('escribe la noche en texto y no solo dentro del flyer', () => {
    const mail = renderEventInvitation({ ...base, name: 'Sandra Valdez' })

    for (const dato of ['Miércoles 26.08.26', '8pm', 'Cocktail', 'Hotel Nhow Lima']) {
      expect(mail.html).toContain(dato)
      expect(mail.text).toContain(dato)
    }
    // Con las imágenes bloqueadas, el alt es lo único que queda del flyer.
    expect(mail.html).toContain('alt="Poolbar by Handshake')
  })

  it('cuelga las imágenes del sitio, sin barra duplicada', () => {
    const mail = renderEventInvitation({ ...base, name: 'Ana', siteUrl: 'https://thedoorpr.com/' })

    expect(mail.html).toContain('src="https://thedoorpr.com/email/door.png"')
    expect(mail.html).toContain('src="https://thedoorpr.com/email/poolbar-26-08.png"')
    expect(mail.html).not.toContain('.com//')
  })

  it('escapa el nombre: viene de un formulario público', () => {
    const mail = renderEventInvitation({ ...base, name: '<script>alert(1)</script>' })

    expect(mail.html).not.toContain('<script>alert(1)</script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('normaliza los espacios de más del nombre', () => {
    const mail = renderEventInvitation({ ...base, name: '  Sandra   Valdez  ' })

    expect(mail.html).toContain('>Sandra Valdez<')
  })

  it('lleva alternativa en texto plano', () => {
    const mail = renderEventInvitation({ ...base, name: 'Sandra Valdez' })

    expect(mail.text).toContain('YOU ARE IN!')
    expect(mail.text).not.toContain('<')
  })
})

describe('eventOnBill', () => {
  it('devuelve el evento mientras no haya pasado', () => {
    expect(eventOnBill(new Date('2026-08-26T18:00:00-05:00'))).toBe(CURRENT_EVENT)
  })

  it('deja de devolverlo de madrugada, para no invitar a una fiesta pasada', () => {
    expect(eventOnBill(new Date('2026-08-27T09:00:00-05:00'))).toBeUndefined()
  })
})
