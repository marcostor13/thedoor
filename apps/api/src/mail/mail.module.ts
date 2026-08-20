import { Global, Module } from '@nestjs/common'
import { MailService } from './mail.service'

/**
 * Global: el correo lo va a querer más de un módulo (altas hoy, contacto y
 * administración después) y no aporta nada obligarles a importarlo uno a uno.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
