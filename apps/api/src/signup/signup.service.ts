import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateSignupDto } from './dto/create-signup.dto'
import { Signup, SignupDocument } from './signup.schema'

export interface SignupResult {
  registered: true
  /** Ese correo ya estaba en la lista: no se ha creado nada nuevo. */
  duplicate: boolean
}

/** Código de error de MongoDB para violación de índice único. */
const DUPLICATE_KEY = 11000

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name)

  constructor(
    @InjectModel(Signup.name)
    private readonly signupModel: Model<SignupDocument>,
  ) {}

  async create(dto: CreateSignupDto): Promise<SignupResult> {
    // Trampa para bots activada: se responde como en el caso correcto, para no
    // darle al bot ninguna señal de que ha sido detectado.
    if (dto.company) {
      this.logger.warn('Registro descartado: honeypot relleno')
      return { registered: true, duplicate: false }
    }

    // Un local sin nombre no es una solicitud que se pueda trabajar.
    if (dto.kind === 'venue' && !dto.reference?.trim()) {
      throw new BadRequestException('Indica el nombre del local.')
    }

    try {
      await this.signupModel.create({
        kind: dto.kind,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        reference: dto.reference,
        city: dto.city,
      })
    } catch (error) {
      // Segundo envío del mismo correo: para quien lo manda no es un error,
      // es la confirmación de que ya estaba dentro.
      if (isDuplicateKeyError(error)) {
        return { registered: true, duplicate: true }
      }
      throw error
    }

    return { registered: true, duplicate: false }
  }

  async findAll(limit = 50): Promise<Signup[]> {
    return this.signupModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean()
      .exec()
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_KEY
}
