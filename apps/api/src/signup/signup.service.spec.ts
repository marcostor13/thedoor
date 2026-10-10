import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { SignupService, normalizeInstagram } from './signup.service'
import { SignupFormClient, SignupFormError } from './signup-form.client'
import { MailService } from '../mail/mail.service'

describe('SignupService', () => {
  const submit = mock(() => Promise.resolve({ created: true }))
  const sendSignupConfirmation = mock(() => Promise.resolve(true))
  let service: SignupService

  const guest = {
    kind: 'guest' as const,
    name: 'Ana',
    email: 'ana@example.com',
    phone: '+51 999 999 999',
    reference: 'Daniela',
    city: 'Lima',
  }

  beforeEach(async () => {
    submit.mockReset()
    submit.mockImplementation(() => Promise.resolve({ created: true }))
    sendSignupConfirmation.mockReset()
    sendSignupConfirmation.mockImplementation(() => Promise.resolve(true))

    const moduleRef = await Test.createTestingModule({
      providers: [
        SignupService,
        { provide: SignupFormClient, useValue: { submit } },
        { provide: MailService, useValue: { sendSignupConfirmation } },
      ],
    }).compile()

    service = moduleRef.get(SignupService)
  })

  it('manda el alta al formulario con los nombres de campo de la plataforma', async () => {
    await expect(
      service.create({ ...guest, pageUrl: 'https://thedoorpr.com/invitacion/daniela/' }),
    ).resolves.toEqual({ registered: true, duplicate: false })

    expect(submit).toHaveBeenCalledWith(
      {
        nombre: 'Ana',
        email: 'ana@example.com',
        whatsapp: '+51 999 999 999',
        instagram: undefined,
      },
      'https://thedoorpr.com/invitacion/daniela/',
    )
  })

  it('exige el nombre del local cuando la solicitud es de un venue', async () => {
    const venue = { ...guest, kind: 'venue' as const, reference: '   ' }

    await expect(service.create(venue)).rejects.toBeInstanceOf(BadRequestException)
    expect(submit).not.toHaveBeenCalled()
  })

  it('acepta un venue con nombre de local, que viaja en su correo', async () => {
    const venue = { ...guest, kind: 'venue' as const, reference: 'Maison Noir' }

    await expect(service.create(venue)).resolves.toEqual({
      registered: true,
      duplicate: false,
    })
    // Al formulario no llega: no define ese campo. Sí a la confirmación.
    expect(submit).toHaveBeenCalledWith(
      expect.not.objectContaining({ reference: expect.anything() }),
      undefined,
    )
    expect(sendSignupConfirmation).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({ reference: 'Maison Noir' }),
    )
  })

  it('trata un correo repetido como confirmación, no como error', async () => {
    submit.mockImplementation(() => Promise.resolve({ created: false }))

    await expect(service.create(guest)).resolves.toEqual({
      registered: true,
      duplicate: true,
    })
  })

  it('deja subir un fallo del formulario: sin él, el alta no existe', async () => {
    submit.mockImplementation(() => Promise.reject(new SignupFormError('El formulario no responde')))

    await expect(service.create(guest)).rejects.toThrow('El formulario no responde')
  })

  it('manda el Instagram ya normalizado', async () => {
    await service.create({ ...guest, instagram: 'https://www.instagram.com/Ana.Torres/?igsh=abc' })

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ instagram: '@ana.torres' }),
      undefined,
    )
  })

  it('manda el WhatsApp en `whatsapp`, que la plataforma exige', async () => {
    await service.create(guest)

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ whatsapp: '+51 999 999 999' }),
      undefined,
    )
  })

  it('confirma el alta por correo', async () => {
    await service.create(guest)

    expect(sendSignupConfirmation).toHaveBeenCalledWith('ana@example.com', {
      name: 'Ana',
      kind: 'guest',
      reference: 'Daniela',
      duplicate: false,
    })
  })

  it('marca la confirmación como duplicada cuando el correo ya estaba', async () => {
    submit.mockImplementation(() => Promise.resolve({ created: false }))

    await service.create(guest)

    expect(sendSignupConfirmation).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({ duplicate: true }),
    )
  })

  it('no confirma nada cuando el alta no se ha llegado a guardar', async () => {
    submit.mockImplementation(() => Promise.reject(new SignupFormError('502')))

    await expect(service.create(guest)).rejects.toThrow('502')
    expect(sendSignupConfirmation).not.toHaveBeenCalled()
  })

  it('registra el alta aunque el correo falle', async () => {
    // El servicio de correo no lanza, pero si algún día lo hiciera, un Resend
    // caído no puede convertir un alta correcta en un error.
    sendSignupConfirmation.mockImplementation(() => Promise.reject(new Error('Resend caído')))

    await expect(service.create(guest)).resolves.toEqual({
      registered: true,
      duplicate: false,
    })
  })

  it('descarta el registro cuando el honeypot llega relleno', async () => {
    const bot = { ...guest, company: 'relleno por un bot' }

    // Responde igual que en el caso correcto, para no revelar la detección…
    await expect(service.create(bot)).resolves.toEqual({
      registered: true,
      duplicate: false,
    })
    // …pero no llega a escribir nada, ni a mandar correo a una dirección que
    // probablemente no es de nadie.
    expect(submit).not.toHaveBeenCalled()
    expect(sendSignupConfirmation).not.toHaveBeenCalled()
  })
})

describe('normalizeInstagram', () => {
  it('acepta las cinco formas en que la gente lo escribe', () => {
    // La misma cuenta, escrita como la escribe cada uno.
    for (const entrada of [
      '@ana.torres',
      'ana.torres',
      '  @Ana.Torres  ',
      'instagram.com/ana.torres',
      'https://www.instagram.com/ana.torres/',
    ]) {
      expect(normalizeInstagram(entrada)).toBe('@ana.torres')
    }
  })

  it('descarta lo que Instagram cuelga detrás al compartir', () => {
    expect(normalizeInstagram('https://instagram.com/ana.torres?igsh=MXY123')).toBe('@ana.torres')
    expect(normalizeInstagram('instagram.com/ana.torres#top')).toBe('@ana.torres')
  })

  it('no se queda con un vacío disfrazado', () => {
    expect(normalizeInstagram(undefined)).toBeUndefined()
    expect(normalizeInstagram('   ')).toBeUndefined()
    expect(normalizeInstagram('@')).toBeUndefined()
    expect(normalizeInstagram('https://instagram.com/')).toBeUndefined()
  })

  it('respeta lo que no es un handle en vez de inventarse uno', () => {
    // Es un campo opcional de un formulario público: perder el alta porque
    // alguien escribió raro su Instagram sería mucho peor que guardarlo tal
    // cual y que lo lea una persona.
    expect(normalizeInstagram('no tengo')).toBe('no tengo')
    expect(normalizeInstagram('@ana torres')).toBe('@ana torres')
  })

  it('deja el handle en minúsculas, que es como Instagram lo trata', () => {
    expect(normalizeInstagram('@ANA_Torres')).toBe('@ana_torres')
  })
})
