import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ContactService } from './contact.service'
import { Contact } from './contact.schema'
import { MailService } from '../mail/mail.service'

describe('ContactService', () => {
  const create = mock()
  const sendContactNotification = mock()
  let service: ContactService

  beforeEach(async () => {
    create.mockReset()
    sendContactNotification.mockReset()
    sendContactNotification.mockResolvedValue(true)

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: getModelToken(Contact.name), useValue: { create } },
        { provide: MailService, useValue: { sendContactNotification } },
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

  it('guarda los opcionales del formulario de la portada', async () => {
    const dto = {
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Queremos programar el local a partir de marzo.',
      phone: '+51 999 999 999',
      instagram: '@ana.torres',
      kind: 'venue' as const,
    }

    await expect(service.create(dto)).resolves.toEqual({ received: true })
    expect(create).toHaveBeenCalledWith(dto)
  })

  it('no escribe los opcionales que llegan vacíos', async () => {
    await service.create({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Quiero estar en la guest list.',
      phone: '',
      instagram: '',
    })

    // Un campo vacío en la ficha se leería como «lo dejó en blanco», que no es
    // lo mismo que no haberlo rellenado.
    expect(create).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Quiero estar en la guest list.',
    })
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
    expect(sendContactNotification).not.toHaveBeenCalled()
  })

  it('avisa al equipo por correo de un mensaje guardado', async () => {
    await service.create({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Queremos programar el local a partir de marzo.',
      phone: '+51 999 999 999',
      instagram: '',
      kind: 'venue',
    })

    expect(sendContactNotification).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Queremos programar el local a partir de marzo.',
      phone: '+51 999 999 999',
      instagram: undefined,
      kind: 'venue',
    })
  })

  it('no avisa de un mensaje que no se ha podido guardar', async () => {
    create.mockRejectedValue(new Error('Mongo caído'))

    await expect(
      service.create({ name: 'Ana', email: 'ana@example.com', message: 'Hola, ¿hay sitio?' }),
    ).rejects.toThrow('Mongo caído')
    expect(sendContactNotification).not.toHaveBeenCalled()
  })

  it('un fallo del aviso no convierte el envío en un error', async () => {
    sendContactNotification.mockRejectedValue(new Error('Resend caído'))

    await expect(
      service.create({ name: 'Ana', email: 'ana@example.com', message: 'Hola, ¿hay sitio?' }),
    ).resolves.toEqual({ received: true })
  })
})
