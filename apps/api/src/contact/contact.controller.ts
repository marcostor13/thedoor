import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ContactService } from './contact.service'
import { CreateContactDto } from './dto/create-contact.dto'

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * Endpoint público del formulario. Límite estrecho —5 envíos por IP cada
   * 10 minutos— porque escribe en base de datos sin autenticación.
   *
   * La lectura de mensajes no se expone aquí a propósito: irá en el módulo de
   * administración, detrás de JWT.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  async create(@Body() dto: CreateContactDto): Promise<{ received: true }> {
    return this.contactService.create(dto)
  }
}
