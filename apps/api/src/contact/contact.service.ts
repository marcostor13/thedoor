import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateContactDto } from './dto/create-contact.dto'
import { Contact, ContactDocument } from './contact.schema'

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)

  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
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
