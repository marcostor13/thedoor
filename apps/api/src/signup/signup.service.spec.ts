import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { SignupService } from './signup.service'
import { Signup } from './signup.schema'

describe('SignupService', () => {
  const create = mock()
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

    const moduleRef = await Test.createTestingModule({
      providers: [SignupService, { provide: getModelToken(Signup.name), useValue: { create } }],
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

  it('descarta el registro cuando el honeypot llega relleno', async () => {
    const bot = { ...guest, company: 'relleno por un bot' }

    // Responde igual que en el caso correcto, para no revelar la detección…
    await expect(service.create(bot)).resolves.toEqual({
      registered: true,
      duplicate: false,
    })
    // …pero no llega a escribir nada.
    expect(create).not.toHaveBeenCalled()
  })
})
