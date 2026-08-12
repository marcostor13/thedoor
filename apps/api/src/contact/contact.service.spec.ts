import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ContactService } from './contact.service'
import { Contact } from './contact.schema'

describe('ContactService', () => {
  const create = jest.fn()
  let service: ContactService

  beforeEach(async () => {
    create.mockReset()

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: getModelToken(Contact.name), useValue: { create } },
      ],
    }).compile()

    service = moduleRef.get(ContactService)
  })

  it('persiste un envío válido', async () => {
    const dto = {
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Hola, me gustaría contactar con vosotros.',
    }

    await expect(service.create(dto)).resolves.toEqual({ received: true })
    expect(create).toHaveBeenCalledWith(dto)
  })

  it('descarta el envío cuando el honeypot llega relleno', async () => {
    const dto = {
      name: 'Bot',
      email: 'bot@example.com',
      message: 'Mensaje automatizado de prueba.',
      company: 'relleno por un bot',
    }

    // Responde igual que en el caso correcto, para no revelar la detección…
    await expect(service.create(dto)).resolves.toEqual({ received: true })
    // …pero no llega a escribir nada.
    expect(create).not.toHaveBeenCalled()
  })
})
