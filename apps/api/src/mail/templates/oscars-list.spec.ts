import { describe, it, expect } from 'bun:test'
import { renderOscarsList } from './oscars-list'
import { CURRENT_EVENT, OSCARS_LIST, nightOnBill, oscarsListOnBill } from './event'

const base = { siteUrl: 'https://thedoorpr.com', event: OSCARS_LIST }

describe('renderOscarsList', () => {
  it('saluda por el nombre de quien se registró', () => {
    const mail = renderOscarsList({ ...base, name: 'Sandra Valdez' })

    expect(mail.subject).toBe('Estás en Oscar’s List — Viernes 4 de septiembre')
    expect(mail.html).toContain('Hola <span')
    expect(mail.html).toContain('>Sandra Valdez<')
    expect(mail.text).toContain('HOLA SANDRA VALDEZ')
  })

  it('lleva el mensaje del registro', () => {
    const mail = renderOscarsList({ ...base, name: 'Sandra Valdez' })

    expect(mail.html).toContain('Gracias por registrarte en Oscar’s List')
    expect(mail.html).toContain('champagne &amp; bites')
    expect(mail.text).toContain('champagne & bites')
  })

  it('escribe la dirección y la hora en texto, no solo dentro del flyer', () => {
    const mail = renderOscarsList({ ...base, name: 'Sandra Valdez' })

    for (const dato of ['Av. Jorge Basadre 318, San Isidro', '7:00 p.m.', 'Viernes 4 de septiembre']) {
      expect(mail.html).toContain(dato)
      expect(mail.text).toContain(dato)
    }
    // Con las imágenes bloqueadas, el alt es lo único que queda del flyer.
    expect(mail.html).toContain('alt="Oscar’s List')
  })

  it('cuelga las imágenes del sitio, sin barra duplicada', () => {
    const mail = renderOscarsList({ ...base, name: 'Ana', siteUrl: 'https://thedoorpr.com/' })

    expect(mail.html).toContain('src="https://thedoorpr.com/email/door.png"')
    expect(mail.html).toContain('src="https://thedoorpr.com/email/oscars-list-04-09.jpg"')
    expect(mail.html).not.toContain('.com//')
  })

  it('escapa el nombre: viene de un formulario público', () => {
    const mail = renderOscarsList({ ...base, name: '<script>alert(1)</script>' })

    expect(mail.html).not.toContain('<script>alert(1)</script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('normaliza los espacios de más del nombre', () => {
    const mail = renderOscarsList({ ...base, name: '  Sandra   Valdez  ' })

    expect(mail.html).toContain('>Sandra Valdez<')
  })

  it('lleva alternativa en texto plano', () => {
    const mail = renderOscarsList({ ...base, name: 'Sandra Valdez' })

    expect(mail.text).toContain('OSCAR’S LIST')
    expect(mail.text).not.toContain('<')
  })
})

describe('oscarsListOnBill', () => {
  it('devuelve la noche mientras no haya pasado', () => {
    expect(oscarsListOnBill(new Date('2026-09-04T19:00:00-05:00'))).toBe(OSCARS_LIST)
  })

  it('no la devuelve antes de anunciarse: no puede tapar a la anterior', () => {
    expect(oscarsListOnBill(new Date('2026-08-26T18:00:00-05:00'))).toBeUndefined()
  })

  it('deja de devolverla de madrugada, para no invitar a una fiesta pasada', () => {
    expect(oscarsListOnBill(new Date('2026-09-05T09:00:00-05:00'))).toBeUndefined()
  })
})

describe('nightOnBill', () => {
  it('devuelve la noche que toque, sea de quien sea', () => {
    expect(nightOnBill(new Date('2026-09-04T19:00:00-05:00'))).toBe(OSCARS_LIST)
    expect(nightOnBill(new Date('2026-08-26T18:00:00-05:00'))).toBe(CURRENT_EVENT)
  })

  it('sin nada en cartel no devuelve nada: el lote saldría genérico', () => {
    expect(nightOnBill(new Date('2026-08-29T12:00:00-05:00'))).toBeUndefined()
    expect(nightOnBill(new Date('2026-09-05T09:00:00-05:00'))).toBeUndefined()
  })
})
