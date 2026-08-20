import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateSignupDto } from './dto/create-signup.dto'
import { Signup, SignupDocument } from './signup.schema'
import { MailService } from '../mail/mail.service'

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
    private readonly mailService: MailService,
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

    let duplicate = false

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
      if (!isDuplicateKeyError(error)) throw error
      duplicate = true
    }

    // Sin `await`: quien acaba de registrarse no tiene por qué esperar a que
    // un SMTP conteste para ver su confirmación en pantalla.
    //
    // El `.catch` no es decorativo aunque MailService prometa no lanzar: una
    // promesa suelta que se rechaza es un unhandled rejection, y eso tumba el
    // proceso entero. El alta ya está escrita; que se pierda el saludo es un
    // problema mucho menor que caerse por ello.
    void this.mailService
      .sendSignupConfirmation(dto.email, {
        name: dto.name,
        kind: dto.kind,
        reference: dto.reference,
        duplicate,
      })
      .catch((error: unknown) => {
        this.logger.error(`Confirmación no enviada a ${dto.email}: ${String(error)}`)
      })

    return { registered: true, duplicate }
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
