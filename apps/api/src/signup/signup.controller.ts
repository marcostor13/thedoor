import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { SignupService, SignupResult } from './signup.service'
import { CreateSignupDto } from './dto/create-signup.dto'

@Controller('signup')
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  /**
   * Alta pública desde la landing de registro. Límite estrecho —3 altas por IP
   * cada 10 minutos— porque escribe en base de datos sin autenticación.
   *
   * La lectura de solicitudes no se expone aquí a propósito: irá en el módulo
   * de administración, detrás de JWT.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 600_000, limit: 3 } })
  async create(@Body() dto: CreateSignupDto): Promise<SignupResult> {
    return this.signupService.create(dto)
  }
}
