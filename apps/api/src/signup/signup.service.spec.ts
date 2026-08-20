import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { SignupService } from './signup.service'
import { Signup } from './signup.schema'
import { MailService } from '../mail/mail.service'

describe('SignupService', () => {
  const create = mock()
  const sendSignupConfirmation = mock(() => Promise.resolve(true))
  let service: SignupService

  const guest = {
    kind: 'guest' as const,
    name: 'Ana',
    email: 'ana@example.com',
    reference: '@ana',
    city: 'Lima',
  }

  beforeEach(async () => {
    create.mockReset()
    sendSignupConfirmation.mockReset()
    sendSignupConfirmation.mockImplementation(() => Promise.resolve(true))

    const moduleRef = await Test.createTestingModule({
      providers: [
        SignupService,
        { provide: getModelToken(Signup.name), useValue: { create } },
        { provide: MailService, useValue: { sendSignupConfirmation } },
      ],
    }).compile()

    service = moduleRef.get(SignupService)
  })

  it('registra una solicitud de invitado', async () => {
    await expect(service.create(guest)).resolves.toEqual({
      registered: true,
      duplicate: false,
    })

    expect(create).toHaveBeenCalledWith({
      kind: 'guest',
      name: 'Ana',
      email: 'ana@example.com',
      phone: undefined,
      reference: '@ana',
      city: 'Lima',
    })
  })

  it('exige el nombre del local cuando la solicitud es de un venue', async () => {
    const venue = { ...guest, kind: 'venue' as const, reference: '   ' }

    await expect(service.create(venue)).rejects.toBeInstanceOf(BadRequestException)
    expect(create).not.toHaveBeenCalled()
  })

  it('acepta un venue con nombre de local', async () => {
    const venue = { ...guest, kind: 'venue' as const, reference: 'Maison Noir' }

    await expect(service.create(venue)).resolves.toEqual({
      registered: true,
      duplicate: false,
    })
  })

  it('trata un correo repetido como confirmación, no como error', async () => {
    create.mockImplementation(() => {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    })

    await expect(service.create(guest)).resolves.toEqual({
      registered: true,
      duplicate: true,
    })
  })

  it('deja subir cualquier otro fallo de escritura', async () => {
    create.mockImplementation(() => {
      throw new Error('conexión perdida')
    })

    await expect(service.create(guest)).rejects.toThrow('conexión perdida')
  })

  it('confirma el alta por correo', async () => {
    await service.create(guest)

    expect(sendSignupConfirmation).toHaveBeenCalledWith('ana@example.com', {
      name: 'Ana',
      kind: 'guest',
      reference: '@ana',
      duplicate: false,
    })
  })

  it('marca la confirmación como duplicada cuando el correo ya estaba', async () => {
    create.mockImplementation(() => {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    })

    await service.create(guest)

    expect(sendSignupConfirmation).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({ duplicate: true }),
    )
  })

  it('no confirma nada cuando la escritura falla de verdad', async () => {
    create.mockImplementation(() => {
      throw new Error('conexión perdida')
    })

    await expect(service.create(guest)).rejects.toThrow('conexión perdida')
    expect(sendSignupConfirmation).not.toHaveBeenCalled()
  })

  it('registra el alta aunque el correo falle', async () => {
    // El servicio de correo no lanza, pero si algún día lo hiciera, un SMTP
    // caído no puede convertir un alta correcta en un error.
    sendSignupConfirmation.mockImplementation(() => Promise.reject(new Error('SMTP caído')))

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
    expect(create).not.toHaveBeenCalled()
    expect(sendSignupConfirmation).not.toHaveBeenCalled()
  })
})
