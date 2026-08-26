import { describe, it, expect } from 'bun:test'
import { renderSignupEmail } from './signup-email'

const base = { name: 'Sandra Valdez', siteUrl: 'https://thedoorpr.com' } as const

const duranteElEvento = new Date('2026-08-26T18:00:00-05:00')
const despuesDelEvento = new Date('2026-08-27T09:00:00-05:00')

describe('renderSignupEmail', () => {
  it('con noche en cartel, al invitado le manda el pase a esa noche', () => {
    const mail = renderSignupEmail({ ...base, kind: 'guest' }, duranteElEvento)

    expect(mail.subject).toContain('YOU ARE IN')
    expect(mail.html).toContain('Sandra Valdez')
    expect(mail.html).toContain('Hotel Nhow Lima')
  })

  it('pasada la noche, vuelve sola la confirmación genérica', () => {
    const mail = renderSignupEmail({ ...base, kind: 'guest' }, despuesDelEvento)

    expect(mail.subject).toBe('Estás en la lista — The Door PR')
    expect(mail.html).not.toContain('Hotel Nhow Lima')
  })

  it('el local recibe su respuesta, no una invitación, aunque haya noche', () => {
    const mail = renderSignupEmail(
      { ...base, kind: 'venue', reference: 'Sala Norte' },
      duranteElEvento,
    )

    expect(mail.subject).toBe('Hemos recibido tu solicitud — The Door PR')
    expect(mail.html).toContain('Sala Norte')
    expect(mail.html).not.toContain('YOU ARE IN')
  })
})
