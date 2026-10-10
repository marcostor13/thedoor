import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateContactDto } from './dto/create-contact.dto'
import { Contact, ContactDocument } from './contact.schema'
import { MailService } from '../mail/mail.service'

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)

  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateContactDto): Promise<{ received: true }> {
    // Trampa para bots activada: se responde igual que en el caso correcto,
    // para no darle al bot ninguna señal de que ha sido detectado.
    if (dto.company) {
      this.logger.warn('Envío de contacto descartado: honeypot relleno')
      return { received: true }
    }

    await this.contactModel.create({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      // Los opcionales solo se guardan si vienen: un campo vacío en la ficha
      // se lee como «no lo dejó», y eso no es lo mismo que una cadena vacía.
      ...(dto.phone ? { phone: dto.phone } : {}),
      ...(dto.instagram ? { instagram: dto.instagram } : {}),
      ...(dto.kind ? { kind: dto.kind } : {}),
    })

    // Sin `await`: quien escribe no tiene por qué esperar a Resend. El `.catch`
    // está por lo mismo que en las altas — una promesa suelta que se rechaza
    // tumba el proceso, y el mensaje ya está guardado.
    void this.mailService
      .sendContactNotification({
        name: dto.name,
        email: dto.email,
        message: dto.message,
        phone: dto.phone || undefined,
        instagram: dto.instagram || undefined,
        kind: dto.kind,
      })
      .catch((error: unknown) => {
        this.logger.error(`Aviso de contacto no enviado (${dto.email}): ${String(error)}`)
      })

    return { received: true }
  }

  async findAll(limit = 50): Promise<Contact[]> {
    return this.contactModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean()
      .exec()
  }
}
